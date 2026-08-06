// src/services/adminService.js

import { supabase } from "./supabase";

export async function getAdminProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminOverviewStats() {
  // Total users
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  // Active courses
  const { count: activeCourses } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  // Submissions today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: submissionsToday } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .gte("submitted_at", todayStart.toISOString());

  // Pending users (status = 'pending')
  const { count: pendingUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return {
    totalUsers:       totalUsers      ?? 0,
    activeCourses:    activeCourses   ?? 0,
    submissionsToday: submissionsToday ?? 0,
    pendingUsers:     pendingUsers    ?? 0,
  };
}

export async function getAdminUsers() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, created_at, last_active_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!profiles || profiles.length === 0) return [];

  // Get enrollment counts for students
  const studentIds = profiles.filter(p => p.role === "student").map(p => p.id);
  const teacherIds = profiles.filter(p => p.role === "teacher").map(p => p.id);

  let enrollmentCounts = {};
  let teacherCourseCounts = {};

  if (studentIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .in("student_id", studentIds)
      .eq("status", "active");

    (enrollments || []).forEach(e => {
      enrollmentCounts[e.student_id] = (enrollmentCounts[e.student_id] || 0) + 1;
    });
  }

  if (teacherIds.length > 0) {
    const { data: courses } = await supabase
      .from("courses")
      .select("teacher_id")
      .in("teacher_id", teacherIds)
      .eq("status", "active");

    (courses || []).forEach(c => {
      teacherCourseCounts[c.teacher_id] = (teacherCourseCounts[c.teacher_id] || 0) + 1;
    });
  }

  return profiles.map(p => ({
    id:              p.id,
    full_name:       p.full_name ?? "Unknown",
    email:           p.email ?? "",
    role:            p.role ?? "student",
    status:          p.status ?? "active",
    created_at:      p.created_at,
    last_active_at:  p.last_active_at,
    initials:    (p.full_name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase(),
    courseCount: p.role === "student"
      ? (enrollmentCounts[p.id] ?? 0)
      : (teacherCourseCounts[p.id] ?? 0),
  }));
}

// ─────────────────────────────────────────────
// UPDATE USER STATUS
// ─────────────────────────────────────────────
export async function updateUserStatus(userId, status, targetName = null, previousStatus = null) {
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  const { data: { user: actor } } = await supabase.auth.getUser();
  if (actor) {
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", actor.id)
      .single();

    await supabase.from("audit_log").insert({
      actor_id:    actor.id,
      actor_name:  actorProfile?.full_name ?? actor.email ?? "Unknown admin",
      action:      "user_status_changed",
      target_type: "user",
      target_id:   userId,
      target_name: targetName ?? "Unknown user",
      details:     { from: previousStatus, to: status },
    });
  }
}

// ─────────────────────────────────────────────
// DELETE USER
// ─────────────────────────────────────────────
export async function deleteUser(userId) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: { userId },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {

    let message = error.message || "Failed to delete user.";
    try {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    } catch {
      
    }
    throw new Error(message);
  }

  if (data?.error) throw new Error(data.error);
}

// ─────────────────────────────────────────────
// CREATE USER (Admin Add User)
// ─────────────────────────────────────────────
export async function adminCreateUser({ fullName, email, password, role }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in.");
 
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { fullName, email, password, role },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
 
  if (error) {

    let message = error.message || "Failed to create user.";
    try {
      if (error.context) {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      }
    } catch (_) {

    }
    throw new Error(message);
  }
 
  if (data?.error) throw new Error(data.error);
  return data.user;
}

