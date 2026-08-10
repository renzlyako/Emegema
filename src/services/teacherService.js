// src/services/teacherService.js
import { supabase } from "./supabase";
import { getCourseTerms } from "./courseService";

// ─────────────────────────────────────────────
// GET TEACHER PROFILE
// ─────────────────────────────────────────────
export async function getTeacherProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// GET DASHBOARD STATS
// ─────────────────────────────────────────────
export async function getTeacherDashboardStats(teacherId) {
  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("status", "active");

  if (courseErr) throw new Error(courseErr.message);
  const courseIds = (courses || []).map(c => c.id);
  const activeCourses = courseIds.length;

  if (activeCourses === 0) {
    return { totalStudents: 0, activeCourses: 0, pendingGrading: 0, avgClassGrade: null };
  }

  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("student_id")
    .in("course_id", courseIds)
    .eq("status", "active");

  if (enrollErr) throw new Error(enrollErr.message);
  const totalStudents = new Set((enrollments || []).map(e => e.student_id)).size;

  const { data: assignments, error: assignErr } = await supabase
    .from("assignments")
    .select("id, max_points")
    .in("course_id", courseIds)
    .eq("status", "active");

  if (assignErr) throw new Error(assignErr.message);
  const assignmentIds = (assignments || []).map(a => a.id);

  if (assignmentIds.length === 0) {
    return { totalStudents, activeCourses, pendingGrading: 0, avgClassGrade: null };
  }

  const { data: submissions, error: subErr } = await supabase
    .from("submissions")
    .select("id, assignment_id, status, grade")
    .in("assignment_id", assignmentIds);

  if (subErr) throw new Error(subErr.message);

  const pendingGrading = (submissions || []).filter(s => s.status === "submitted").length;
  const maxPointsMap = {};
  (assignments || []).forEach(a => { maxPointsMap[a.id] = a.max_points; });
  const graded = (submissions || []).filter(s => s.status === "graded" && s.grade != null);
  const avgClassGrade = graded.length > 0
    ? Math.round(graded.reduce((sum, s) => {
        const mp = maxPointsMap[s.assignment_id] || 100;
        return sum + (s.grade / mp) * 100;
      }, 0) / graded.length)
    : null;

  return { totalStudents, activeCourses, pendingGrading, avgClassGrade };
}

// ─────────────────────────────────────────────
// GET PENDING SUBMISSIONS
// ─────────────────────────────────────────────
export async function getTeacherPendingSubmissions(teacherId, limit = 5) {
  const { data, error } = await supabase
    .from("submissions")
    .select(`
      id, status, submitted_at,
      assignments!inner ( id, title, teacher_id, courses ( title ) ),
      profiles!submissions_student_id_fkey ( full_name )
    `)
    .eq("assignments.teacher_id", teacherId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data || []).map(sub => {
    const fullName = sub.profiles?.full_name ?? "Unknown Student";
    const initials = fullName.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
    return {
      id:              sub.id,
      status:          sub.status,
      created_at:      sub.submitted_at,
      studentName:     fullName,
      studentInitials: initials,
      assignmentTitle: sub.assignments?.title ?? "Unknown Assignment",
      courseName:      sub.assignments?.courses?.title ?? "Unknown Course",
      submittedAgo:    timeAgo(sub.submitted_at),
    };
  });
}

