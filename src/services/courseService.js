// src/services/courseService.js
// ─────────────────────────────────────────────
// DROP THIS FILE INTO: src/services/courseService.js
// ─────────────────────────────────────────────

import { supabase } from "./supabase";

// ─────────────────────────────────────────────
// HELPER: Generate a random join code
// Format: ABC-1234  (3 letters + 4 digits)
// ─────────────────────────────────────────────
function generateJoinCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O to avoid confusion
  const digits  = "0123456789";
  const L = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const D = Array.from({ length: 4 }, () => digits[Math.floor(Math.random()  * digits.length)]).join("");
  return `${L}-${D}`;
}

// ─────────────────────────────────────────────
// STUDENT: GET ENROLLED COURSES
// ─────────────────────────────────────────────
export async function getStudentCourses(userId) {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      status,
      courses (
        id, title, subject, description,
        schedule, cover_color, status, join_code,
        teacher_id,
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
      teacherName: row.courses.profiles?.full_name ?? "Unknown Teacher",
    }));
}


const DEFAULT_ATTENDANCE_LEGEND = [
  { id: "P", label: "Present", value: 1,   color: "#4a7c59" },
  { id: "L", label: "Late",    value: 0.5, color: "#e0a052" },
  { id: "A", label: "Absent",  value: 0,   color: "#e05252" },
];

export async function getStudentAttendance(courseId, studentId) {
  try {
    // Get course terms (from courses.terms) + legend (from attendance_config.legend)
    const { data: courseData } = await supabase
      .from("courses")
      .select("terms, attendance_config")
      .eq("id", courseId)
      .single();

    const terms  = courseData?.terms || [];
    const legend = courseData?.attendance_config?.legend?.length > 0
      ? courseData.attendance_config.legend
      : DEFAULT_ATTENDANCE_LEGEND;

    if (!terms.length) {
      return { configured: false, terms: [], legend: [] };
    }

    const config = { terms, legend };

    // Get all attendance records for this course
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("term_id, sessions, attendance_data, session_count, start_date, end_date")
      .eq("course_id", courseId);

    if (error) throw new Error(error.message);

    // Build per-term data for this student
    const termData = config.terms.map(term => {
      const record = (records || []).find(r => r.term_id === term.id);

      if (!record) {
        return {
          id:      term.id,
          label:   term.label,
          configured: false,
          sessions: [],
          grade:   null,
          present: 0,
          total:   0,
        };
      }

      const sessions      = record.sessions      || [];
      const attendanceData = record.attendance_data || {};
      const sessionCount  = record.session_count  || sessions.length;
      const legend        = config.legend || [];
      const maxVal        = Math.max(...legend.map(l => l.value), 1);

      // Build session records for this student
      const studentSessions = sessions.map(sess => {
        const markId = attendanceData[studentId]?.[sess.id];
        const entry  = legend.find(l => l.id === markId);
        return {
          sessionId: sess.id,
          date:      sess.date || null,
          markId:    markId || null,
          label:     entry?.label || null,
          value:     entry?.value ?? null,
          color:     entry?.color || "#c8ddc9",
        };
      });

      // Calculate grade
      let totalPoints = 0;
      studentSessions.forEach(sess => {
        if (sess.value !== null) {
          totalPoints += sess.value / maxVal;
        }
      });

      const markedCount = studentSessions.filter(s => s.markId !== null).length;
      const grade = sessionCount > 0
        ? Math.round((totalPoints / sessionCount) * 100)
        : null;

      return {
        id:         term.id,
        label:      term.label,
        configured: true,
        sessions:   studentSessions,
        grade,
        marked:     markedCount,
        total:      sessionCount,
        startDate:  record.start_date,
        endDate:    record.end_date,
      };
    });

    return {
      configured: true,
      terms:      termData,
      legend:     config.legend || [],
    };
  } catch (e) {
    console.error("getStudentAttendance error:", e);
    return { configured: false, terms: [], legend: [] };
  }
}

// ─────────────────────────────────────────────
// STUDENT: JOIN COURSE BY CODE
// ─────────────────────────────────────────────
export async function joinCourseByCode(studentId, joinCode) {
  const code = joinCode.trim().toUpperCase();

  const { data, error } = await supabase
    .rpc("join_course_by_code", { code });

  if (error) {
    return { success: false, message: error.message || "Something went wrong. Please try again." };
  }

  return data;
}

