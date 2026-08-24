// src/services/assessmentService.js
import { supabase } from "./supabase";
import { getCourseStudents } from "./courseService";


const ASSESSMENT_SAFE_COLUMNS = `
  id, course_id, teacher_id, title, description, type, status,
  due_date, time_limit, max_points, created_at, updated_at,
  question_pool_size, randomize_questions, randomize_choices,
  show_answers_after_submit, time_per_question, term_id,
  lecture_id, require_fullscreen, access_unlocked
`;

// ─────────────────────────────────────────────
// TEACHER: GET ASSESSMENTS FOR A COURSE
// ─────────────────────────────────────────────
export async function getCourseAssessments(courseId) {
  const { data, error } = await supabase
    .from("assessments")
    .select(ASSESSMENT_SAFE_COLUMNS)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const assessmentIds = data.map(a => a.id);

  const { data: submissions } = await supabase
    .from("assessment_submissions")
    .select("assessment_id, status, student_id")
    .in("assessment_id", assessmentIds);

  const activeStudents = await getCourseStudents(courseId);
  const activeIds = new Set(activeStudents.map(s => s.id));

  const subMap = {};
  (submissions || []).filter(s => activeIds.has(s.student_id)).forEach(s => {
    if (!subMap[s.assessment_id]) subMap[s.assessment_id] = { total: 0, graded: 0 };
    subMap[s.assessment_id].total += 1;
    if (s.status === "graded") subMap[s.assessment_id].graded += 1;
  });

  return data.map(a => ({
    ...a,
    totalSubmissions:  subMap[a.id]?.total  ?? 0,
    gradedSubmissions: subMap[a.id]?.graded ?? 0,
  }));
}