// ─────────────────────────────────────────────
// GET COURSE ANALYTICS
// ─────────────────────────────────────────────
export async function getTeacherCourseAnalytics(teacherId) {
  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select("id, title, subject, schedule, cover_color")
    .eq("teacher_id", teacherId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (courseErr) throw new Error(courseErr.message);
  if (!courses || courses.length === 0) return [];

  const courseIds = courses.map(c => c.id);

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds)
    .eq("status", "active");

  const enrollmentCount = {};
  (enrollments || []).forEach(e => {
    enrollmentCount[e.course_id] = (enrollmentCount[e.course_id] || 0) + 1;
  });

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, course_id, max_points")
    .in("course_id", courseIds)
    .eq("status", "active");

  const assignmentIds = (assignments || []).map(a => a.id);
  let submissions = [];
  if (assignmentIds.length > 0) {
    const { data: subs } = await supabase
      .from("submissions")
      .select("assignment_id, status, grade")
      .in("assignment_id", assignmentIds);
    submissions = subs || [];
  }

  const assignmentMap = {};
  (assignments || []).forEach(a => { assignmentMap[a.id] = { courseId: a.course_id, maxPoints: a.max_points }; });

  const pendingCount = {};
  const gradeData = {};
  submissions.forEach(sub => {
    const a = assignmentMap[sub.assignment_id];
    if (!a) return;
    if (sub.status === "submitted") pendingCount[a.courseId] = (pendingCount[a.courseId] || 0) + 1;
    if (sub.status === "graded" && sub.grade != null && a.maxPoints > 0) {
      if (!gradeData[a.courseId]) gradeData[a.courseId] = { total: 0, count: 0 };
      gradeData[a.courseId].total += (sub.grade / a.maxPoints) * 100;
      gradeData[a.courseId].count += 1;
    }
  });

  return courses.map(c => ({
    id:                 c.id,
    title:              c.title,
    subject:            c.subject,
    schedule:           c.schedule,
    cover_color:        c.cover_color || "#243E36",
    students:           enrollmentCount[c.id] ?? 0,
    pendingSubmissions: pendingCount[c.id] ?? 0,
    avgGrade:           gradeData[c.id] ? Math.round(gradeData[c.id].total / gradeData[c.id].count) : null,
  }));
}

// ─────────────────────────────────────────────
// GET TODAY'S SCHEDULE
// ─────────────────────────────────────────────
export async function getTeacherTodaySchedule(teacherId) {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, schedule, cover_color")
    .eq("teacher_id", teacherId)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
  const DAY_MAP = {
    Mon: ["Mon", "M", "MWF", "MW", "MTh", "MTWF"],
    Tue: ["Tue", "T", "TTh", "TW", "MTWF"],
    Wed: ["Wed", "W", "MWF", "MW", "WF", "MTWF"],
    Thu: ["Thu", "Th", "TTh", "ThF", "MTWF"],
    Fri: ["Fri", "F", "MWF", "WF", "ThF", "MTWF"],
    Sat: ["Sat", "S"],
    Sun: ["Sun"],
  };
  const todayPatterns = DAY_MAP[today] || [];

  return (courses || []).filter(c => {
    if (!c.schedule) return false;
    const sched = c.schedule.toUpperCase();
    return todayPatterns.some(p => sched.startsWith(p.toUpperCase()));
  }).map(c => ({ title: c.title, schedule: c.schedule, cover_color: c.cover_color || "#243E36" }));
}

// ─────────────────────────────────────────────
// GET TEACHER ASSIGNMENTS
// ─────────────────────────────────────────────
export async function getTeacherAssignments(teacherId) {
  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select("id, title, cover_color")
    .eq("teacher_id", teacherId)
    .eq("status", "active");

  if (courseErr) throw new Error(courseErr.message);
  if (!courses || courses.length === 0) return [];

  const courseIds = courses.map(c => c.id);
  const courseMap = {};
  courses.forEach(c => { courseMap[c.id] = c; });

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds)
    .eq("status", "active");

  const enrollCount = {};
  (enrollments || []).forEach(e => {
    enrollCount[e.course_id] = (enrollCount[e.course_id] || 0) + 1;
  });

const { data: assignments, error: assignErr } = await supabase
  .from("assignments")
  .select("id, title, description, due_date, max_points, status, course_id, assignment_type")
  .in("course_id", courseIds)
  .order("due_date", { ascending: true });

  if (assignErr) throw new Error(assignErr.message);
  if (!assignments || assignments.length === 0) return [];

  const assignmentIds = assignments.map(a => a.id);

  const { data: submissions } = await supabase
    .from("submissions")
    .select("assignment_id, status")
    .in("assignment_id", assignmentIds);

  const subMap = {};
  (submissions || []).forEach(s => {
    if (!subMap[s.assignment_id]) subMap[s.assignment_id] = { submitted: 0, graded: 0 };
    if (s.status === "submitted") subMap[s.assignment_id].submitted += 1;
    if (s.status === "graded")    subMap[s.assignment_id].graded   += 1;
  });

return assignments.map(a => ({
  id:              a.id,
  title:           a.title,
  description:     a.description,
  due_date:        a.due_date,
  maxPoints:       a.max_points,
  status:          a.status,
  courseId:        a.course_id,
  assignment_type: a.assignment_type,  // ← ADD THIS LINE
  courseName:      courseMap[a.course_id]?.title ?? "Unknown Course",
  coverColor:      courseMap[a.course_id]?.cover_color ?? "#243E36",
  totalStudents:   enrollCount[a.course_id] ?? 0,
  submittedCount:  (subMap[a.id]?.submitted ?? 0) + (subMap[a.id]?.graded ?? 0),
  gradedCount:     subMap[a.id]?.graded ?? 0,
}));
}