// ─────────────────────────────────────────────
// TEACHER: GET OWN COURSES
// ─────────────────────────────────────────────
export async function getTeacherCourses(userId) {
  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select("id, title, subject, description, schedule, cover_color, status, join_code, created_at")
    .eq("teacher_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (courseErr) throw new Error(courseErr.message);
  if (!courses || courses.length === 0) return [];

  const courseIds = courses.map((c) => c.id);

  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds)
    .eq("status", "active");

  if (enrollErr) throw new Error(enrollErr.message);

  const enrollmentCount = {};
  (enrollments || []).forEach((e) => {
    enrollmentCount[e.course_id] = (enrollmentCount[e.course_id] || 0) + 1;
  });

  const { data: assignments, error: assignErr } = await supabase
    .from("assignments")
    .select("id, course_id")
    .in("course_id", courseIds)
    .eq("status", "active");

  if (assignErr) throw new Error(assignErr.message);

  const assignmentIds = (assignments || []).map((a) => a.id);
  let submissions = [];

  if (assignmentIds.length > 0) {
    const { data: subs, error: subErr } = await supabase
      .from("submissions")
      .select("id, assignment_id, status")
      .in("assignment_id", assignmentIds)
      .eq("status", "submitted");

    if (subErr) throw new Error(subErr.message);
    submissions = subs || [];
  }

  const assignmentMap = {};
  (assignments || []).forEach((a) => {
    assignmentMap[a.id] = a.course_id;
  });

  const pendingCount = {};
  submissions.forEach((sub) => {
    const cId = assignmentMap[sub.assignment_id];
    if (!cId) return;
    pendingCount[cId] = (pendingCount[cId] || 0) + 1;
  });

  // ── Assessments pending grading (mirrors assignments logic above) ──
  const { data: assessments, error: assessErr } = await supabase
    .from("assessments")
    .select("id, course_id")
    .in("course_id", courseIds);

  if (assessErr) throw new Error(assessErr.message);

  const assessmentIds = (assessments || []).map((a) => a.id);
  let assessmentSubs = [];

  if (assessmentIds.length > 0) {
    const { data: aSubs, error: aSubErr } = await supabase
      .from("assessment_submissions")
      .select("id, assessment_id, status")
      .in("assessment_id", assessmentIds)
      .neq("status", "graded");

    if (aSubErr) throw new Error(aSubErr.message);
    assessmentSubs = aSubs || [];
  }

  const assessmentMap = {};
  (assessments || []).forEach((a) => {
    assessmentMap[a.id] = a.course_id;
  });

  assessmentSubs.forEach((sub) => {
    const cId = assessmentMap[sub.assessment_id];
    if (!cId) return;
    pendingCount[cId] = (pendingCount[cId] || 0) + 1;
  });

  return courses.map((c) => ({
    ...c,
    students:           enrollmentCount[c.id] ?? 0,
    pendingSubmissions: pendingCount[c.id]     ?? 0,
  }));
}