export async function getAdminCourses() {
  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      id, title, subject, schedule, cover_color, status, created_at,
      profiles!courses_teacher_id_fkey ( full_name )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!courses || courses.length === 0) return [];

  const courseIds = courses.map(c => c.id);

  // Enrollment counts
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds)
    .eq("status", "active");

  const enrollCount = {};
  (enrollments || []).forEach(e => {
    enrollCount[e.course_id] = (enrollCount[e.course_id] || 0) + 1;
  });

  return courses.map(c => ({
    id:           c.id,
    title:        c.title,
    subject:      c.subject ?? "—",
    schedule:     c.schedule ?? "—",
    cover_color:  c.cover_color ?? "#243E36",
    status:       c.status,
    created_at:   c.created_at,
    teacherName:  c.profiles?.full_name ?? "Unknown Teacher",
    studentCount: enrollCount[c.id] ?? 0,
  }));
}

// ─────────────────────────────────────────────
// UPDATE COURSE STATUS
// ─────────────────────────────────────────────
export async function updateCourseStatus(courseId, status) {
  const { error } = await supabase
    .from("courses")
    .update({ status })
    .eq("id", courseId);

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// DELETE COURSE
// ─────────────────────────────────────────────
export async function deleteCourse(courseId) {
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// GET REPORT STATS
// ─────────────────────────────────────────────
export async function getAdminReportStats() {
  // User counts by role
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, status");

  const students  = (profiles || []).filter(p => p.role === "student").length;
  const teachers  = (profiles || []).filter(p => p.role === "teacher").length;
  const admins    = (profiles || []).filter(p => p.role === "admin").length;
  const total     = (profiles || []).length;

  // Total courses
  const { count: totalCourses } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true });

  // All graded submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("grade, status, submitted_at, assignments ( max_points )");

  const totalSubmissions = (submissions || []).length;

  const graded = (submissions || []).filter(s => s.status === "graded" && s.grade != null);
  const avgGrade = graded.length > 0
    ? Math.round(graded.reduce((sum, s) => {
        const mp = s.assignments?.max_points || 100;
        return sum + (s.grade / mp) * 100;
      }, 0) / graded.length)
    : null;

  // Active today (profiles with recent submissions)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const activeToday = (submissions || []).filter(s =>
    new Date(s.submitted_at) >= todayStart
  ).length;

  // Grade breakdown
  const gradePcts = graded.map(s => {
    const mp = s.assignments?.max_points || 100;
    return (s.grade / mp) * 100;
  });

  const g90  = gradePcts.filter(p => p >= 90).length;
  const g80  = gradePcts.filter(p => p >= 80 && p < 90).length;
  const g75  = gradePcts.filter(p => p >= 75 && p < 80).length;
  const gLow = gradePcts.filter(p => p < 75).length;
  const gTotal = gradePcts.length || 1;

  return {
    totalStudents:     students,
    totalTeachers:     teachers,
    totalCourses:      totalCourses ?? 0,
    avgGrade:          avgGrade !== null ? `${avgGrade}%` : "—",
    totalSubmissions,
    activeToday,
    roleBreakdown: [
      { label: "Students", count: students, pct: Math.round((students / (total || 1)) * 100), color: "#243E36" },
      { label: "Teachers", count: teachers, pct: Math.round((teachers / (total || 1)) * 100), color: "#7CA982" },
      { label: "Admins",   count: admins,   pct: Math.round((admins   / (total || 1)) * 100), color: "#4a7c59" },
    ],
    gradeBreakdown: [
      { label: "90–100 (Excellent)", count: g90,  pct: Math.round((g90  / gTotal) * 100), color: "#7CA982" },
      { label: "80–89 (Good)",       count: g80,  pct: Math.round((g80  / gTotal) * 100), color: "#243E36" },
      { label: "75–79 (Passing)",    count: g75,  pct: Math.round((g75  / gTotal) * 100), color: "#e0a052" },
      { label: "Below 75",           count: gLow, pct: Math.round((gLow / gTotal) * 100), color: "#e05252" },
    ],
  };
}

