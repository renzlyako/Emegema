// src/services/studentService.js

import { supabase } from "./supabase";

export async function getStudentProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getStudentCourses(userId) {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      course_id,
      status,
      courses (
        id, title, subject, description, schedule,
        cover_color, status, teacher_id,
        profiles!courses_teacher_id_fkey ( full_name )
      )
    `)
    .eq("student_id", userId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return (data || [])
    .filter((row) => row.courses && row.courses.status === "active")
    .map((row) => ({
      ...row.courses,
      teacherName: row.courses?.profiles?.full_name ?? "Unknown Teacher",
    }));
}

export async function getStudentAssignments(userId) {

  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", userId)
    .eq("status", "active");
  if (enrollErr) throw new Error(enrollErr.message);
  if (!enrollments || enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.course_id);


  const { data: assignments, error: assignErr } = await supabase
    .from("assignments")
    .select(`
      id, title, description, due_date, max_points,
      status, assignment_type, course_id,
      courses ( title )
    `)
    .in("course_id", courseIds)
    .eq("status", "active")
    .order("due_date", { ascending: true });
  if (assignErr) throw new Error(assignErr.message);
  if (!assignments || assignments.length === 0) return [];


  const assignmentIds = assignments.map((a) => a.id);
  const { data: submissions, error: subErr } = await supabase
    .from("submissions")
    .select("id, assignment_id, status, grade, feedback, file_url, notes, essay_answer, demo_url")
    .eq("student_id", userId)
    .in("assignment_id", assignmentIds);
  if (subErr) throw new Error(subErr.message);


  const submissionMap = {};
  (submissions || []).forEach((sub) => { submissionMap[sub.assignment_id] = sub; });

  return assignments.map((a) => ({
    id:              a.id,
    title:           a.title,
    description:     a.description,
    due_date:        a.due_date,
    maxPoints:       a.max_points,
    status:          a.status,
    assignment_type: a.assignment_type,
    courseId:        a.course_id,
    courseName:      a.courses?.title ?? "Unknown Course",
    submission:      submissionMap[a.id] ?? null,
  }));
}

export async function getStudentGrades(userId) {
  const { data, error } = await supabase
    .from("submissions")
    .select(`
      id, grade, feedback, status,
      assignments (
        id, title, due_date, max_points,
        courses ( title )
      )
    `)
    .eq("student_id", userId)
    .eq("status", "graded")
    .not("grade", "is", null)
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((sub) => ({
    submissionId:    sub.id,
    grade:           sub.grade,
    feedback:        sub.feedback,
    assignmentTitle: sub.assignments?.title ?? "Unknown Assignment",
    courseName:      sub.assignments?.courses?.title ?? "Unknown Course",
    maxPoints:       sub.assignments?.max_points ?? 100,
    dueDate:         sub.assignments?.due_date,
  }));
}

export async function markAnnouncementsRead(userId, announcementIds) {
  if (!announcementIds || announcementIds.length === 0) return;
  try {
    for (const id of announcementIds) {
      await supabase
        .from("notifications")
        .insert({
          user_id:    userId,
          title:      "read",
          message:    "read",
          type:       "announcement_read",
          related_id: id,
          is_read:    true,
        })
        .select(); 
    }
  } catch (_) {}
}

export async function getStudentAnnouncements(userId) {
  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", userId)
    .eq("status", "active");
  if (enrollErr) throw new Error(enrollErr.message);
  const courseIds = (enrollments || []).map((e) => e.course_id);

  let query = supabase
    .from("announcements")
    .select(`
      id, title, content, created_at, is_global, course_id,
      courses ( title ),
      profiles!announcements_author_id_fkey ( full_name )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (courseIds.length > 0) {
    query = query.or(`is_global.eq.true,course_id.in.(${courseIds.join(",")})`);
  } else {
    query = query.eq("is_global", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

const announcementIds = (data || []).map(a => a.id);
let readIds = new Set();
if (announcementIds.length > 0) {
  const { data: readData } = await supabase
    .from("notifications")
    .select("related_id")
    .eq("user_id", userId)
    .eq("type", "announcement_read")
    .in("related_id", announcementIds);
  (readData || []).forEach(r => readIds.add(r.related_id));
}

return (data || []).map((a) => ({
  id:         a.id,
  title:      a.title,
  content:    a.content,
  created_at: a.created_at,
  is_global:  a.is_global,
  is_read:    readIds.has(a.id),  
  authorName: a.profiles?.full_name ?? "EduSpace",
  courseName: a.courses?.title ?? null,
}));
}

export async function getStudentNotifications(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, type, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);
}