// ─────────────────────────────────────────────
// CREATE ASSIGNMENT
// ─────────────────────────────────────────────
export async function createAssignment({ teacherId, courseId, title, description, dueDate, maxPoints }) {
  const { data, error } = await supabase
    .from("assignments")
    .insert({
      teacher_id:  teacherId,
      course_id:   courseId,
      title,
      description,
      due_date:    dueDate || null,
      max_points:  maxPoints || 100,
      status:      "active",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// DELETE ASSIGNMENT
// ─────────────────────────────────────────────
export async function deleteAssignment(assignmentId) {
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// GET TEACHER STUDENTS
// ─────────────────────────────────────────────
export async function getTeacherStudents(teacherId) {
  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select("id, title, cover_color")
    .eq("teacher_id", teacherId)
    .eq("status", "active");

  if (courseErr) throw new Error(courseErr.message);
  if (!courses || courses.length === 0) return [];

  const courseIds = courses.map(c => c.id);
  const courseMap = {};
  courses.forEach(c => { courseMap[c.id] = c; });

  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select(`
      student_id, course_id,
      profiles!enrollments_student_id_fkey ( id, full_name, email, last_active_at )
    `)
    .in("course_id", courseIds)
    .eq("status", "active");

  if (enrollErr) throw new Error(enrollErr.message);
  if (!enrollments || enrollments.length === 0) return [];

  const studentMap = {};
  enrollments.forEach(e => {
    const sid = e.student_id;
    if (!studentMap[sid]) {
      studentMap[sid] = {
        studentId:       sid,
        fullName:        e.profiles?.full_name ?? "Unknown",
        email:           e.profiles?.email ?? "",
        initials:        (e.profiles?.full_name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase(),
        enrolledCourses: [],
        avgGrade:        null,
        submissionCount: 0,
        lastSubmittedAt: null,
        lastActiveAt:    e.profiles?.last_active_at ?? null,
      };
    }
    studentMap[sid].enrolledCourses.push({
      courseId:   e.course_id,
      courseName: courseMap[e.course_id]?.title ?? "Unknown",
      coverColor: courseMap[e.course_id]?.cover_color ?? "#243E36",
    });
  });

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, course_id, max_points")
    .in("course_id", courseIds);

  const assignmentIds = (assignments || []).map(a => a.id);
  const maxPointsMap = {};
  (assignments || []).forEach(a => { maxPointsMap[a.id] = a.max_points || 100; });

  if (assignmentIds.length === 0) return Object.values(studentMap);

  const studentIds = Object.keys(studentMap);
  const { data: submissions } = await supabase
    .from("submissions")
    .select("student_id, assignment_id, status, grade, created_at")
    .in("assignment_id", assignmentIds)
    .in("student_id", studentIds);

  const gradeAccum = {};
  (submissions || []).forEach(sub => {
    const sid = sub.student_id;
    if (!studentMap[sid]) return;
    studentMap[sid].submissionCount += 1;
    if (!studentMap[sid].lastSubmittedAt || sub.created_at > studentMap[sid].lastSubmittedAt) {
      studentMap[sid].lastSubmittedAt = sub.created_at;
    }
    if (sub.status === "graded" && sub.grade != null) {
      if (!gradeAccum[sid]) gradeAccum[sid] = { total: 0, count: 0 };
      const mp = maxPointsMap[sub.assignment_id] || 100;
      gradeAccum[sid].total += (sub.grade / mp) * 100;
      gradeAccum[sid].count += 1;
    }
  });

  Object.keys(gradeAccum).forEach(sid => {
    if (studentMap[sid]) {
      studentMap[sid].avgGrade = Math.round(gradeAccum[sid].total / gradeAccum[sid].count);
    }
  });

  return Object.values(studentMap).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

// ─────────────────────────────────────────────
// GET GRADEBOOK
// ─────────────────────────────────────────────

export async function getTeacherGradebook(teacherId) {

  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .select("id, title, cover_color, subject")
    .eq("teacher_id", teacherId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (courseErr) throw new Error(courseErr.message);
  if (!courses || courses.length === 0) return { courses: [], courseData: {} };

  const courseIds = courses.map(c => c.id);

  const { data: assignments, error: assignErr } = await supabase
    .from("assignments")
    .select("id, title, course_id, max_points, assignment_type, term_id")
    .in("course_id", courseIds)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (assignErr) throw new Error(assignErr.message);

  const { data: assessments, error: assessErr } = await supabase
    .from("assessments")
    .select("id, title, course_id, max_points, type, term_id")
    .in("course_id", courseIds)
    .order("created_at", { ascending: true });

  if (assessErr) throw new Error(assessErr.message);

  const { data: configs } = await supabase
    .from("gradebook_config")
    .select("*")
    .in("course_id", courseIds);

  const configMap = {};
  (configs || []).forEach(c => { configMap[c.course_id] = c; });

  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select(`
      student_id, course_id,
      profiles!enrollments_student_id_fkey ( id, full_name )
    `)
    .in("course_id", courseIds)
    .eq("status", "active");

  if (enrollErr) throw new Error(enrollErr.message);

  const assignmentIds = (assignments || []).map(a => a.id);
  let assignmentSubmissions = [];
  if (assignmentIds.length > 0) {
    const { data: subs } = await supabase
      .from("submissions")
      .select("student_id, assignment_id, grade, status, submitted_at")
      .in("assignment_id", assignmentIds)
      .eq("status", "graded");
    assignmentSubmissions = subs || [];
  }

  const assessmentIds = (assessments || []).map(a => a.id);
  let assessmentSubmissions = [];
  if (assessmentIds.length > 0) {
    const { data: asubs } = await supabase
      .from("assessment_submissions")
      .select("student_id, assessment_id, score, max_score, status, submitted_at")
      .in("assessment_id", assessmentIds);
    assessmentSubmissions = asubs || [];
  }

  const { data: manualScores } = await supabase
    .from("gradebook_manual_scores")
    .select("student_id, course_id, recitation_score, attendance_score")
    .in("course_id", courseIds);

  const assignMaxMap = {};
  (assignments || []).forEach(a => { assignMaxMap[a.id] = a.max_points || 100; });

  const assessMaxMap = {};
  (assessments || []).forEach(a => { assessMaxMap[a.id] = a.max_points || 100; });

  const assignSubMap = {};
  assignmentSubmissions.forEach(s => {
    if (!assignSubMap[s.assignment_id]) assignSubMap[s.assignment_id] = {};
    assignSubMap[s.assignment_id][s.student_id] = {
      grade:     s.grade,
      maxPoints: assignMaxMap[s.assignment_id] || 100,
      date:      s.submitted_at,
    };
  });

  const assessSubMap = {};
  assessmentSubmissions.forEach(s => {
    if (!assessSubMap[s.assessment_id]) assessSubMap[s.assessment_id] = {};
    assessSubMap[s.assessment_id][s.student_id] = {
      score:    s.score,
      maxScore: s.max_score ?? assessMaxMap[s.assessment_id] ?? 100,
      date:      s.submitted_at,
    };
  });

  const manualMap = {};
  (manualScores || []).forEach(m => {
    if (!manualMap[m.course_id]) manualMap[m.course_id] = {};
    manualMap[m.course_id][m.student_id] = {
      recitation: m.recitation_score,
      attendance: m.attendance_score,
    };
  });

  const termsResults = await Promise.all(
    courseIds.map(id => getCourseTerms(id).catch(() => []))
  );
  const termsMap = {};
  courseIds.forEach((id, i) => { termsMap[id] = termsResults[i]; });

  const courseData = {};
  courses.forEach(course => {
    const cid = course.id;
    const config = configMap[cid] || {
      quiz_assessment_ids:       [],
      exam_assessment_ids:       [],
      activity_assessment_ids:   [],
      assignment_assignment_ids: [],
      activity_assignment_ids:   [],
      show_quiz:       true,
      show_exam:       true,
      show_activity:   true,
      show_project:    true,
      show_recitation: false,
      show_attendance: false,
    };

    const courseAssignments = (assignments || []).filter(a => a.course_id === cid);
    const courseAssessments = (assessments || []).filter(a => a.course_id === cid);

    const courseEnrollments = (enrollments || []).filter(e => e.course_id === cid);
    const students = courseEnrollments.map(e => ({
      id:       e.student_id,
      name:     e.profiles?.full_name ?? "Unknown",
      initials: (e.profiles?.full_name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase(),
    })).sort((a, b) => a.name.localeCompare(b.name));

    const courseAssignmentIds = new Set(courseAssignments.map(a => a.id));
    const courseAssessmentIds = new Set(courseAssessments.map(a => a.id));

    const courseAssignSubMap = {};
    Object.entries(assignSubMap).forEach(([assignId, studentMap]) => {
      if (courseAssignmentIds.has(assignId)) {
        courseAssignSubMap[assignId] = studentMap;
      }
    });

    const courseAssessSubMap = {};
    Object.entries(assessSubMap).forEach(([assessId, studentMap]) => {
      if (courseAssessmentIds.has(assessId)) {
        courseAssessSubMap[assessId] = studentMap;
      }
    });

    courseData[cid] = {
      course,
      config,
      assignments:  courseAssignments,
      assessments:  courseAssessments,
      students,
      assignSubMap: courseAssignSubMap,
      assessSubMap: courseAssessSubMap,
      manualMap:    manualMap[cid] || {},
      terms:        termsMap[cid] || [],
    };
  });

  return { courses, courseData };
}

export async function saveGradebookConfig(courseId, teacherId, config) {
  const payload = {
    course_id:               courseId,
    teacher_id:              teacherId,
    quiz_assessment_ids:       config.quiz_assessment_ids       ?? [],
    exam_assessment_ids:       config.exam_assessment_ids       ?? [],
    activity_assessment_ids:   config.activity_assessment_ids   ?? [],
    assignment_assignment_ids: config.assignment_assignment_ids ?? [],
    activity_assignment_ids:   config.activity_assignment_ids   ?? [],
    show_quiz:               config.show_quiz        ?? true,
    show_exam:               config.show_exam        ?? true,
    show_activity:           config.show_activity    ?? true,
    show_project:            config.show_project     ?? true,
    show_recitation:         config.show_recitation  ?? false,
    show_attendance:         config.show_attendance  ?? false,
  };

  const { data: existing, error: fetchError } = await supabase
    .from("gradebook_config")
    .select("id")
    .eq("course_id", courseId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  if (existing?.id) {
    const { error } = await supabase
      .from("gradebook_config")
      .update(payload)
      .eq("course_id", courseId)
      .eq("teacher_id", teacherId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("gradebook_config")
      .insert(payload);
    if (error) throw new Error(error.message);
  }
}

// ─────────────────────────────────────────────
// SAVE MANUAL SCORE
// ─────────────────────────────────────────────
export async function saveManualScore(courseId, studentId, teacherId, field, value) {
  const updateData = { [field]: value === "" ? null : Number(value) };
  const { error } = await supabase
    .from("gradebook_manual_scores")
    .upsert({
      course_id:  courseId,
      student_id: studentId,
      teacher_id: teacherId,
      ...updateData,
    }, { onConflict: "course_id,student_id" });

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// GET TEACHER ANNOUNCEMENTS
// ─────────────────────────────────────────────
export async function getTeacherAnnouncements(teacherId) {
  const { data, error } = await supabase
    .from("announcements")
    .select(`
      id, title, content, created_at, is_global, course_id,
      courses ( title )
    `)
    .eq("author_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(a => ({
    id:         a.id,
    title:      a.title,
    content:    a.content,
    created_at: a.created_at,
    is_global:  a.is_global,
    courseId:   a.course_id,
    courseName: a.courses?.title ?? null,
  }));
}

// ─────────────────────────────────────────────
// POST ANNOUNCEMENT
// ─────────────────────────────────────────────
const MAX_ANNOUNCEMENTS_PER_HOUR = 15;

export async function postAnnouncement({ authorId, title, content, courseId = null, isGlobal = false }) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: rateLimitErr } = await supabase
    .from("announcements")
    .select("id", { count: "exact", head: true })
    .eq("author_id", authorId)
    .gte("created_at", oneHourAgo);

  if (!rateLimitErr && recentCount !== null && recentCount >= MAX_ANNOUNCEMENTS_PER_HOUR) {
    throw new Error(`You've reached the limit of ${MAX_ANNOUNCEMENTS_PER_HOUR} announcements per hour. Please wait before posting more.`);
  }

  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      author_id: authorId,
      title,
      content,
      course_id: courseId,
      is_global: isGlobal,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  try {
    let studentIds = [];

    if (isGlobal) {

      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", authorId)
        .eq("status", "active");

      const courseIds = (courses || []).map(c => c.id);
      if (courseIds.length > 0) {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id")
          .in("course_id", courseIds)
          .eq("status", "active");

        studentIds = [...new Set((enrollments || []).map(e => e.student_id))];
      }
    } else if (courseId) {
     
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)
        .eq("status", "active");

      studentIds = (enrollments || []).map(e => e.student_id);
    }

    if (studentIds.length > 0) {
      const notifications = studentIds.map(studentId => ({
        user_id:    studentId,
        title:      "New Announcement",
        message:    `${title}`,
        type:       "announcement",
        related_id: announcement.id,
        is_read:    false,
      }));

      await supabase.from("notifications").insert(notifications);
    }
  } catch (notifError) {
    console.warn("Notification insert failed (non-critical):", notifError.message);
  }

  return announcement;
}

// ─────────────────────────────────────────────
// DELETE ANNOUNCEMENT
// ─────────────────────────────────────────────
export async function deleteAnnouncement(announcementId) {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId);

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// NOTIFY TEACHER ON ASSIGNMENT SUBMISSION
// ─────────────────────────────────────────────
export async function notifyTeacherOnSubmission({ assignmentId, studentId, assignmentType = "essay" }) {
  try {
    const { data: assignment } = await supabase
      .from("assignments")
      .select("title, teacher_id, courses ( title )")
      .eq("id", assignmentId)
      .single();

    if (!assignment?.teacher_id) return;

    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single();

    const studentName     = studentProfile?.full_name ?? "A student";
    const assignmentTitle = assignment.title ?? "an assignment";
    const courseName      = assignment.courses?.title ?? "a course";
    const typeLabel       = assignmentType === "link" ? "Link Submission" : "Essay";

    await supabase.from("notifications").insert({
      user_id:    assignment.teacher_id,
      title:      "New Assignment Submission",
      message:    `${studentName} submitted "${assignmentTitle}" (${typeLabel}) in ${courseName}`,
      type:       "submission",
      related_id: assignmentId,
      is_read:    false,
    });
  } catch (e) {
    console.warn("Teacher notification failed (non-critical):", e.message);
  }
}

// ─────────────────────────────────────────────
// GRADE SUBMISSION (assignments)
// ─────────────────────────────────────────────
export async function gradeSubmission({ submissionId, grade, feedback }) {
  
  const { data: previous } = await supabase
    .from("submissions")
    .select("grade, status")
    .eq("id", submissionId)
    .single();

  const { data: submission, error } = await supabase
    .from("submissions")
    .update({
      grade,
      feedback,
      status: "graded",
    })
    .eq("id", submissionId)
    .select(`
      id, student_id, assignment_id,
      assignments ( title, max_points ),
      profiles!submissions_student_id_fkey ( full_name )
    `)
    .single();

  if (error) throw new Error(error.message);

  try {
    const { data: { user: actor } } = await supabase.auth.getUser();
    if (actor) {
      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", actor.id)
        .single();

      await supabase.from("audit_log").insert({
        actor_id:    actor.id,
        actor_name:  actorProfile?.full_name ?? actor.email ?? "Unknown teacher",
        action:      "grade_updated",
        target_type: "submission",
        target_id:   submissionId,
        target_name: submission.profiles?.full_name ?? "Unknown student",
        details: {
          assignment:  submission.assignments?.title ?? "Unknown assignment",
          from_score:  previous?.grade ?? null,
          to_score:    grade,
          max_points:  submission.assignments?.max_points ?? null,
          was_regrade: previous?.status === "graded",
        },
      });
    }
  } catch (auditErr) {
    console.warn("Audit log insert failed (non-critical):", auditErr.message);
  }

  try {
    const assignmentTitle = submission.assignments?.title ?? "your assignment";
    const maxPoints       = submission.assignments?.max_points ?? 100;
    const pct             = Math.round((grade / maxPoints) * 100);

    await supabase.from("notifications").insert({
      user_id:    submission.student_id,
      title:      "Assignment Graded",
      message:    `Your submission for "${assignmentTitle}" has been graded: ${grade}/${maxPoints} (${pct}%)${feedback ? ` — "${feedback}"` : ""}`,
      type:       "grade",
      related_id: submission.assignment_id,
      is_read:    false,
    });
  } catch (notifError) {
    console.warn("Notification insert failed (non-critical):", notifError.message);
  }

  return submission;
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
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
