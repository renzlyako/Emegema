// supabase/functions/create-student/index.ts
//
// Deploy with: supabase functions deploy create-student
//
// DEBUG VERSION — has console.log at every step so we can see
// exactly what's happening in the Supabase Dashboard → Edge Functions → Logs tab.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("=== create-student invoked ===");

  try {
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));

    const { email, password, fullName, courseId } = body;

    if (!email || !password || !fullName || !courseId) {
      console.log("VALIDATION FAILED: missing fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields (email, password, fullName, courseId)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasMinLength = password.length >= 10;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    if (!hasMinLength || !hasLower || !hasUpper || !hasDigit || !hasSymbol) {
      console.log("VALIDATION FAILED: password does not meet complexity requirements");
      return new Response(
        JSON.stringify({ error: "Password must be at least 10 characters and include lowercase, uppercase, a digit, and a symbol." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    console.log("Authorization header present:", !!authHeader);
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log("Env vars present:", { url: !!supabaseUrl, anon: !!anonKey, service: !!serviceKey });

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    console.log("Caller lookup:", { callerId: caller?.id, callerErr: callerErr?.message });

    if (callerErr || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    console.log("Caller profile:", { role: callerProfile?.role, profileErr: profileErr?.message });

    if (profileErr || callerProfile?.role !== "teacher") {
      return new Response(
        JSON.stringify({ error: "Only teachers can create student accounts." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: course, error: courseErr } = await adminClient
      .from("courses")
      .select("id, teacher_id")
      .eq("id", courseId)
      .single();
    console.log("Course lookup:", { course, courseErr: courseErr?.message });

    if (courseErr || !course || course.teacher_id !== caller.id) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to add students to this course." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount, error: recentErr } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("created_by", caller.id)
      .gte("created_at", oneMinuteAgo);
    console.log("Rate limit check:", { recentCount, recentErr: recentErr?.message });

    if (!recentErr && recentCount !== null && recentCount >= 20) {
      return new Response(
        JSON.stringify({ error: "Too many accounts created too quickly. Please wait a minute and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MAX_STUDENTS_PER_TEACHER = 2;

    const { count: teacherTotal, error: teacherTotalErr } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("created_by", caller.id)
      .eq("role", "student");
    console.log("Teacher student cap check:", { teacherTotal, teacherTotalErr: teacherTotalErr?.message });

    if (!teacherTotalErr && teacherTotal !== null && teacherTotal >= MAX_STUDENTS_PER_TEACHER) {
      return new Response(
        JSON.stringify({ error: `You've reached the maximum of ${MAX_STUDENTS_PER_TEACHER} students. Contact an admin if you need more.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating auth user for:", email);
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    console.log("Auth createUser result:", { userId: newUser?.user?.id, createErr: createErr?.message });

    if (createErr) {
      return new Response(
        JSON.stringify({ error: createErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentId = newUser.user.id;

    console.log("Inserting profile row for:", studentId);
    const { error: insertProfileErr } = await adminClient
      .from("profiles")
      .upsert({
        id: studentId,
        full_name: fullName,
        email,
        role: "student",
        status: "active",
        created_by: caller.id,
      }, { onConflict: "id" });
    console.log("Profile insert result:", { insertProfileErr: insertProfileErr?.message });

    if (insertProfileErr) {
      console.log("Rolling back auth user due to profile insert failure");
      await adminClient.auth.admin.deleteUser(studentId);
      return new Response(
        JSON.stringify({ error: insertProfileErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Enrolling student in course:", courseId);
    const { error: enrollErr } = await adminClient
      .from("enrollments")
      .insert({ student_id: studentId, course_id: courseId, status: "active" });
    console.log("Enrollment result:", { enrollErr: enrollErr?.message });

    if (enrollErr) {
      return new Response(
        JSON.stringify({ error: `Account created, but enrollment failed: ${enrollErr.message}` }),
        { status: 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== SUCCESS — returning student data ===");
    return new Response(
      JSON.stringify({
        success: true,
        student: { id: studentId, full_name: fullName, email },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.log("=== CAUGHT EXCEPTION ===", e?.message, e?.stack);
    return new Response(
      JSON.stringify({ error: e?.message ?? "Unexpected server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