// ─────────────────────────────────────────────
// TEACHER: CREATE ASSESSMENT
// ─────────────────────────────────────────────
export async function createAssessment({
  courseId, teacherId, title, description,
  type, dueDate, timeLimit, timePerQuestion, maxPoints, termId,
  show_answers_after_submit = false,
}) {
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      course_id:          courseId,
      teacher_id:         teacherId,
      title,
      description,
      type,
      due_date:           dueDate          || null,
      time_limit:         timeLimit        || null,
      time_per_question:  timePerQuestion  || null,
      max_points:         maxPoints        || 100,
      status:             "draft",
      randomize_questions:      false,
      randomize_choices:        false,
      question_pool_size:       null,
      show_answers_after_submit,
      term_id:            termId,
    })
    .select(ASSESSMENT_SAFE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// TEACHER: UPDATE ASSESSMENT
// ─────────────────────────────────────────────
export async function updateAssessment(assessmentId, updates) {
  const { data, error } = await supabase
    .from("assessments")
    .update(updates)
    .eq("id", assessmentId)
    .select(ASSESSMENT_SAFE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// TEACHER: PUBLISH / CLOSE / UNPUBLISH
// ─────────────────────────────────────────────
export async function publishAssessment(assessmentId) {
  return updateAssessment(assessmentId, { status: "published" });
}

export async function closeAssessment(assessmentId) {
  return updateAssessment(assessmentId, { status: "closed" });
}

export async function unpublishAssessment(assessmentId) {
  return updateAssessment(assessmentId, { status: "draft" });
}

// ─────────────────────────────────────────────
// EXAM ACCESS CONTROL
// ─────────────────────────────────────────────
export async function toggleExamAccess(assessmentId, unlock) {
  const { error } = await supabase
    .from("assessments")
    .update({ access_unlocked: unlock })
    .eq("id", assessmentId);
  if (error) throw new Error(error.message);
  return unlock;
}

function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function generateExamAccessCode(assessmentId) {
  const code = generateSixDigitCode();
  const { error } = await supabase
    .from("assessments")
    .update({ access_code: code, code_updated_at: new Date().toISOString() })
    .eq("id", assessmentId);
  if (error) throw new Error(error.message);
  return code; 
}

export async function verifyExamAccessCode(assessmentId, code) {
  const { data, error } = await supabase.rpc("verify_exam_access", {
    assessment_id_input: assessmentId,
    code_input: code,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function getAssessmentPreview(assessmentId) {
  const { data, error } = await supabase
    .from("assessments")
    .select(
      "id, course_id, term_id, title, description, type, status, due_date, time_limit, time_per_question, max_points, show_answers_after_submit, access_unlocked"
    )
    .eq("id", assessmentId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// TEACHER: DELETE ASSESSMENT
// ─────────────────────────────────────────────
export async function deleteAssessment(assessmentId) {
  const { error } = await supabase
    .from("assessments")
    .delete()
    .eq("id", assessmentId);

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────
// TEACHER: SAVE QUESTIONS
// ─────────────────────────────────────────────
const MAX_QUESTIONS_PER_ASSESSMENT = 100;
const MIN_POINTS_PER_QUESTION = 1;
const MAX_POINTS_PER_QUESTION = 100;

export async function saveQuestions(assessmentId, questions) {
  if (questions && questions.length > MAX_QUESTIONS_PER_ASSESSMENT) {
    throw new Error(`An assessment can have a maximum of ${MAX_QUESTIONS_PER_ASSESSMENT} questions.`);
  }

  const invalidPoints = (questions || []).find(
    q => (q.points || 1) < MIN_POINTS_PER_QUESTION || (q.points || 1) > MAX_POINTS_PER_QUESTION
  );
  if (invalidPoints) {
    throw new Error(`Points per question must be between ${MIN_POINTS_PER_QUESTION} and ${MAX_POINTS_PER_QUESTION}.`);
  }

  const { error: delErr } = await supabase
    .from("questions")
    .delete()
    .eq("assessment_id", assessmentId);

  if (delErr) throw new Error(delErr.message);

  if (!questions || questions.length === 0) return [];

  const rows = questions.map((q, i) => ({
    assessment_id:      assessmentId,
    type:               q.type,
    question:           q.question,
    options:            q.options        || null,
    correct_answer:     q.correct_answer || null,
    points:             q.points         || 1,
    time_limit_seconds: null,
    is_pool:            q.is_pool !== false,
    order_num:          i,
  }));

  const { data, error } = await supabase
    .from("questions")
    .insert(rows)
    .select();

  if (error) throw new Error(error.message);
  return data;
}

// ─────────────────────────────────────────────
// GET QUESTIONS FOR AN ASSESSMENT
// ─────────────────────────────────────────────
export async function getAssessmentQuestions(assessmentId) {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("order_num", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─────────────────────────────────────────────
// GET FULL ASSESSMENT WITH QUESTIONS
// ─────────────────────────────────────────────
export async function getAssessmentWithQuestions(assessmentId) {
  const { data: assessment, error } = await supabase
    .from("assessments")
    .select(ASSESSMENT_SAFE_COLUMNS)
    .eq("id", assessmentId)
    .single();

  if (error) throw new Error(error.message);

  const questions = await getAssessmentQuestions(assessmentId);
  return { ...assessment, questions };
}

// ─────────────────────────────────────────────
// STUDENT: GET ASSESSMENTS FOR ENROLLED COURSES
// ─────────────────────────────────────────────
export async function getStudentAssessments(studentId) {
  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId)
    .eq("status", "active");

  if (enrollErr) throw new Error(enrollErr.message);
  if (!enrollments || enrollments.length === 0) return [];

  const courseIds = enrollments.map(e => e.course_id);

  const { data: assessments, error: assessErr } = await supabase
    .from("assessments")
    .select(`
      id, title, description, type, status,
      due_date, time_limit, time_per_question, max_points, created_at,
      show_answers_after_submit, course_id,
      courses ( title )
    `)
    .in("course_id", courseIds)
    .eq("status", "published")
    .order("due_date", { ascending: true });

  if (assessErr) throw new Error(assessErr.message);
  if (!assessments || assessments.length === 0) return [];

  const assessmentIds = assessments.map(a => a.id);
  const { data: submissions } = await supabase
    .from("assessment_submissions")
    .select("assessment_id, score, max_score, status")
    .eq("student_id", studentId)
    .in("assessment_id", assessmentIds);

  const subMap = {};
  (submissions || []).forEach(s => { subMap[s.assessment_id] = s; });

  return assessments.map(a => ({
    id:                        a.id,
    title:                     a.title,
    description:               a.description,
    type:                      a.type,
    status:                    a.status,
    due_date:                  a.due_date,
    time_limit:                a.time_limit,
    time_per_question:         a.time_per_question,
    max_points:                a.max_points,
    created_at:                a.created_at,
    show_answers_after_submit: a.show_answers_after_submit ?? false,
    courseId:                  a.course_id,
    courseName:                a.courses?.title ?? "Unknown Course",
    submission:                subMap[a.id] ?? null,
  }));
}

// ─────────────────────────────────────────────
// STUDENT: GET QUESTIONS FOR TAKING
// ─────────────────────────────────────────────
export async function getQuestionsForStudent(assessmentId) {
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("randomize_questions, randomize_choices, question_pool_size")
    .eq("id", assessmentId)
    .single();

  if (aErr) throw new Error(aErr.message);

  const allQuestions = await getAssessmentQuestions(assessmentId);

  const alwaysShow = allQuestions.filter(q => q.is_pool === false);
  const poolQs     = allQuestions.filter(q => q.is_pool !== false);

  let pickedPool = [...poolQs];
  const poolSize = assessment.question_pool_size;
  if (poolSize && poolSize > 0 && poolSize < poolQs.length) {
    for (let i = pickedPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pickedPool[i], pickedPool[j]] = [pickedPool[j], pickedPool[i]];
    }
    pickedPool = pickedPool.slice(0, poolSize);
  }

  let finalQuestions = [...alwaysShow, ...pickedPool];

  if (assessment.randomize_questions) {
    for (let i = finalQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
    }
  }

  if (assessment.randomize_choices) {
    finalQuestions = finalQuestions.map(q => {
      if (q.type !== "multiple_choice" || !q.options) return q;
      const correctIndex = parseInt(q.correct_answer, 10);
      const paired = q.options.map((opt, i) => ({ opt, isCorrect: i === correctIndex }));
      for (let i = paired.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [paired[i], paired[j]] = [paired[j], paired[i]];
      }
      const newOptions      = paired.map(p => p.opt);
      const newCorrectIndex = paired.findIndex(p => p.isCorrect);
      return { ...q, options: newOptions, correct_answer: String(newCorrectIndex) };
    });
  }

  return finalQuestions;
}

// ─────────────────────────────────────────────
// STUDENT: SUBMIT ASSESSMENT
// ─────────────────────────────────────────────
export async function submitAssessment(assessmentId, studentId, answers, questions) {
  let score    = 0;
  let maxScore = 0;
  let status   = "graded";

  const autoGradedTypes = ["multiple_choice", "true_false", "fill_blank"];
  const manualTypes     = ["short_answer", "essay"];

  questions.forEach(q => {
    maxScore += q.points || 1;
    if (autoGradedTypes.includes(q.type)) {
      const studentAnswer = (answers[q.id] || "").toString().trim().toLowerCase();
      const correctAnswer = (q.correct_answer || "").toString().trim().toLowerCase();
      if (studentAnswer === correctAnswer) score += q.points || 1;
    }
    if (manualTypes.includes(q.type)) status = "submitted";
  });

  const { data: submission, error } = await supabase
    .from("assessment_submissions")
    .insert({
      assessment_id: assessmentId,
      student_id:    studentId,
      answers,
      score:         status === "graded" ? score : null,
      auto_score:    score,
      max_score:     maxScore,
      status,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return { ...submission, autoScore: score, maxScore, status };
}

// ─────────────────────────────────────────────
// STUDENT: SEND ASSESSMENT NOTIFICATIONS
// ─────────────────────────────────────────────
export async function sendAssessmentNotifications(assessmentId, studentId, score, maxScore, status) {
  try {
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, title, max_points, teacher_id, courses ( title )")
      .eq("id", assessmentId)
      .single();

    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single();

    const assessmentTitle = assessment?.title          ?? "an assessment";
    const courseName      = assessment?.courses?.title  ?? "a course";
    const studentName     = studentProfile?.full_name   ?? "A student";
    const teacherId       = assessment?.teacher_id;
    const pct             = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const notificationsToInsert = [];

    // 1. Notify STUDENT — only if auto-graded
    if (status === "graded") {
      notificationsToInsert.push({
        user_id:    studentId,
        title:      "Assessment Graded",
        message:    `Your submission for "${assessmentTitle}" has been auto-graded: ${score}/${maxScore} (${pct}%)`,
        type:       "grade",
        related_id: assessmentId,
        is_read:    false,
      });
    }

    // 2. Notify TEACHER — always
    if (teacherId) {
      notificationsToInsert.push({
        user_id:    teacherId,
        title:      "New Assessment Submission",
        message:    `${studentName} submitted "${assessmentTitle}" in ${courseName}${status === "submitted" ? " — requires manual grading" : ` — Score: ${score}/${maxScore} (${pct}%)`}`,
        type:       "submission",
        related_id: assessmentId,
        is_read:    false,
      });
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }
  } catch (e) {
    console.warn("Notification insert failed (non-critical):", e.message);
  }
}

// ─────────────────────────────────────────────
// TEACHER: GET SUBMISSIONS FOR AN ASSESSMENT
// ─────────────────────────────────────────────
export async function getAssessmentSubmissions(assessmentId) {
  const { data: assessment } = await supabase
    .from("assessments")
    .select("course_id")
    .eq("id", assessmentId)
    .single();

  const activeStudents = assessment?.course_id ? await getCourseStudents(assessment.course_id) : [];
  const activeIds = new Set(activeStudents.map(s => s.id));

  const { data, error } = await supabase
    .from("assessment_submissions")
    .select(`
      id, answers, score, auto_score, max_score, status,
      feedback, manual_scores, submitted_at, graded_at,
      profiles!assessment_submissions_student_id_fkey (
        id, full_name, email
      )
    `)
    .eq("assessment_id", assessmentId)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || [])
    .filter(s => activeIds.has(s.profiles?.id))
    .map(s => ({
      id:            s.id,
      answers:       s.answers,
      score:         s.score,
      auto_score:    s.auto_score,
      max_score:     s.max_score,
      status:        s.status,
      feedback:      s.feedback,
      manual_scores: s.manual_scores || {},
      submitted_at:  s.submitted_at,
      graded_at:     s.graded_at,
      studentId:     s.profiles?.id,
      studentName:   s.profiles?.full_name ?? "Unknown Student",
      studentEmail:  s.profiles?.email,
    }));
}

// ─────────────────────────────────────────────
// TEACHER: GRADE A SUBMISSION MANUALLY
// ─────────────────────────────────────────────
export async function gradeSubmission(submissionId, score, feedback, manualScores = null) {
  // Capture the previous score before overwriting it, for the audit trail.
  const { data: previous } = await supabase
    .from("assessment_submissions")
    .select("score, status")
    .eq("id", submissionId)
    .single();

  const updatePayload = {
    score,
    feedback,
    status:    "graded",
    graded_at: new Date().toISOString(),
  };
  if (manualScores !== null) updatePayload.manual_scores = manualScores;

  const { data: submission, error } = await supabase
    .from("assessment_submissions")
    .update(updatePayload)
    .eq("id", submissionId)
    .select(`
      id, student_id, assessment_id,
      assessments ( title, max_points ),
      profiles!assessment_submissions_student_id_fkey ( full_name )
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
        target_type: "assessment_submission",
        target_id:   submissionId,
        target_name: submission.profiles?.full_name ?? "Unknown student",
        details: {
          assessment:  submission.assessments?.title ?? "Unknown assessment",
          from_score:  previous?.score ?? null,
          to_score:    score,
          max_points:  submission.assessments?.max_points ?? null,
          was_regrade: previous?.status === "graded",
        },
      });
    }
  } catch (auditErr) {
    console.warn("Audit log insert failed (non-critical):", auditErr.message);
  }

  try {
    const assessmentTitle = submission.assessments?.title      ?? "your assessment";
    const maxPoints       = submission.assessments?.max_points  ?? 100;
    const pct             = Math.round((score / maxPoints) * 100);

    await supabase.from("notifications").insert({
      user_id:    submission.student_id,
      title:      "Assessment Graded",
      message:    `Your submission for "${assessmentTitle}" has been graded: ${score}/${maxPoints} (${pct}%)${feedback ? ` — "${feedback}"` : ""}`,
      type:       "grade",
      related_id: submission.assessment_id,
      is_read:    false,
    });
  } catch (notifError) {
    console.warn("Notification insert failed (non-critical):", notifError.message);
  }

  return submission;
}

// ─────────────────────────────────────────────
// STUDENT: GET OR CREATE IN-PROGRESS ATTEMPT
// ─────────────────────────────────────────────
export async function getOrCreateAttempt(assessmentId, studentId) {
  const { data: existing, error: fetchErr } = await supabase
    .from("assessment_attempts")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (existing) return existing;

  const { data: created, error: createErr } = await supabase
    .from("assessment_attempts")
    .insert({ assessment_id: assessmentId, student_id: studentId, answers: {}, current_index: 0 })
    .select()
    .single();

  if (createErr) throw new Error(createErr.message);
  return created;
}

// ─────────────────────────────────────────────
// STUDENT: AUTOSAVE PROGRESS
// ─────────────────────────────────────────────
export async function saveAttemptProgress(attemptId, answers, currentIndex) {
  if (!attemptId) return;
  try {
    await supabase
      .from("assessment_attempts")
      .update({ answers, current_index: currentIndex, last_saved_at: new Date().toISOString() })
      .eq("id", attemptId);
  } catch (e) {
    console.warn("Autosave failed (non-critical):", e.message);
  }
}

// ─────────────────────────────────────────────
// STUDENT: MARK ATTEMPT AS DONE 
// ─────────────────────────────────────────────
export async function completeAttempt(attemptId) {
  if (!attemptId) return;
  try {
    await supabase.from("assessment_attempts").update({ status: "submitted" }).eq("id", attemptId);
  } catch (e) {
    console.warn("Marking attempt complete failed (non-critical):", e.message);
  }
}

// ─────────────────────────────────────────────
// TEACHER: GET ALL ASSESSMENTS ACROSS ALL OWN COURSES
// ─────────────────────────────────────────────
export async function getTeacherAssessmentsForDuplication(teacherId) {
  const { data, error } = await supabase
    .from("assessments")
    .select(`
      id, title, type, max_points, created_at,
      courses!inner ( id, title, teacher_id, status )
    `)
    .eq("courses.teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const assessmentIds = (data || []).map(a => a.id);
  const countMap = {};
  if (assessmentIds.length > 0) {
    const { data: qs } = await supabase
      .from("questions")
      .select("assessment_id")
      .in("assessment_id", assessmentIds);
    (qs || []).forEach(q => { countMap[q.assessment_id] = (countMap[q.assessment_id] || 0) + 1; });
  }

  return (data || []).map(a => ({
    id:            a.id,
    title:         a.title,
    type:          a.type,
    maxPoints:     a.max_points,
    courseName:    a.courses?.title  ?? "Unknown course",
    courseStatus:  a.courses?.status ?? "active",
    questionCount: countMap[a.id] ?? 0,
  }));
}

export async function saveAssessmentAsTemplate(assessmentId, teacherId, templateTitle) {
  const { data: source, error: sourceErr } = await supabase
    .from("assessments")
    .select(`${ASSESSMENT_SAFE_COLUMNS}, courses ( title )`)
    .eq("id", assessmentId)
    .single();
  if (sourceErr) throw new Error(sourceErr.message);

  const { data: sourceQuestions, error: qErr } = await supabase
    .from("questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("order_num", { ascending: true });
  if (qErr) throw new Error(qErr.message);

  const { data: template, error: createErr } = await supabase
    .from("assessment_templates")
    .insert({
      teacher_id: teacherId,
      title: templateTitle?.trim() || source.title,
      type: source.type,
      description: source.description,
      max_points: source.max_points,
      randomize_questions: source.randomize_questions,
      randomize_choices: source.randomize_choices,
      question_pool_size: source.question_pool_size,
      show_answers_after_submit: source.show_answers_after_submit,
      source_course_title: source.courses?.title ?? null,
    })
    .select()
    .single();
  if (createErr) throw new Error(createErr.message);

  if (sourceQuestions && sourceQuestions.length > 0) {
    const rows = sourceQuestions.map(q => ({
      template_id: template.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      points: q.points,
      time_limit_seconds: q.time_limit_seconds,
      is_pool: q.is_pool,
      order_num: q.order_num,
    }));
    const { error: insertErr } = await supabase.from("assessment_template_questions").insert(rows);
    if (insertErr) throw new Error(insertErr.message);
  }

  return template;
}

export async function getTeacherTemplates(teacherId) {
  const { data, error } = await supabase
    .from("assessment_templates")
    .select("id, title, type, max_points, source_course_title, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const templateIds = (data || []).map(t => t.id);
  const countMap = {};
  if (templateIds.length > 0) {
    const { data: qs } = await supabase
      .from("assessment_template_questions")
      .select("template_id")
      .in("template_id", templateIds);
    (qs || []).forEach(q => { countMap[q.template_id] = (countMap[q.template_id] || 0) + 1; });
  }

  return (data || []).map(t => ({
    id: t.id,
    title: t.title,
    type: t.type,
    maxPoints: t.max_points,
    sourceCourseName: t.source_course_title ?? "Unknown course",
    questionCount: countMap[t.id] ?? 0,
    createdAt: t.created_at,
  }));
}

export async function deleteAssessmentTemplate(templateId) {
  const { error } = await supabase.from("assessment_templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);
}

export async function applyTemplateToCourse({ templateId, targetCourseId, teacherId, newTitle, termId }) {
  const { data: template, error: tErr } = await supabase
    .from("assessment_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (tErr) throw new Error(tErr.message);

  const { data: templateQuestions, error: qErr } = await supabase
    .from("assessment_template_questions")
    .select("*")
    .eq("template_id", templateId)
    .order("order_num", { ascending: true });
  if (qErr) throw new Error(qErr.message);

  const { data: newAssessment, error: createErr } = await supabase
    .from("assessments")
    .insert({
      course_id: targetCourseId,
      teacher_id: teacherId,
      title: newTitle?.trim() || template.title,
      description: template.description,
      type: template.type,
      due_date: null,
      time_limit: null,
      time_per_question: null,
      max_points: template.max_points,
      status: "draft",
      randomize_questions: template.randomize_questions,
      randomize_choices: template.randomize_choices,
      question_pool_size: template.question_pool_size,
      show_answers_after_submit: template.show_answers_after_submit,
      term_id: termId,
    })
    .select(ASSESSMENT_SAFE_COLUMNS)
    .single();
  if (createErr) throw new Error(createErr.message);

  if (templateQuestions && templateQuestions.length > 0) {
    const rows = templateQuestions.map(q => ({
      assessment_id: newAssessment.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      points: q.points,
      time_limit_seconds: q.time_limit_seconds,
      is_pool: q.is_pool,
      order_num: q.order_num,
    }));
    const { error: insertErr } = await supabase.from("questions").insert(rows);
    if (insertErr) throw new Error(insertErr.message);
  }

  return newAssessment;
}