// ─────────────────────────────────────────────
// TEACHER: CREATE COURSE (auto-generates join code)
// ─────────────────────────────────────────────
export async function createCourse({ teacherId, title, subject, description, schedule, coverColor = "#243E36" }) {
  let joinCode = generateJoinCode();
  let attempts = 0;

  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("courses")
      .select("id")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      teacher_id:  teacherId,
      title,
      subject,
      description,
      schedule,
      cover_color: coverColor,
      join_code:   joinCode,
      status:      "active",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// TEACHER: UPDATE COURSE
// ─────────────────────────────────────────────
export async function updateCourse(courseId, updates) {
  const { data, error } = await supabase
    .from("courses")
    .update(updates)
    .eq("id", courseId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// TEACHER: DELETE COURSE
// ─────────────────────────────────────────────
export async function deleteCourse(courseId) {
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// TEACHER: ARCHIVE COURSE
// ─────────────────────────────────────────────
const MAX_ARCHIVED_COURSES = 5;

export async function archiveCourse(courseId) {
  const { data: courseData, error: fetchErr } = await supabase
    .from("courses")
    .select("teacher_id")
    .eq("id", courseId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  const { count, error: countErr } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", courseData.teacher_id)
    .eq("status", "archived");

  if (!countErr && count !== null && count >= MAX_ARCHIVED_COURSES) {
    throw new Error(`You have reached the maximum of ${MAX_ARCHIVED_COURSES} archived courses. Please delete or restore an archived course first.`);
  }

  return updateCourse(courseId, { status: "archived" });
}

export async function getArchivedCourses(userId) {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, subject, description, schedule, cover_color, status, join_code, created_at")
    .eq("teacher_id", userId)
    .eq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function unarchiveCourse(courseId) {
  return updateCourse(courseId, { status: "active" });
}


// ─────────────────────────────────────────────
// TEACHER: MANUALLY ENROLL A STUDENT
// ─────────────────────────────────────────────
const MAX_STUDENTS_PER_COURSE = 50;
const MAX_SELF_JOINED_PER_TEACHER = 50;
const MAX_ACTIVE_COURSES_PER_STUDENT = 15;

export async function enrollStudent(studentId, courseId) {
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "active") {
      throw new Error("Student is already enrolled in this course.");
    }
  }

  const { count: enrolledCount, error: countErr } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("status", "active");

  if (countErr) throw new Error(countErr.message);

  if (enrolledCount !== null && enrolledCount >= MAX_STUDENTS_PER_COURSE) {
    throw new Error(`This course has reached the maximum of ${MAX_STUDENTS_PER_COURSE} students.`);
  }

  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("created_by")
    .eq("id", studentId)
    .single();

  const { data: courseRow } = await supabase
    .from("courses")
    .select("teacher_id")
    .eq("id", courseId)
    .single();

  const teacherId = courseRow?.teacher_id;
  const isSelfJoinedStudent = studentProfile?.created_by !== teacherId;

  if (isSelfJoinedStudent && teacherId) {
    const { data: teacherCourses } = await supabase
      .from("courses")
      .select("id")
      .eq("teacher_id", teacherId);

    const teacherCourseIds = (teacherCourses || []).map((c) => c.id);

    if (teacherCourseIds.length > 0) {
      const { data: allEnrollments } = await supabase
        .from("enrollments")
        .select("student_id, profiles!enrollments_student_id_fkey ( created_by )")
        .in("course_id", teacherCourseIds)
        .eq("status", "active");

      const selfJoinedCount = (allEnrollments || []).filter(
        (e) => e.profiles?.created_by !== teacherId
      ).length;

      if (selfJoinedCount >= MAX_SELF_JOINED_PER_TEACHER) {
        throw new Error(`This teacher has reached the maximum of ${MAX_SELF_JOINED_PER_TEACHER} self-joined students across all their courses.`);
      }
    }
  }


  const { count: studentCourseCount, error: studentCourseErr } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "active");

  if (studentCourseErr) throw new Error(studentCourseErr.message);

  if (studentCourseCount !== null && studentCourseCount >= MAX_ACTIVE_COURSES_PER_STUDENT) {
    throw new Error(`This student is already enrolled in the maximum of ${MAX_ACTIVE_COURSES_PER_STUDENT} active courses.`);
  }

  if (existing) {
    const { data, error } = await supabase
      .from("enrollments")
      .update({ status: "active" })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("enrollments")
    .insert({ student_id: studentId, course_id: courseId, status: "active" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// TEACHER: REMOVE A STUDENT FROM COURSE
// ─────────────────────────────────────────────
export async function unenrollStudent(studentId, courseId) {
  const { error } = await supabase
    .from("enrollments")
    .update({ status: "dropped" })
    .eq("student_id", studentId)
    .eq("course_id", courseId);

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// TEACHER: GET STUDENTS IN A COURSE
// ─────────────────────────────────────────────
export async function getCourseStudents(courseId) {
  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select(`
      student_id, enrolled_at,
      profiles!enrollments_student_id_fkey (
        id, full_name, email, avatar_url, status, last_active_at
      )
    `)
    .eq("course_id", courseId)
    .eq("status", "active");

  if (enrollErr) throw new Error(enrollErr.message);
  if (!enrollments || enrollments.length === 0) return [];

  const studentIds = enrollments.map((e) => e.student_id);

  const { data: assignments, error: assignErr } = await supabase
    .from("assignments")
    .select("id, max_points")
    .eq("course_id", courseId);

  if (assignErr) throw new Error(assignErr.message);

  const assignmentIds = (assignments || []).map((a) => a.id);
  let submissions = [];

  if (assignmentIds.length > 0) {
    const { data: subs, error: subErr } = await supabase
      .from("submissions")
      .select("student_id, assignment_id, grade, status")
      .in("assignment_id", assignmentIds)
      .in("student_id", studentIds);

    if (subErr) throw new Error(subErr.message);
    submissions = subs || [];
  }

  const maxPointsMap = {};
  (assignments || []).forEach((a) => { maxPointsMap[a.id] = a.max_points; });

  const studentStats = {};
  submissions.forEach((sub) => {
    if (!studentStats[sub.student_id]) {
      studentStats[sub.student_id] = { count: 0, gradeTotal: 0, gradeCount: 0 };
    }
    studentStats[sub.student_id].count += 1;
    if (sub.status === "graded" && sub.grade != null) {
      const mp = maxPointsMap[sub.assignment_id] || 100;
      studentStats[sub.student_id].gradeTotal += (sub.grade / mp) * 100;
      studentStats[sub.student_id].gradeCount += 1;
    }
  });

  return enrollments.map((e) => {
    const profile = e.profiles;
    const stats   = studentStats[e.student_id] || { count: 0, gradeTotal: 0, gradeCount: 0 };
    return {
      id:              profile.id,
      full_name:       profile.full_name,
      email:           profile.email,
      avatar_url:      profile.avatar_url,
      status:          profile.status,
      last_active_at:  profile.last_active_at,
      enrolled_at:     e.enrolled_at,
      submissionCount: stats.count,
      avgGrade:        stats.gradeCount > 0
        ? Math.round(stats.gradeTotal / stats.gradeCount)
        : null,
    };
  });
}

// ─────────────────────────────────────────────
// TEACHER: GET ALL STUDENTS (for manual enroll picker)
// ─────────────────────────────────────────────
export async function getAllStudents(teacherId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, status")
    .eq("role", "student")
    .eq("status", "active")
    .eq("created_by", teacherId)
    .order("full_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─────────────────────────────────────────────
// ADMIN: GET ALL COURSES
// ─────────────────────────────────────────────
export async function getAllCourses() {
  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select(`
      id, title, subject, schedule,
      cover_color, status, created_at, join_code,
      teacher_id,
      profiles!courses_teacher_id_fkey ( full_name )
    `)
    .order("created_at", { ascending: false });

  if (courseErr) throw new Error(courseErr.message);
  if (!courses || courses.length === 0) return [];

  const courseIds = courses.map((c) => c.id);

  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds)
    .eq("status", "active");

  if (enrollErr) throw new Error(enrollErr.message);

  const enrollmentCount = {};
  (enrollments || []).forEach((e) => {
    enrollmentCount[e.course_id] = (enrollmentCount[e.course_id] || 0) + 1;
  });

  return courses.map((c) => ({
    id:          c.id,
    title:       c.title,
    subject:     c.subject,
    schedule:    c.schedule,
    cover_color: c.cover_color,
    status:      c.status,
    created_at:  c.created_at,
    join_code:   c.join_code,
    teacher:     c.profiles?.full_name ?? "Unknown Teacher",
    students:    enrollmentCount[c.id] ?? 0,
  }));
}

// ─────────────────────────────────────────────
// ADMIN: GET COURSE STATS SUMMARY
// ─────────────────────────────────────────────
export async function getCourseStats() {
  const { data, error } = await supabase
    .from("courses")
    .select("status");

  if (error) throw new Error(error.message);

  return {
    total:    data.length,
    active:   data.filter((c) => c.status === "active").length,
    archived: data.filter((c) => c.status === "archived").length,
  };
}


// ─────────────────────────────────────────────
// GET COURSE TERMS (shared by Attendance, Assignments, Assessments, Gradebook)
// ─────────────────────────────────────────────
const DEFAULT_TERMS = [
  { id: "prelim",  label: "Prelim",  startDate: "", endDate: "" },
  { id: "midterm", label: "Midterm", startDate: "", endDate: "" },
  { id: "finals",  label: "Finals",  startDate: "", endDate: "" },
];

export async function getCourseTerms(courseId) {
  const { data, error } = await supabase
    .from("courses")
    .select("terms")
    .eq("id", courseId)
    .single();

  if (error) throw new Error(error.message);

  const terms = data?.terms;
  return (terms && terms.length > 0) ? terms : DEFAULT_TERMS;
}

export async function updateCourseTerms(courseId, terms) {
  const { error } = await supabase
    .from("courses")
    .update({ terms })
    .eq("id", courseId);

  if (error) throw new Error(error.message);
}

export async function createStudentAccount({ email, password, fullName, courseId }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in.");
 
  const { data, error } = await supabase.functions.invoke("create-student", {
    body: { email, password, fullName, courseId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
 
  if (error) {
    let message = error.message || "Failed to create student account.";
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
  return data.student;
}