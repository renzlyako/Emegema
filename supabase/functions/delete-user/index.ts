import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== delete-user invoked ===");

    const authHeader = req.headers.get("Authorization");
    console.log("Authorization header present:", !!authHeader);
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    console.log("Request body:", JSON.stringify({ userId }));

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log("Env vars present:", { url: !!supabaseUrl, anon: !!anonKey, service: !!serviceKey });

    // Client using the CALLER's token — to verify who is making this request
    const callerClient = createClient(supabaseUrl!, anonKey!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerAuthErr } = await callerClient.auth.getUser();
    console.log("Caller auth check:", { callerId: caller?.id, callerAuthErr: callerAuthErr?.message });

    if (callerAuthErr || !caller) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client — service role, bypasses RLS, can call auth.admin.*
    const adminClient = createClient(supabaseUrl!, serviceKey!);

    // Verify the caller is actually an admin
    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", caller.id)
      .single();
    console.log("Caller profile:", { role: callerProfile?.role, profileErr: profileErr?.message });

    if (profileErr || callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can delete users" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RATE LIMIT: max 10 user deletions per minute per admin ──
    // Protects against a compromised admin account being used to
    // mass-delete accounts before the breach is noticed.
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentDeleteCount, error: rateLimitErr } = await adminClient
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("actor_id", caller.id)
      .eq("action", "user_deleted")
      .gte("created_at", oneMinuteAgo);

    console.log("Rate limit check:", { recentDeleteCount, rateLimitErr: rateLimitErr?.message });

    if (!rateLimitErr && recentDeleteCount !== null && recentDeleteCount >= 10) {
      return new Response(JSON.stringify({ error: "Too many deletions in a short time. Please wait a minute before deleting more users." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetRoleCheck } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (targetRoleCheck?.role === "admin") {
      const { count: adminCount, error: adminCountErr } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (!adminCountErr && adminCount !== null && adminCount <= 1) {
        return new Response(JSON.stringify({ error: "Cannot delete the last remaining admin account." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Capture the target user's info BEFORE deletion, since it won't exist afterward.
    // Failure here is non-fatal — we still proceed with deletion, just with a blank name.
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", userId)
      .maybeSingle();
    console.log("Target profile (pre-deletion snapshot):", targetProfile);

    // Step 1: run the existing cleanup function (profiles, courses, submissions, etc.)
    const { error: rpcErr } = await adminClient.rpc("delete_user_completely", { user_id: userId });
    console.log("delete_user_completely result:", { rpcErr: rpcErr?.message });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: `Data cleanup failed: ${rpcErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: actually delete the auth.users record — this is the step that was missing
    const { error: authDeleteErr } = await adminClient.auth.admin.deleteUser(userId);
    console.log("auth.admin.deleteUser result:", { authDeleteErr: authDeleteErr?.message });

    // "User not found" means the auth account is already gone — that's the goal state,
    // so treat it as success rather than failing the whole operation.
    const isAlreadyGone = authDeleteErr?.message?.toLowerCase().includes("not found");

    if (authDeleteErr && !isAlreadyGone) {
      return new Response(JSON.stringify({ error: `Auth account deletion failed: ${authDeleteErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log this deletion to the audit trail. Non-fatal if it fails — the deletion
    // itself already succeeded, so we don't want a logging hiccup to surface as
    // an error to the admin.
    const { error: auditErr } = await adminClient.from("audit_log").insert({
      actor_id:    caller.id,
      actor_name:  callerProfile?.full_name ?? caller.email ?? "Unknown admin",
      action:      "user_deleted",
      target_type: "user",
      target_id:   userId,
      target_name: targetProfile?.full_name ?? targetProfile?.email ?? "Unknown user",
      details:     { role: targetProfile?.role ?? null, email: targetProfile?.email ?? null },
    });
    console.log("Audit log insert result:", { auditErr: auditErr?.message });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log("Unexpected error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});