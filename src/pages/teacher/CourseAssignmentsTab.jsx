// src/pages/teacher/CourseAssignmentsTab.jsx
import { useState, useEffect, useCallback } from "react";
import { Plus, X, Trash2, Send, Clock, Award, FileText, AlertCircle, Loader2, RefreshCw, CheckCircle2, CheckSquare, Users, Star, MoreVertical, UserCheck, UserX, Eye, AlignLeft, ChevronDown, ChevronUp, Link, ExternalLink, Globe, } from "lucide-react";
import { supabase } from "../../services/supabase";
import { createAssignment, deleteAssignment, gradeSubmission, } from "../../services/teacherService";
import { getCourseStudents, getCourseTerms } from "../../services/courseService";
import { createPortal } from "react-dom";

// ─────────────────────────────────────────────
// ASSIGNMENT TYPE CONFIG
// ─────────────────────────────────────────────
const ASSIGNMENT_TYPES = [
  {
    value: "essay",
    label: "Essay",
    icon: <AlignLeft size={18} />,
    color: "#4a7c59",
    description: "Students write their answer directly in the LMS.",
    badge: "Text Editor",
    badgeColor: "#4a7c59",
    disabled: false,
  },
  {
    value: "link",
    label: "Link Submission",
    icon: <Link size={18} />,
    color: "#7c3aed",
    description: "Student submits a GitHub, Drive, Figma, etc. URL.",
    badge: "URL",
    badgeColor: "#7c3aed",
    disabled: false,
  },
  {
    value: "project",
    label: "Project",
    icon: <Award size={18} />,
    color: "#c0532a",
    description: "Student submits a Live Demo URL with rubric grading.",
    badge: "Rubric",
    badgeColor: "#c0532a",
    disabled: false,
  },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDue(dateStr) {
  if (!dateStr) return "No due date";
  const due  = new Date(dateStr);
  const now  = new Date();
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diff < 0)   return "Overdue";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return due.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}


function formatExactDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function stringToColor(str = "") {
  const colors = ["#243E36", "#7CA982", "#4a7c59", "#2d5a45", "#5c8a6a", "#3d6b50"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function Spinner({ size = 20 }) {
  return <Loader2 size={size} color="#7CA982" style={{ animation: "spin 1s linear infinite" }} />;
}

function typeInfo(type) {
  return ASSIGNMENT_TYPES.find(t => t.value === type) ?? ASSIGNMENT_TYPES[0];
}

function getLinkPlatform(url = "") {
  if (!url) return { label: "Link", color: "#7c3aed" };
  const u = url.toLowerCase();
  if (u.includes("github.com"))      return { label: "GitHub",      color: "#24292e" };
  if (u.includes("vercel.app"))      return { label: "Vercel",      color: "#000" };
  if (u.includes("netlify.app"))     return { label: "Netlify",     color: "#00ad9f" };
  if (u.includes("drive.google"))    return { label: "Google Drive",color: "#1a73e8" };
  if (u.includes("docs.google"))     return { label: "Google Docs", color: "#1a73e8" };
  if (u.includes("figma.com"))       return { label: "Figma",       color: "#f24e1e" };
  if (u.includes("youtube.com") || u.includes("youtu.be")) return { label: "YouTube", color: "#ff0000" };
  if (u.includes("onedrive") || u.includes("1drv"))        return { label: "OneDrive", color: "#0078d4" };
  return { label: "Link", color: "#7c3aed" };
}

// ─────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────
export default function CourseAssignmentsTab({ course, teacherId, onGraded, onAssessmentChanged }) {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [viewingId,   setViewingId]   = useState(null);
  const [terms,       setTerms]       = useState([]);
  const [activeTerm,  setActiveTerm]  = useState(null);

  const fetchAssignments = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: assigns, error: aErr } = await supabase
        .from("assignments")
        .select("id, title, description, due_date, max_points, status, created_at, assignment_type, rubric_criteria, term_id")
        .eq("course_id", course.id)
        .order("created_at", { ascending: false });

      if (aErr) throw new Error(aErr.message);
      if (!assigns || assigns.length === 0) { setAssignments([]); return; }

      const assignIds = assigns.map(a => a.id);

      const { data: subs } = await supabase
        .from("submissions")
        .select("assignment_id, status, student_id")
        .in("assignment_id", assignIds);

      const { data: enrollData } = await supabase
        .rpc("get_course_enrollment_count", { p_course_id: course.id });

      const totalStudents = enrollData ?? 0;

      const activeStudents = await getCourseStudents(course.id);
      const activeIds = new Set(activeStudents.map(s => s.id));

      const subMap = {};
      (subs || []).filter(s => activeIds.has(s.student_id)).forEach(s => {
        if (!subMap[s.assignment_id]) subMap[s.assignment_id] = { submitted: 0, graded: 0, studentIds: [] };
        subMap[s.assignment_id].submitted += 1;
        if (s.status === "graded") subMap[s.assignment_id].graded += 1;
        subMap[s.assignment_id].studentIds.push(s.student_id);
      });

      setAssignments(assigns.map(a => ({
        ...a,
        totalStudents,
        submittedCount: subMap[a.id]?.submitted  ?? 0,
        gradedCount:    subMap[a.id]?.graded      ?? 0,
        submittedIds:   subMap[a.id]?.studentIds  ?? [],
      })));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [course.id]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  useEffect(() => {
    getCourseTerms(course.id)
      .then(t => {
        setTerms(t);
        if (t.length > 0) setActiveTerm(t[0].id);
      })
      .catch(() => {});
  }, [course.id]);

  const filteredAssignments = activeTerm
    ? assignments.filter(a => a.term_id === activeTerm)
    : assignments;

  const pendingByTerm = assignments.reduce((acc, a) => {
    const pending = Math.max(0, (a.submittedCount || 0) - (a.gradedCount || 0));
    if (pending > 0) acc[a.term_id] = (acc[a.term_id] || 0) + pending;
    return acc;
  }, {});

  const [confirmModal, setConfirmModal] = useState(null);

  const handleDelete = (id) => {
  setConfirmModal({
    title: "Delete Assignment",
    message: "Are you sure you want to delete this assignment? This cannot be undone.",
    confirmLabel: "Delete Assignment",
    onConfirm: async () => {
      try {
        await deleteAssignment(id);
        setAssignments(prev => prev.filter(a => a.id !== id));
        onGraded?.();
        onAssessmentChanged?.(); 
      } catch (e) { alert(e.message); }
    },
  });
};

  const handleCreated = () => {
  setShowCreate(false);
  fetchAssignments();
  onAssessmentChanged?.(); 
};

  if (viewingId) {
    return (
      <SubmissionsView
        assignment={assignments.find(a => a.id === viewingId)}
        courseId={course.id}
        onBack={() => setViewingId(null)}
        onGraded={() => { fetchAssignments(); onGraded?.(); }}
      />
    );
  }

  return (
    <div>
      <style>{css}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#243E36" }}>
            {loading ? "Assignments" : `${assignments.length} Assignment${assignments.length !== 1 ? "s" : ""}`}
          </h3>
          <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 2 }}>Track submissions and missing work for this course</p>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowCreate(true)} className="primary-btn">
          <Plus size={14} /> New Assignment
        </button>
      </div>

      {error && (
        <div style={s.errorBox}>
          <AlertCircle size={14} color="#c0392b" />
          <span style={{ flex: 1, fontSize: 13, color: "#8b2020" }}>{error}</span>
          <button onClick={fetchAssignments} style={s.retryBtn}><RefreshCw size={12} /> Retry</button>
        </div>
      )}

      {terms.length > 0 && (
        <div style={s.termTabs}>
          {terms.map(term => (
            <button
              key={term.id}
              onClick={() => setActiveTerm(term.id)}
              style={{ ...s.termTab, ...(activeTerm === term.id ? s.termTabActive : {}) }}
              className="term-tab"
            >
              {term.label}
              {pendingByTerm[term.id] > 0 && (
                <span style={s.termBadge}>{pendingByTerm[term.id]}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : filteredAssignments.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><FileText size={28} color="#c8ddc9" /></div>
          <p style={s.emptyTitle}>No assignments yet</p>
          <p style={s.emptySub}>Create your first assignment for this course</p>
          <button style={s.primaryBtn} onClick={() => setShowCreate(true)} className="primary-btn">
            <Plus size={14} /> Create Assignment
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAssignments.map(a => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onDelete={() => handleDelete(a.id)}
              onViewSubmissions={() => setViewingId(a.id)}
            />
          ))}
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {showCreate && (
        <CreateAssignmentModal
          courseId={course.id}
          teacherId={teacherId}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ASSIGNMENT CARD
// ─────────────────────────────────────────────
function AssignmentCard({ assignment: a, onDelete, onViewSubmissions }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const info         = typeInfo(a.assignment_type);
  const submitRate   = a.totalStudents > 0 ? Math.round((a.submittedCount / a.totalStudents) * 100) : 0;
  const missingCount = Math.max(0, a.totalStudents - a.submittedCount);
  const isOverdue    = a.due_date && new Date(a.due_date) < new Date();

  return (
    <div style={s.assignCard}>
      <div style={{ ...s.assignAccent, background: info.color }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: info.color + "18", color: info.color, display: "flex", alignItems: "center", gap: 4 }}>
                {info.icon && <span style={{ display: "flex" }}>{info.icon}</span>}
                {info.label}
              </span>
              {a.status === "active"
                ? <span style={{ ...s.statusPill, background: "#e8f3ea", color: "#1a5c30" }}>Active</span>
                : <span style={{ ...s.statusPill, background: "#f5f5f5", color: "#666" }}>Closed</span>
              }
              {a.due_date && (
                <span style={{ ...s.statusPill, background: isOverdue ? "#fce8e8" : "#fff8e1", color: isOverdue ? "#8b2020" : "#7a5c00" }}>
                  <Clock size={10} /> {formatDue(a.due_date)} ({formatExactDate(a.due_date)})
                </span>
              )}
              {missingCount > 0 && (
                <span style={{ ...s.statusPill, background: "#fce8e8", color: "#8b2020" }}>
                  <UserX size={10} /> {missingCount} missing
                </span>
              )}
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: "#243E36" }}>{a.title}</h4>
            {a.description && (
              <p style={{ fontSize: 12, color: "#5a7a6e", marginTop: 3, lineHeight: 1.5 }}>
                {a.description.length > 100 ? a.description.slice(0, 100) + "…" : a.description}
              </p>
            )}
          </div>

          <div style={{ position: "relative", flexShrink: 0 }}>
            <button style={s.menuBtn} onClick={() => setMenuOpen(v => !v)} className="icon-action-btn">
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div style={s.menuDrop}>
                <button style={{ ...s.menuItem, color: "#e05252" }} onClick={() => { onDelete(); setMenuOpen(false); }} className="menu-item-danger">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submission progress bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "#9ab5a0" }}>
              <strong style={{ color: "#243E36" }}>{a.submittedCount}</strong> of {a.totalStudents} submitted
            </span>
            <span style={{ fontSize: 11, color: "#9ab5a0" }}>{submitRate}%</span>
          </div>
          <div style={{ height: 6, background: "#e8f3ea", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${submitRate}%`, background: submitRate === 100 ? "#7CA982" : submitRate > 50 ? "#e0a052" : "#e05252", transition: "width 0.5s ease" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={s.assignStat}><UserCheck size={12} color="#9ab5a0" /><span>{a.submittedCount} submitted</span></div>
          <div style={s.assignStat}><Star size={12} color="#9ab5a0" /><span>{a.gradedCount} graded</span></div>
          <div style={s.assignStat}><UserX size={12} color={missingCount > 0 ? "#e05252" : "#9ab5a0"} /><span style={{ color: missingCount > 0 ? "#e05252" : undefined }}>{missingCount} missing</span></div>
          {a.max_points && <div style={s.assignStat}><Award size={12} color="#9ab5a0" /><span>{a.max_points} pts</span></div>}
          <span style={{ fontSize: 11, color: "#c8ddc9", marginLeft: "auto" }}>
            Created {formatExactDate(a.created_at)} · {timeAgo(a.created_at)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        <button style={s.primaryBtn} onClick={onViewSubmissions} className="primary-btn">
          <Eye size={13} /> View Submissions
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUBMISSIONS VIEW
// ─────────────────────────────────────────────
function SubmissionsView({ assignment: a, courseId, onBack, onGraded }) {
  const [submissions,   setSubmissions]   = useState([]);
  const [missing,       setMissing]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeSection, setActiveSection] = useState("submitted");
  const [grading,       setGrading]       = useState(null);
  const [gradeScore,    setGradeScore]    = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [rubricScores,  setRubricScores]  = useState({}); // { criterionId: score }
  const [saving,        setSaving]        = useState(false);
  const [expandedId,    setExpandedId]    = useState(null);
  const isEssay   = a?.assignment_type === "essay";
  const isLink    = a?.assignment_type === "link";
  const isProject = a?.assignment_type === "project";
  const info      = typeInfo(a?.assignment_type);
  const rubricCriteria = (() => {
    try { return Array.isArray(a?.rubric_criteria) ? a.rubric_criteria : JSON.parse(a?.rubric_criteria || "[]"); }
    catch { return []; }
  })();

useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const enrolled = await getCourseStudents(courseId);
        const activeIds = new Set(enrolled.map(s => s.id));

        const { data: subs, error: subErr } = await supabase
          .from("submissions")
          .select("id, status, grade, feedback, notes, essay_answer, file_url, demo_url, student_id, submitted_at")
          .eq("assignment_id", a.id)
          .order("submitted_at", { ascending: false });

        if (subErr) console.error("Submissions error:", subErr);

        const activeSubs = (subs || []).filter(s => activeIds.has(s.student_id));

        const studentIds = activeSubs.map(s => s.student_id).filter(Boolean);
        let profileMap = {};
        if (studentIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", studentIds);
          (profiles || []).forEach(p => { profileMap[p.id] = p; });
        }

        const mapped = activeSubs.map(s => ({
          id:           s.id,
          status:       s.status,
          grade:        s.grade,
          feedback:     s.feedback,
          notes:        s.notes,
          essay_answer: s.essay_answer,
          file_url:     s.file_url,
          demo_url:     s.demo_url,
          submitted_at: s.submitted_at,
          studentId:    s.student_id,   
          studentName:  profileMap[s.student_id]?.full_name ?? "Unknown",
          studentEmail: profileMap[s.student_id]?.email ?? "",
        }));

        setSubmissions(mapped);

        const submittedIds = new Set(mapped.map(s => s.studentId).filter(Boolean));
        setMissing(enrolled.filter(s => !submittedIds.has(s.id)));
      } catch (e) { console.error("Load error:", e); }
      finally { setLoading(false); }
    };
    load();
  }, [a.id, courseId]);

  const handleGrade = async () => {
    let finalScore = Number(gradeScore);
    if (isProject && rubricCriteria.length > 0) {
    finalScore = rubricCriteria.reduce((sum, c) => {
    const raw = Number(rubricScores[c.id] || 0);
    const clamped = Math.min(Math.max(0, raw), c.max_score);
    return sum + clamped;
    }, 0);
    if (isNaN(finalScore)) { alert("Please fill in all rubric scores."); return; }
    } else {
      if (!gradeScore) return;
      finalScore = Math.min(Math.max(0, Number(gradeScore)), a?.max_points || 0);
    }
    setSaving(true);
    try {
      let feedbackToSave = gradeFeedback;
      if (isProject && rubricCriteria.length > 0) {
        const breakdown = rubricCriteria.map(c => `${c.label}: ${rubricScores[c.id] || 0}/${c.max_score}`).join(" | ");
        feedbackToSave = breakdown + (gradeFeedback ? `\n\n${gradeFeedback}` : "");
      }
      await gradeSubmission({ submissionId: grading.id, grade: finalScore, feedback: feedbackToSave });
      setSubmissions(prev => prev.map(s => s.id === grading.id
        ? { ...s, grade: finalScore, feedback: feedbackToSave, status: "graded" }
        : s
      ));
      setGrading(null);
      onGraded?.();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const openGradeModal = (sub) => {
    setGrading(sub);
    setGradeScore(sub.grade ?? "");
    setGradeFeedback(sub.feedback ?? "");
    
    if (isProject && rubricCriteria.length > 0) {
      const initScores = {};
      rubricCriteria.forEach(c => { initScores[c.id] = ""; });
      setRubricScores(initScores);
    }
  };

  const rubricTotal = rubricCriteria.reduce((sum, c) => sum + (Number(rubricScores[c.id] || 0)), 0);

  const pendingGrade = submissions.filter(s => s.status !== "graded").length;
  const avgScore     = submissions.filter(s => s.grade != null).length > 0
    ? Math.round(submissions.filter(s => s.grade != null).reduce((sum, s) => sum + (s.grade / (a.max_points || 100)) * 100, 0) / submissions.filter(s => s.grade != null).length)
    : null;

  const gradeModalTitle = isProject ? "Grade Project" : isLink ? "Grade Link Submission" : "Grade Essay";

  return (
    <div className="fade-up">
      <style>{css}</style>
      <button style={s.backBtn} onClick={onBack} className="back-btn">← Back to Assignments</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", margin: "12px 0 20px", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: info.color + "18", color: info.color }}>
              {info.label}
            </span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#243E36" }}>{a?.title}</h2>
          <p style={{ fontSize: 13, color: "#9ab5a0", marginTop: 4 }}>
            {submissions.length} submitted · {missing.length} missing · {a?.max_points} pts
          </p>
        </div>
        {avgScore !== null && (
          <div style={{ background: "#243E36", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "rgba(241,247,237,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Class Average</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#7CA982" }}>{avgScore}%</p>
          </div>
        )}
      </div>

      {/* Section toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setActiveSection("submitted")}
          style={{ ...s.sectionBtn, ...(activeSection === "submitted" ? s.sectionBtnActive : {}) }}>
          <UserCheck size={14} /> Submitted ({submissions.length})
          {pendingGrade > 0 && <span style={{ background: "#e0a052", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{pendingGrade} to grade</span>}
        </button>
        <button onClick={() => setActiveSection("missing")}
          style={{ ...s.sectionBtn, ...(activeSection === "missing" ? { ...s.sectionBtnActive, background: "#e05252", borderColor: "#e05252" } : {}) }}>
          <UserX size={14} /> Missing ({missing.length})
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : activeSection === "submitted" ? (
        submissions.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}><FileText size={28} color="#c8ddc9" /></div>
            <p style={s.emptyTitle}>No submissions yet</p>
            <p style={s.emptySub}>Students haven't submitted this assignment yet</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {submissions.map(sub => {
              const pct      = sub.grade != null ? Math.round((sub.grade / (a.max_points || 100)) * 100) : null;
              const expanded = expandedId === sub.id;
              const platform = isLink ? getLinkPlatform(sub.file_url) : null;
              const wordCount = sub.essay_answer ? sub.essay_answer.trim().split(/\s+/).filter(Boolean).length : 0;

              return (
                <div key={sub.id} style={{ ...s.subCard, flexDirection: "column", alignItems: "stretch", gap: 0 }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                    <div style={{ ...s.miniAvatar, background: stringToColor(sub.studentName) }}>
                      {getInitials(sub.studentName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{sub.studentName}</p>
                      <p style={{ fontSize: 11, color: "#9ab5a0" }}>
                        {sub.studentEmail} · {timeAgo(sub.submitted_at)}
                        {isEssay && sub.essay_answer && <span style={{ marginLeft: 8, color: "#7CA982" }}>{wordCount} words</span>}
                        {isLink && sub.file_url && (
                          <span style={{ marginLeft: 8, fontWeight: 600, color: platform.color }}>
                            {platform.label}
                          </span>
                        )}
                        {isProject && sub.demo_url && (
                          <span style={{ marginLeft: 8, fontWeight: 600, color: "#c0532a" }}>Live Demo submitted</span>
                        )}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {pct !== null ? (
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: pct >= 75 ? "#1a5c30" : "#8b2020" }}>{pct}%</p>
                          <p style={{ fontSize: 10, color: "#9ab5a0" }}>{sub.grade}/{a.max_points}</p>
                        </div>
                      ) : (
                        <span style={{ ...s.statusPill, background: "#fff8e1", color: "#7a5c00" }}>Needs grading</span>
                      )}
                      <span style={{ ...s.statusPill, background: sub.status === "graded" ? "#e8f3ea" : "#fff8e1", color: sub.status === "graded" ? "#1a5c30" : "#7a5c00" }}>
                        {sub.status}
                      </span>

                      {/* Toggle expand for essay, link, or project */}
                      {((isEssay && sub.essay_answer) || (isLink && sub.file_url) || (isProject && sub.demo_url)) ? (
                        <button style={s.expandBtn} onClick={() => setExpandedId(expanded ? null : sub.id)} className="icon-action-btn">
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      ) : null}

                      <button style={s.primaryBtn} className="primary-btn"
                        onClick={() => openGradeModal(sub)}>
                        <Star size={13} /> {sub.status === "graded" ? "Edit Grade" : "Grade"}
                      </button>
                    </div>
                  </div>

                  {/* Essay expanded */}
                  {isEssay && expanded && sub.essay_answer && (
                    <div style={{ borderTop: "1px solid #e8f3ea", padding: "16px 18px", background: "#fafcfa" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#7CA982", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Student's Essay Answer
                      </p>
                      <div style={{ fontSize: 14, color: "#243E36", lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#fff", border: "1px solid #e8f3ea", borderRadius: 8, padding: "14px 16px" }}>
                        {sub.essay_answer}
                      </div>
                      {sub.feedback && (
                        <div style={{ marginTop: 12, padding: "10px 14px", background: "#e8f3ea", borderRadius: 8 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#4a7c59", marginBottom: 4 }}>Your Feedback</p>
                          <p style={{ fontSize: 13, color: "#243E36" }}>{sub.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Link expanded */}
                  {isLink && expanded && sub.file_url && (
                    <div style={{ borderTop: "1px solid #e8f3ea", padding: "16px 18px", background: "#fafcfa" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Submitted Link
                      </p>
                      {/* Link preview card */}
                      <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: sub.notes ? 12 : 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: platform.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Link size={16} color={platform.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: platform.color, marginBottom: 2 }}>{platform.label}</p>
                          <p style={{ fontSize: 12, color: "#5a7a6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.file_url}</p>
                        </div>
                        <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#243E36", color: "#fff", borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                          <ExternalLink size={13} /> Open
                        </a>
                      </div>
                      {sub.notes && (
                        <div style={{ background: "#F1F7ED", borderRadius: 8, padding: "10px 14px" }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#4a7c59", marginBottom: 4 }}>Student's Notes</p>
                          <p style={{ fontSize: 13, color: "#243E36", lineHeight: 1.6 }}>{sub.notes}</p>
                        </div>
                      )}
                      {sub.feedback && (
                        <div style={{ marginTop: 10, padding: "10px 14px", background: "#e8f3ea", borderRadius: 8 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#4a7c59", marginBottom: 4 }}>Your Feedback</p>
                          <p style={{ fontSize: 13, color: "#243E36" }}>{sub.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Project expanded */}
                  {isProject && expanded && sub.demo_url && (
                    <div style={{ borderTop: "1px solid #e8f3ea", padding: "16px 18px", background: "#fafcfa" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#c0532a", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Project Submission
                      </p>
                      <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#c0532a18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Globe size={16} color="#c0532a" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#c0532a", marginBottom: 2 }}>Live Demo URL</p>
                          <p style={{ fontSize: 12, color: "#5a7a6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.demo_url}</p>
                        </div>
                        <a href={sub.demo_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "#c0532a", color: "#fff", borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                          <ExternalLink size={13} /> Open
                        </a>
                      </div>
                      {/* Show rubric breakdown if graded */}
                      {sub.feedback && rubricCriteria.length > 0 && (
                        <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff8f5", border: "1px solid #f5c6a0", borderRadius: 8 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#c0532a", marginBottom: 6 }}>Rubric Scores</p>
                          {sub.feedback.split("\n")[0].split(" | ").map((line, i) => (
                            <p key={i} style={{ fontSize: 12, color: "#243E36", marginBottom: 2 }}>{line}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        missing.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}><CheckCircle2 size={28} color="#7CA982" /></div>
            <p style={s.emptyTitle}>All students submitted! 🎉</p>
            <p style={s.emptySub}>Every enrolled student has submitted this assignment</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <UserX size={16} color="#c0392b" />
              <p style={{ fontSize: 13, color: "#8b2020" }}>
                <strong>{missing.length} student{missing.length !== 1 ? "s" : ""}</strong> {missing.length !== 1 ? "have" : "has"} not submitted
                {a.due_date && new Date(a.due_date) < new Date() ? " — overdue" : ""}
              </p>
            </div>
            {missing.map(student => (
              <div key={student.id} style={{ ...s.subCard, borderLeft: "3px solid #e05252" }}>
                <div style={{ ...s.miniAvatar, background: stringToColor(student.full_name) }}>
                  {getInitials(student.full_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{student.full_name}</p>
                  <p style={{ fontSize: 11, color: "#9ab5a0" }}>{student.email}</p>
                </div>
                <span style={{ ...s.statusPill, background: "#fce8e8", color: "#8b2020" }}>Not submitted</span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Grade Modal */}
      {grading && createPortal(
        <div style={s.modalOverlay} onClick={() => setGrading(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h2 style={s.modalTitle}>{gradeModalTitle}</h2>
              <button style={s.modalClose} onClick={() => setGrading(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
              <p style={{ fontSize: 13, color: "#5a7a6e" }}>
                <strong>{grading.studentName}</strong> · {a?.title}
              </p>

              {/* Essay preview in modal */}
              {isEssay && grading.essay_answer && (
                <div style={{ background: "#F1F7ED", borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#7CA982", marginBottom: 8 }}>
                    Essay Answer · {grading.essay_answer.trim().split(/\s+/).filter(Boolean).length} words
                  </p>
                  <div style={{ fontSize: 13, color: "#243E36", lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto" }}>
                    {grading.essay_answer}
                  </div>
                </div>
              )}

              {/* Link preview in modal */}
              {isLink && grading.file_url && (() => {
                const p = getLinkPlatform(grading.file_url);
                return (
                  <div style={{ background: "#F1F7ED", borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 10 }}>Submitted Link</p>
                    <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 9, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: grading.notes ? 10 : 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: p.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Link size={14} color={p.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: p.color, marginBottom: 1 }}>{p.label}</p>
                        <p style={{ fontSize: 12, color: "#5a7a6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{grading.file_url}</p>
                      </div>
                      <a href={grading.file_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "#243E36", color: "#fff", borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                        <ExternalLink size={12} /> Open
                      </a>
                    </div>
                    {grading.notes && (
                      <div style={{ background: "#e8f3ea", borderRadius: 8, padding: "8px 12px" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#4a7c59", marginBottom: 3 }}>Student's Notes</p>
                        <p style={{ fontSize: 12, color: "#243E36" }}>{grading.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Project demo URL preview in modal */}
              {isProject && grading.demo_url && (
                <div style={{ background: "#F1F7ED", borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#c0532a", marginBottom: 10 }}>Live Demo URL</p>
                  <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 9, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: "#c0532a18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Globe size={14} color="#c0532a" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#c0532a", marginBottom: 1 }}>Live Demo</p>
                      <p style={{ fontSize: 12, color: "#5a7a6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{grading.demo_url}</p>
                    </div>
                    <a href={grading.demo_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", background: "#c0532a", color: "#fff", borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
                      <ExternalLink size={12} /> Open
                    </a>
                  </div>
                </div>
              )}

              {/* Assignment instructions for reference */}
              {a?.description && (
                <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 8, padding: "10px 14px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9ab5a0", marginBottom: 4 }}>Prompt / Instructions</p>
                  <p style={{ fontSize: 12, color: "#5a7a6e", lineHeight: 1.6 }}>{a.description}</p>
                </div>
              )}

              {/* Project: per-criterion rubric scoring */}
              {isProject && rubricCriteria.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={s.label}>Rubric Scoring</label>
                  <span style={{ fontSize: 12, fontWeight: 700, color: rubricTotal > (a?.max_points || 100) ? "#e05252" : "#1a5c30" }}>
                    {rubricTotal > (a?.max_points || 100) ? `⚠ ${rubricTotal} / ${a?.max_points} — Over limit!` : `Total: ${rubricTotal} / ${a?.max_points}` }
                  </span>
                </div>
                  {rubricCriteria.map(c => (
                    <div key={c.id} style={{
                    background: Number(rubricScores[c.id]) > c.max_score ? "#fce8e8" : "#F1F7ED",
                    borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
                    border: `1px solid ${Number(rubricScores[c.id]) > c.max_score ? "#f5c6c6" : "transparent"}`,
                  }}>
                <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{c.label}</p>
                <p style={{ fontSize: 11, color: "#9ab5a0" }}>Max: {c.max_score} pts</p>
                {Number(rubricScores[c.id]) > c.max_score && (
                <p style={{ fontSize: 11, color: "#e05252", marginTop: 2 }}> ⚠ Cannot exceed {c.max_score} pts </p>
                  )}
                </div>
                      <input
                          type="number" min="0" max={c.max_score}
                          placeholder={`0–${c.max_score}`}
                          value={rubricScores[c.id] ?? ""}
                          onChange={e => {
                          const val = e.target.value;
                          const num = Number(val);
                          if (val === "") { setRubricScores(prev => ({ ...prev, [c.id]: "" }));
                          } else if (!isNaN(num)) { setRubricScores(prev => ({...prev,
                          [c.id]: Math.min(num, c.max_score),}));
                          }
                        }} style={{ ...s.input, width: 80, textAlign: "center", padding: "8px 10px" }} className="lms-input"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={s.fieldGroup}>
                  <label style={s.label}>Score (out of {a?.max_points})</label>
                  <input
                    type="number" min="0" max={a?.max_points}
                    placeholder={`0 – ${a?.max_points}`}
                    value={gradeScore}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "") { setGradeScore(""); return; }
                      const num = Number(val);
                      if (!isNaN(num)) setGradeScore(Math.min(Math.max(0, num), a?.max_points || 0));
                    }}
                    style={s.input} className="lms-input"
                  />
                </div>
              )}

              <div style={s.fieldGroup}>
                <label style={s.label}>Feedback for student {isProject && <span style={{ fontSize: 11, color: "#9ab5a0", fontWeight: 400 }}>(optional)</span>}</label>
                <textarea
                  placeholder="Write constructive feedback…"
                  value={gradeFeedback}
                  onChange={e => setGradeFeedback(e.target.value)}
                  rows={3}
                  style={{ ...s.input, resize: "vertical" }}
                  className="lms-input"
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...s.primaryBtn, flex: 1, justifyContent: "center" }} className="primary-btn"
                  onClick={handleGrade} disabled={saving}>
                  {saving ? <Spinner size={14} /> : <Send size={14} />} Submit Grade
                </button>
                <button style={{ ...s.secondaryBtn, flex: 1, justifyContent: "center" }} className="secondary-btn"
                  onClick={() => setGrading(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: CREATE ASSIGNMENT
// ─────────────────────────────────────────────
const MAX_RUBRIC_CRITERIA = 10;
const MIN_MAX_POINTS = 1;
const MAX_MAX_POINTS = 1000;

function CreateAssignmentModal({ courseId, teacherId, onClose, onCreated }) {
  const [step,         setStep]         = useState(1);
  const [selType,      setSelType]      = useState(null);
  const [form,         setForm]         = useState({ title: "", description: "", dueDate: "", maxPoints: "100", termId: "" });
  const [rubricRows,   setRubricRows]   = useState([{ id: "1", label: "", max_score: "" }]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [terms,        setTerms]        = useState([]);
  const [termsLoading, setTermsLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    getCourseTerms(courseId)
      .then(t => {
        setTerms(t);
        if (t.length > 0) setForm(prev => ({ ...prev, termId: t[0].id }));
      })
      .catch(() => {})
      .finally(() => setTermsLoading(false));
  }, [courseId]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const addCriterion = () => {
    if (rubricRows.length >= MAX_RUBRIC_CRITERIA) return;
    setRubricRows(prev => [...prev, { id: String(Date.now()), label: "", max_score: "" }]);
  };
  const removeCriterion = (id) => setRubricRows(prev => prev.filter(r => r.id !== id));
  const updateCriterion = (id, field, val) => setRubricRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  const rubricTotal = rubricRows.reduce((sum, r) => sum + (Number(r.max_score) || 0), 0);

  const handleCreate = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.termId) { setError("Please select a term."); return; }

    if (selType === "project") {
      const valid = rubricRows.every(r => r.label.trim() && Number(r.max_score) > 0);
      if (!valid) { setError("All rubric criteria need a label and max score."); return; }
      if (rubricRows.length > MAX_RUBRIC_CRITERIA) { setError(`Maximum of ${MAX_RUBRIC_CRITERIA} rubric criteria allowed.`); return; }
      const invalidScore = rubricRows.some(r => Number(r.max_score) > MAX_MAX_POINTS);
      if (invalidScore) { setError(`Each rubric criterion's max score cannot exceed ${MAX_MAX_POINTS}.`); return; }
    } else {
      const pts = Number(form.maxPoints);
      if (!pts || pts < MIN_MAX_POINTS || pts > MAX_MAX_POINTS) {
        setError(`Max points must be between ${MIN_MAX_POINTS} and ${MAX_MAX_POINTS}.`);
        return;
      }
    }

    const { count, error: countErr } = await supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId);

    if (!countErr && count >= 200) {
      setError("This course has reached the maximum of 200 assignments. Consider archiving old ones.");
      return;
    }

    setLoading(true); setError("");
    try {
      const insertData = {
        teacher_id:      teacherId,
        course_id:       courseId,
        title:           form.title.trim(),
        description:     form.description.trim(),
        due_date:        form.dueDate || null,
        max_points:      selType === "project" ? rubricTotal : (form.maxPoints ? Number(form.maxPoints) : 100),
        status:          "active",
        assignment_type: selType,
        term_id:         form.termId,
      };
      if (selType === "project") {
        insertData.rubric_criteria = rubricRows.map(r => ({ id: r.id, label: r.label.trim(), max_score: Number(r.max_score) }));
      }
      const { data, error: err } = await supabase
        .from("assignments")
        .insert(insertData)
        .select()
        .single();
      if (err) throw new Error(err.message);
      onCreated(data);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const info = selType ? typeInfo(selType) : null;

  const descPlaceholder = selType === "essay"
    ? "Write the essay prompt here. Students will see this and write their response directly in the LMS…"
    : selType === "link"
    ? "Describe what the student should submit. E.g. 'Submit your GitHub repository link for the final project.'"
    : selType === "project"
    ? "Describe the project requirements. Students will submit a Live Demo URL."
    : "Describe the assignment…";

  const descHint = selType === "essay"
    ? "✏ Students will type their essay answer directly in the LMS — no file upload needed."
    : selType === "link"
    ? "🔗 Students will paste a URL (GitHub, Google Drive, Figma, etc.) and optional notes."
    : selType === "project"
    ? "🌐 Students will submit a Live Demo URL. Max points are calculated from your rubric total."
    : null;

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: step === 1 ? 560 : (selType === "project" ? 560 : 500) }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <div>
            <h2 style={s.modalTitle}>{step === 1 ? "Choose Assignment Type" : "New Assignment"}</h2>
            {step === 2 && info && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: info.color + "18", color: info.color }}>
                  {info.label}
                </span>
              </div>
            )}
          </div>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        {}
        {step === 1 && (
          <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            {ASSIGNMENT_TYPES.map(t => (
              <button
                key={t.value}
                disabled={t.disabled}
                onClick={() => { setSelType(t.value); setStep(2); }}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 18px", borderRadius: 12,
                  border: `1.5px solid ${t.disabled ? "#e8f3ea" : t.color + "40"}`,
                  background: t.disabled ? "#fafcfa" : "#fff",
                  cursor: t.disabled ? "not-allowed" : "pointer",
                  opacity: t.disabled ? 0.55 : 1,
                  transition: "all 0.15s",
                  fontFamily: "'DM Sans', sans-serif",
                  textAlign: "left",
                }}
                className={t.disabled ? "" : "type-select-btn"}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: t.color + "15", display: "flex", alignItems: "center", justifyContent: "center", color: t.color, flexShrink: 0 }}>
                  {t.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36" }}>{t.label}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: t.badgeColor + "20", color: t.badgeColor }}>
                      {t.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#9ab5a0", lineHeight: 1.4 }}>{t.description}</p>
                </div>
                {!t.disabled && <span style={{ color: t.color, fontSize: 18, fontWeight: 700 }}>→</span>}
              </button>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#243E36", borderRadius: 12, border: "1.5px solid #243E36", marginTop: 4 }}>
              <CheckSquare size={18} color="#F1F7ED" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: "rgba(241,247,237,0.8)", lineHeight: 1.5 }}>
                💡 After creating, go to <strong style={{ color: "#F1F7ED" }}>Gradebook → Setup Gradebook</strong> to categorize this as an Assignment or Activity for grade breakdown.
              </p>
            </div>
          </div>
        )}

        {}
        {step === 2 && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
            {error && (
              <div style={s.errorBox}>
                <AlertCircle size={14} color="#c0392b" />
                <span style={{ fontSize: 13, color: "#8b2020" }}>{error}</span>
              </div>
            )}

            <div style={s.fieldGroup}>
              <label style={s.label}>Title <span style={{ color: "#e05252" }}>*</span></label>
              <input placeholder="e.g. Final Project Repository" value={form.title}
                onChange={e => set("title", e.target.value)} style={s.input} className="lms-input" autoFocus />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Term <span style={{ color: "#e05252" }}>*</span></label>
              <select
                value={form.termId}
                onChange={e => set("termId", e.target.value)}
                style={s.input}
                className="lms-input"
                disabled={termsLoading}
              >
                {termsLoading && <option value="">Loading terms…</option>}
                {!termsLoading && terms.length === 0 && <option value="">No terms configured</option>}
                {terms.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              {!termsLoading && terms.length === 0 && (
                <p style={{ fontSize: 11, color: "#e0a052", marginTop: 4 }}>
                  ⚠ No terms configured yet. Go to the <strong>Gradebook</strong> to set up terms first.
                </p>
              )}
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>
                {selType === "essay" ? "Essay Prompt / Instructions" : "Instructions (optional)"}
              </label>
              <textarea
                placeholder={descPlaceholder}
                value={form.description}
                onChange={e => set("description", e.target.value)}
                rows={3}
                style={{ ...s.input, resize: "vertical" }}
                className="lms-input"
              />
              {descHint && (
                <p style={{ fontSize: 11, color: info.color, marginTop: 4 }}>{descHint}</p>
              )}
            </div>

            {/* Rubric builder — only for project type */}
            {selType === "project" && (
              <div style={s.fieldGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={s.label}>Rubric Criteria <span style={{ color: "#e05252" }}>*</span></label>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#c0532a" }}>
                    Total: {rubricTotal} pts
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rubricRows.map((row, i) => (
                    <div key={row.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        placeholder={`e.g. Functionality`}
                        value={row.label}
                        onChange={e => updateCriterion(row.id, "label", e.target.value)}
                        style={{ ...s.input, flex: 1 }}
                        className="lms-input"
                      />
                      <input
                        type="number" min="1" placeholder="pts"
                        value={row.max_score}
                        onChange={e => updateCriterion(row.id, "max_score", e.target.value)}
                        style={{ ...s.input, width: 72, textAlign: "center" }}
                        className="lms-input"
                      />
                      {rubricRows.length > 1 && (
                        <button onClick={() => removeCriterion(row.id)}
                          style={{ background: "none", border: "1px solid #f5c6c6", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "#e05252", display: "flex", alignItems: "center", flexShrink: 0 }}
                          className="icon-action-btn">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addCriterion}
                  disabled={rubricRows.length >= MAX_RUBRIC_CRITERIA}
                  style={{
                    marginTop: 8, display: "flex", alignItems: "center", gap: 6, background: "none",
                    border: "1.5px dashed #c8ddc9", borderRadius: 9, padding: "8px 14px", fontSize: 13,
                    fontWeight: 600, color: "#7CA982", cursor: rubricRows.length >= MAX_RUBRIC_CRITERIA ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: rubricRows.length >= MAX_RUBRIC_CRITERIA ? 0.5 : 1,
                  }}>
                  <Plus size={14} />
                  {rubricRows.length >= MAX_RUBRIC_CRITERIA ? `Max ${MAX_RUBRIC_CRITERIA} criteria reached` : "Add Criterion"}
                </button>
              </div>
            )}

            {/* Due date + max points row — hide max points for project (auto-calculated) */}
            <div style={{ display: "grid", gridTemplateColumns: selType === "project" ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div style={s.fieldGroup}>
                <label style={s.label}>Due Date (optional)</label>
                <input type="datetime-local" value={form.dueDate}
                  onChange={e => set("dueDate", e.target.value)} style={s.input} className="lms-input" />
              </div>
              {selType !== "project" && (
                <div style={s.fieldGroup}>
                  <label style={s.label}>Max Points</label>
                  <input type="number" min="1" value={form.maxPoints}
                    onChange={e => set("maxPoints", e.target.value)} style={s.input} className="lms-input" />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={s.secondaryBtn} onClick={() => setStep(1)} className="secondary-btn">
                ← Back
              </button>
              <button style={{ ...s.primaryBtn, flex: 1, justifyContent: "center" }}
                className="primary-btn" onClick={handleCreate} disabled={loading}>
                {loading ? <Spinner size={14} /> : <Plus size={14} />}
                {loading ? "Creating…" : "Create Assignment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// REUSABLE CONFIRM MODAL
// ─────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = true, onConfirm, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", padding: "28px 28px 24px", fontFamily: "'DM Sans', sans-serif" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: danger ? "#fce8e8" : "#e8f3ea", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <AlertCircle size={22} color={danger ? "#e05252" : "#7CA982"} />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#243E36", marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            className="cancel-btn">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            style={{ flex: 1, padding: "11px 0", border: "none", borderRadius: 9, background: danger ? "#e05252" : "#243E36", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            className="confirm-btn">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = {
  primaryBtn:   { background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s", whiteSpace: "nowrap" },
  secondaryBtn: { background: "#fff", color: "#5a7a6e", border: "1px solid #e8f3ea", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", whiteSpace: "nowrap" },
  backBtn:      { background: "none", border: "none", color: "#7CA982", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 },
  sectionBtn:   { padding: "8px 20px", borderRadius: 9, border: "1.5px solid #e8f3ea", background: "#fff", color: "#5a7a6e", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s" },
  sectionBtnActive: { background: "#243E36", borderColor: "#243E36", color: "#fff" },
  expandBtn:    { background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#5a7a6e" },
  errorBox:  { background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 },
  retryBtn:  { background: "none", border: "1px solid #f5c6c6", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#8b2020", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 4 },
  termTabs:      { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  termTab:       { position: "relative", padding: "8px 20px", borderRadius: 9, border: "1.5px solid #e8f3ea", background: "#fff", color: "#5a7a6e", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  termTabActive: { background: "#243E36", borderColor: "#243E36", color: "#fff" },
  termBadge: { position: "absolute", top: -6, right: -6, background: "#e05252", color: "#fff", fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 20px", gap: 10 },
  emptyIcon:  { width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#243E36" },
  emptySub:   { fontSize: 13, color: "#9ab5a0", textAlign: "center", maxWidth: 280, marginBottom: 8 },
  assignCard:   { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 16, alignItems: "flex-start" },
  assignAccent: { width: 4, borderRadius: 99, alignSelf: "stretch", flexShrink: 0, minHeight: 60 },
  assignStat:   { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9ab5a0" },
  statusPill:   { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4 },
  menuBtn:   { background: "none", border: "1px solid #e8f3ea", borderRadius: 7, padding: "5px 7px", cursor: "pointer", display: "flex", alignItems: "center", color: "#9ab5a0" },
  menuDrop:  { position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e8f3ea", borderRadius: 10, boxShadow: "0 8px 24px rgba(36,62,54,0.12)", zIndex: 50, minWidth: 130, overflow: "hidden" },
  menuItem:  { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, color: "#5a7a6e", background: "none", border: "none", cursor: "pointer", width: "100%", fontFamily: "'DM Sans', sans-serif", textAlign: "left" },
  subCard:    { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" },
  miniAvatar: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label:      { fontSize: 13, fontWeight: 600, color: "#243E36" },
  input:      { width: "100%", padding: "10px 14px", borderRadius: 9, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modal:        { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", maxHeight: "92vh", display: "flex", flexDirection: "column" },
  modalHead:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid #e8f3ea", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  modalTitle:   { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" },
  modalClose:   { background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
  @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.35s ease both; }
  .primary-btn:hover     { background: #1a2e28 !important; }
  .secondary-btn:hover   { background: #e8f3ea !important; }
  .back-btn:hover        { color: #243E36 !important; }
  .icon-action-btn:hover { background: #e8f3ea !important; }
  .term-tab:hover        { background: #e8f3ea !important; }
  .menu-item-danger:hover { background: #fce8e8 !important; color: #e05252 !important; }
  .type-select-btn:hover { background: #f8fdf8 !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(36,62,54,0.07); }
  .lms-input:focus { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
  .confirm-btn:hover { opacity: 0.88 !important; }
  .cancel-btn:hover  { background: #e8f3ea !important; }
`;