// ─────────────────────────────────────────────
// GET RECENT ACTIVITY
// ─────────────────────────────────────────────
export async function getAdminRecentActivity() {
  const events = [];

  // Recent profile creations (new registrations)
  const { data: newProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  (newProfiles || []).forEach(p => {
    events.push({
      id:    `profile-${p.id}`,
      text:  `${p.full_name} registered as ${p.role}`,
      time:  p.created_at,
      color: "#7CA982",
      type:  "user",
    });
  });

  // Recent submissions
  const { data: recentSubs } = await supabase
    .from("submissions")
    .select(`
      id, submitted_at,
      profiles!submissions_student_id_fkey ( full_name ),
      assignments ( title )
    `)
    .order("submitted_at", { ascending: false })
    .limit(5);

  (recentSubs || []).forEach(s => {
    events.push({
      id:    `sub-${s.id}`,
      text:  `${s.profiles?.full_name ?? "A student"} submitted ${s.assignments?.title ?? "an assignment"}`,
      time:  s.submitted_at,
      color: "#4a7c59",
      type:  "submission",
    });
  });

  // Recent courses created
  const { data: recentCourses } = await supabase
    .from("courses")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  (recentCourses || []).forEach(c => {
    events.push({
      id:    `course-${c.id}`,
      text:  `New course created: ${c.title}`,
      time:  c.created_at,
      color: "#7CA982",
      type:  "course",
    });
  });

  // Recent announcements
  const { data: recentAnnouncements } = await supabase
    .from("announcements")
    .select(`id, title, created_at, profiles!announcements_author_id_fkey ( full_name )`)
    .order("created_at", { ascending: false })
    .limit(3);

  (recentAnnouncements || []).forEach(a => {
    events.push({
      id:    `announce-${a.id}`,
      text:  `Announcement "${a.title}" posted by ${a.profiles?.full_name ?? "someone"}`,
      time:  a.created_at,
      color: "#e0a052",
      type:  "announce",
    });
  });

  return events
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 12)
    .map(e => ({ ...e, timeAgo: timeAgo(e.time) }));
}

// ─────────────────────────────────────────────
// GET AUDIT LOG (admin-only, full history)
// ─────────────────────────────────────────────
export async function getAuditLog(limit = 100) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).map(entry => ({
    id:          entry.id,
    actorName:   entry.actor_name,
    action:      entry.action,
    targetType:  entry.target_type,
    targetName:  entry.target_name,
    details:     entry.details,
    createdAt:   entry.created_at,
    timeAgo:     timeAgo(entry.created_at),
  }));
}

// ─────────────────────────────────────────────
// ADMIN: GET TEACHER'S STUDENT BREAKDOWN
// ─────────────────────────────────────────────
export async function getTeacherStudentBreakdown(teacherId) {
  // Get this teacher's courses
  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select("id, title")
    .eq("teacher_id", teacherId)
    .order("title", { ascending: true });

  if (courseErr) throw new Error(courseErr.message);
  const courseIds = (courses || []).map(c => c.id);

  let courseList = (courses || []).map(c => ({ id: c.id, title: c.title, created: [], joined: [] }));

  if (courseIds.length > 0) {
    const { data: enrollments, error: enrollErr } = await supabase
      .from("enrollments")
      .select(`
        student_id, enrolled_at, course_id,
        profiles!enrollments_student_id_fkey ( id, full_name, email, status, created_by )
      `)
      .in("course_id", courseIds)
      .eq("status", "active");

    if (enrollErr) throw new Error(enrollErr.message);

    const courseMap = {};
    courseList.forEach(c => { courseMap[c.id] = c; });

    (enrollments || []).forEach(e => {
      const profile = e.profiles;
      if (!profile) return;
      const course = courseMap[e.course_id];
      if (!course) return;

      const entry = {
        id:          profile.id,
        full_name:   profile.full_name,
        email:       profile.email,
        status:      profile.status,
        enrolled_at: e.enrolled_at,
      };

      if (profile.created_by === teacherId) {
        course.created.push(entry);
      } else {
        course.joined.push(entry);
      }
    });
  }

  return { courses: courseList };
}

// ─────────────────────────────────────────────
// HELPER: time ago
// ─────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
