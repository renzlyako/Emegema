// src/pages/teacher/CourseAssessmentsTab.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, ChevronDown, ChevronUp, Trash2, Eye, EyeOff, Send, Clock, Award, FileText, CheckSquare, AlignLeft, Edit3, BookOpen, AlertCircle, Loader2, RefreshCw, CheckCircle2, Lock, Unlock, MoreVertical, ArrowUp, ArrowDown, Copy, Users, Star, Shuffle, Database, Settings2, ToggleLeft, ToggleRight, Info, Download, } from "lucide-react";
import { getCourseAssessments, createAssessment, updateAssessment, publishAssessment, closeAssessment, deleteAssessment, saveQuestions, getAssessmentWithQuestions, getAssessmentSubmissions, gradeSubmission, saveAssessmentAsTemplate, getTeacherTemplates, deleteAssessmentTemplate, applyTemplateToCourse, toggleExamAccess, generateExamAccessCode, } from "../../services/assessmentService";
import { getCourseTerms } from "../../services/courseService";
import { exportSingleStudentDocx, exportAllStudentsDocx } from "../../services/exportService";
import { createPortal } from "react-dom";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice", icon: <CheckSquare size={14} />, color: "#243E36", auto: true  },
  { value: "true_false",      label: "True / False",    icon: <CheckCircle2 size={14} />, color: "#7CA982", auto: true  },
  { value: "fill_blank",      label: "Fill in the Blank",icon: <Edit3 size={14} />,       color: "#4a7c59", auto: true  },
  { value: "short_answer",    label: "Short Answer",    icon: <AlignLeft size={14} />,    color: "#e0a052", auto: false },
  { value: "essay",           label: "Essay",           icon: <FileText size={14} />,     color: "#8b6ce0", auto: false },
];

const DEFAULT_QUESTION = {
  type: "multiple_choice",
  question: "",
  options: ["", "", "", ""],
  correct_answer: "",
  points: 1,
  time_limit_seconds: 30,
  is_pool: true,
};

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
  if (diff < 0)  return "Overdue";
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

// ─────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────
export default function CourseAssessmentsTab({ course, teacherId, onAssessmentChanged, onGraded }) {
  const [assessments,   setAssessments]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [editingId,     setEditingId]     = useState(null);
  const [viewingId,     setViewingId]     = useState(null);
  const [terms,         setTerms]         = useState([]);
  const [activeTerm,    setActiveTerm]    = useState(null);

  const fetchAssessments = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getCourseAssessments(course.id);
      setAssessments(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [course.id]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  useEffect(() => {
    getCourseTerms(course.id)
      .then(t => {
        setTerms(t);
        if (t.length > 0) setActiveTerm(t[0].id);
      })
      .catch(() => {});
  }, [course.id]);

  const filteredAssessments = activeTerm
    ? assessments.filter(a => a.term_id === activeTerm)
    : assessments;

  const pendingByTerm = assessments.reduce((acc, a) => {
    const pending = Math.max(0, (a.totalSubmissions || 0) - (a.gradedSubmissions || 0));
    if (pending > 0) acc[a.term_id] = (acc[a.term_id] || 0) + pending;
    return acc;
  }, {});

  const handlePublish = async (id) => {
    try {
      await publishAssessment(id);
      setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: "published" } : a));
    } catch (e) { alert(e.message); }
  };

  const handleClose = async (id) => {
    try {
      await closeAssessment(id);
      setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: "closed" } : a));
    } catch (e) { alert(e.message); }
  };

  const [confirmModal, setConfirmModal] = useState(null);

  const handleDelete = (id) => {
  setConfirmModal({
    title: "Delete Assessment",
    message: "Are you sure you want to delete this assessment? This cannot be undone.",
    confirmLabel: "Delete Assessment",
    onConfirm: async () => {
      try {
        await deleteAssessment(id);
        setAssessments(prev => prev.filter(a => a.id !== id));
        onAssessmentChanged?.(); 
        onGraded?.(); 
      } catch (e) { alert(e.message); }
    },
  });
};

  const handleCreated = (newAssessment) => {
  setAssessments(prev => [{ ...newAssessment, totalSubmissions: 0, gradedSubmissions: 0 }, ...prev]);
  setShowCreate(false);
  setEditingId(newAssessment.id);
  onAssessmentChanged?.(); // 
  };

  const handleDuplicated = (newAssessment) => {
    setAssessments(prev => [{ ...newAssessment, totalSubmissions: 0, gradedSubmissions: 0 }, ...prev]);
    setShowDuplicate(false);
    setEditingId(newAssessment.id);
    onAssessmentChanged?.();
  };

  const [savingTemplateFor, setSavingTemplateFor] = useState(null);
  const [accessControlFor, setAccessControlFor] = useState(null);

  const handleSaveTemplate = (assessment) => {
    setSavingTemplateFor(assessment);
  };

  const handleSaved = (updated) => {
    setAssessments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    setEditingId(null);
  };

  if (editingId) {
    return (
      <QuestionBuilder
        assessmentId={editingId}
        assessment={assessments.find(a => a.id === editingId)}
        onBack={() => setEditingId(null)}
        onSaved={handleSaved}
      />
    );
  }

  if (viewingId) {
    return (
      <SubmissionsView
        assessment={assessments.find(a => a.id === viewingId)}
        onBack={() => setViewingId(null)}
        onGraded={() => { fetchAssessments(); onGraded?.(); }}
      />
    );
  }



  return (
    <div>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#243E36" }}>
            {loading ? "Assessments" : `${assessments.length} Assessment${assessments.length !== 1 ? "s" : ""}`}
          </h3>
          <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 2 }}>Quizzes and written assessments for this course</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={s.secondaryBtn} onClick={() => setShowDuplicate(true)} className="secondary-btn">
            <Copy size={14} /> Use Template
          </button>
          <button style={s.primaryBtn} onClick={() => setShowCreate(true)} className="primary-btn">
            <Plus size={14} /> New Assessment
          </button>
        </div>
      </div>

      {error && (
        <div style={s.errorBox}>
          <AlertCircle size={14} color="#c0392b" />
          <span style={{ flex: 1, fontSize: 13, color: "#8b2020" }}>{error}</span>
          <button onClick={fetchAssessments} style={s.retryBtn}><RefreshCw size={12} /> Retry</button>
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
      ) : filteredAssessments.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><BookOpen size={28} color="#c8ddc9" /></div>
          <p style={s.emptyTitle}>No assessments yet</p>
          <p style={s.emptySub}>Create your first quiz or written assessment for this course</p>
          <button style={s.primaryBtn} onClick={() => setShowCreate(true)} className="primary-btn">
            <Plus size={14} /> Create Assessment
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAssessments.map(a => (
            <AssessmentCard
              key={a.id}
              assessment={a}
              onEdit={() => setEditingId(a.id)}
              onPublish={() => handlePublish(a.id)}
              onClose={() => handleClose(a.id)}
              onDelete={() => handleDelete(a.id)}
              onViewSubmissions={() => setViewingId(a.id)}
              onSaveTemplate={() => handleSaveTemplate(a)}
              onExamAccess={() => setAccessControlFor(a)}
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
        <CreateAssessmentModal
          courseId={course.id}
          teacherId={teacherId}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {showDuplicate && (
        <UseTemplateModal
          teacherId={teacherId}
          targetCourseId={course.id}
          targetTermId={activeTerm}
          onClose={() => setShowDuplicate(false)}
          onApplied={handleDuplicated}
        />
      )}

      {savingTemplateFor && (
        <SaveAsTemplateModal
          assessment={savingTemplateFor}
          teacherId={teacherId}
          onClose={() => setSavingTemplateFor(null)}
        />
      )}

      {accessControlFor && (
        <ExamAccessModal
          assessment={accessControlFor}
          onClose={() => setAccessControlFor(null)}
          onUpdated={(updated) => {
            setAssessments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
            setAccessControlFor(updated);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: SAVE ASSESSMENT AS TEMPLATE
// ─────────────────────────────────────────────
function SaveAsTemplateModal({ assessment, teacherId, onClose }) {
  const [title,   setTitle]   = useState(assessment.title);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await saveAssessmentAsTemplate(assessment.id, teacherId, title);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h2 style={s.modalTitle}>Save as Template</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CheckCircle2 size={32} color="#7CA982" style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Template saved!</p>
              <p style={{ fontSize: 13, color: "#5a7a6e", marginBottom: 16 }}>
                You can now use it in any course, anytime, even after this course is deleted or archived.
              </p>
              <button style={{ ...s.primaryBtn, width: "100%", justifyContent: "center" }} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              {error && (
                <div style={s.errorBox}>
                  <AlertCircle size={14} color="#c0392b" />
                  <span style={{ fontSize: 13, color: "#8b2020" }}>{error}</span>
                </div>
              )}
              <p style={{ fontSize: 13, color: "#5a7a6e" }}>
                This saves a personal copy of this assessment (including all questions) to your template library — independent of this course. You can reuse it in any course later, even next semester. You can save up to 10 templates.
              </p>
              <div style={s.fieldGroup}>
                <label style={s.label}>Template Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} style={s.input} className="lms-input" autoFocus />
              </div>
              <button style={{ ...s.primaryBtn, width: "100%", justifyContent: "center" }} onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? <Spinner size={14} /> : <Copy size={14} />} Save Template
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// MODAL: USE TEMPLATE 
// ─────────────────────────────────────────────
function UseTemplateModal({ teacherId, targetCourseId, targetTermId, onClose, onApplied }) {
  const [list,     setList]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const loadTemplates = () => {
    setLoading(true);
    getTeacherTemplates(teacherId)
      .then(setList)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTemplates(); }, [teacherId]);

  const filtered = list.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item) => {
    setSelected(item);
    setNewTitle(item.title);
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await deleteAssessmentTemplate(templateId);
      setList(prev => prev.filter(t => t.id !== templateId));
    } catch (e) { setError(e.message); }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      const created = await applyTemplateToCourse({
        templateId: selected.id,
        targetCourseId,
        teacherId,
        newTitle,
        termId: targetTermId,
      });
      onApplied(created);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h2 style={s.modalTitle}>Use Saved Template</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div style={s.errorBox}>
              <AlertCircle size={14} color="#c0392b" />
              <span style={{ fontSize: 13, color: "#8b2020" }}>{error}</span>
            </div>
          )}

          {!selected ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <input
                  placeholder="Search your saved templates…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...s.input, flex: 1 }}
                  className="lms-input"
                  autoFocus
                />
                <span style={{ fontSize: 12, color: "#9ab5a0", marginLeft: 12, whiteSpace: "nowrap" }}>{list.length}/10 saved</span>
              </div>
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Spinner size={20} /></div>
              ) : filtered.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9ab5a0", textAlign: "center", padding: "24px 0" }}>
                  {search ? "No templates match your search." : "You have no saved templates yet. Use \"Save as Template\" on any assessment to add one."}
                </p>
              ) : (
                <div style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  {filtered.map(item => (
                    <div
                      key={item.id}
                      style={{ display: "flex", alignItems: "center", gap: 8, background: "#fafcfa", border: "1px solid #e8f3ea", borderRadius: 10, padding: "12px 14px" }}
                    >
                      <button
                        onClick={() => handleSelect(item)}
                        style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>{item.title}</p>
                        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9ab5a0" }}>
                          <span>From: {item.sourceCourseName}</span>
                          <span>{item.questionCount} question{item.questionCount !== 1 ? "s" : ""}</span>
                          <span>{item.maxPoints} pts</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(item.id)}
                        style={{ ...s.iconActionBtn, color: "#e05252", flexShrink: 0 }}
                        className="icon-action-btn"
                        title="Delete template"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ background: "#e8f3ea", borderRadius: 10, padding: "12px 16px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#1a5c30", textTransform: "uppercase", marginBottom: 4 }}>Applying template</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{selected.title}</p>
                <p style={{ fontSize: 11, color: "#5a7a6e", marginTop: 2 }}>{selected.questionCount} questions</p>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>New Assessment Title</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} style={s.input} className="lms-input" />
              </div>
              <p style={{ fontSize: 12, color: "#9ab5a0" }}>
                This creates a new draft assessment in this course, with all questions and settings copied from the template. You can review and edit it before publishing.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...s.secondaryBtn, flex: 1, justifyContent: "center" }} onClick={() => setSelected(null)} disabled={saving}>
                  ← Back
                </button>
                <button style={{ ...s.primaryBtn, flex: 2, justifyContent: "center" }} onClick={handleConfirm} disabled={saving || !newTitle.trim()}>
                  {saving ? <Spinner size={14} /> : <Copy size={14} />} Apply Template
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  , document.body);
}


// ─────────────────────────────────────────────
// ASSESSMENT CARD
// ─────────────────────────────────────────────
function AssessmentCard({ assessment: a, onEdit, onPublish, onClose, onDelete, onViewSubmissions, onSaveTemplate, onExamAccess }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const statusColor = {
    draft:     { bg: "#f5f5f5",  text: "#666",    label: "Draft"     },
    published: { bg: "#e8f3ea",  text: "#1a5c30", label: "Published" },
    closed:    { bg: "#fce8e8",  text: "#8b2020", label: "Closed"    },
  }[a.status] ?? { bg: "#f5f5f5", text: "#666", label: a.status };

  const hasPool       = a.question_pool_size > 0;
  const hasRandomize  = a.randomize_questions || a.randomize_choices;
  const answersHidden = !a.show_answers_after_submit;

  return (
    <div style={s.assessCard}>
      <div style={{ ...s.assessAccent, background: a.type === "quiz" ? "#243E36" : "#8b6ce0" }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ ...s.typePill, background: a.type === "quiz" ? "#243E36" : "#8b6ce0" }}>
                {a.type === "quiz" ? "Quiz" : "Written"}
              </span>
              <span style={{ ...s.statusPill, background: statusColor.bg, color: statusColor.text }}>
                {statusColor.label}
              </span>
              {hasPool && (
                <span style={{ ...s.statusPill, background: "#e8f0fe", color: "#3b5bdb" }}>
                  <Database size={9} /> Pool: {a.question_pool_size} picked
                </span>
              )}
              {hasRandomize && (
                <span style={{ ...s.statusPill, background: "#f3e8ff", color: "#7c3aed" }}>
                  <Shuffle size={9} /> Randomized
                </span>
              )}
              {/* Answer visibility badge */}
              <span style={{ ...s.statusPill, background: answersHidden ? "#fce8e8" : "#e8f3ea", color: answersHidden ? "#8b2020" : "#1a5c30" }}>
                {answersHidden ? <EyeOff size={9} /> : <Eye size={9} />}
                {answersHidden ? "Answers Hidden" : "Answers Visible"}
              </span>
              {a.due_date && (
                <span style={{ ...s.statusPill, background: "#fff8e1", color: "#7a5c00" }}>
                  <Clock size={10} /> {formatDue(a.due_date)} ({formatExactDate(a.due_date)})
                </span>
              )}
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: "#243E36" }}>{a.title}</h4>
            {a.description && (
              <p style={{ fontSize: 12, color: "#5a7a6e", marginTop: 3, lineHeight: 1.5 }}>
                {a.description.length > 80 ? a.description.slice(0, 80) + "…" : a.description}
              </p>
            )}
          </div>

          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button style={s.menuBtn} onClick={() => setMenuOpen(v => !v)} className="icon-action-btn">
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div style={s.menuDrop} className="menu-drop">
                <button style={s.menuItem} onClick={() => { onEdit(); setMenuOpen(false); }} className="menu-item">
                  <Edit3 size={13} /> Edit Questions
                </button>
                {a.status === "draft" && (
                  <button style={{ ...s.menuItem, color: "#1a5c30" }} onClick={() => { onPublish(); setMenuOpen(false); }} className="menu-item">
                    <Eye size={13} /> Publish
                  </button>
                )}
                {a.status === "published" && (
                  <button style={{ ...s.menuItem, color: "#7a5c00" }} onClick={() => { onClose(); setMenuOpen(false); }} className="menu-item">
                    <Lock size={13} /> Close
                  </button>
                )}
                <button style={s.menuItem} onClick={() => { onSaveTemplate(); setMenuOpen(false); }} className="menu-item">
                  <Copy size={13} /> Save as Template
                </button>
                <button style={{ ...s.menuItem, color: "#e05252" }} onClick={() => { onDelete(); setMenuOpen(false); }} className="menu-item-danger">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={s.assessStat}><Users size={12} color="#9ab5a0" /><span>{a.totalSubmissions} submitted</span></div>
          {a.gradedSubmissions > 0 && (
            <div style={s.assessStat}><Star size={12} color="#9ab5a0" /><span>{a.gradedSubmissions} graded</span></div>
          )}
          {a.max_points && (
            <div style={s.assessStat}><Award size={12} color="#9ab5a0" /><span>{a.max_points} pts</span></div>
          )}
          {a.time_limit && (
            <div style={s.assessStat}><Clock size={12} color="#9ab5a0" /><span>{a.time_limit} min</span></div>
          )}
          <span style={{ fontSize: 11, color: "#c8ddc9", marginLeft: "auto" }}>
            Created {formatExactDate(a.created_at)} · {timeAgo(a.created_at)}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        <button style={s.primaryBtn} onClick={onEdit} className="primary-btn">
          <Edit3 size={13} /> Questions
        </button>
        {a.totalSubmissions > 0 && (
          <button style={s.secondaryBtn} onClick={onViewSubmissions} className="secondary-btn">
            <Users size={13} /> Submissions
          </button>
        )}
        {a.status === "draft" && (
          <button style={{ ...s.secondaryBtn, color: "#1a5c30", borderColor: "#c8ddc9" }} onClick={onPublish} className="secondary-btn">
            <Eye size={13} /> Publish
          </button>
        )}
        {a.status === "published" && (
          <button
            style={{ ...s.secondaryBtn, color: a.access_unlocked ? "#1a5c30" : "#8b2020", borderColor: a.access_unlocked ? "#c8ddc9" : "#f5c6c6" }}
            onClick={onExamAccess}
            className="secondary-btn"
          >
            {a.access_unlocked ? <Unlock size={13} /> : <Lock size={13} />} Exam Access
          </button>
        )}
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────
// QUESTION BUILDER
// ─────────────────────────────────────────────
function QuestionBuilder({ assessmentId, assessment, onBack, onSaved }) {
  const [questions,    setQuestions]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState(null);
  const [expandedIdx,  setExpandedIdx]  = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const [poolSettings, setPoolSettings] = useState({
    randomize_questions:      false,
    randomize_choices:        false,
    question_pool_size:       0,
    show_answers_after_submit: false,
    timeLimitHours:            "",
    timeLimitMins:             "",
    timePerQuestion:           "",
  });

  useEffect(() => {
    getAssessmentWithQuestions(assessmentId)
      .then(data => {
        const totalMins = data.time_limit || 0;
        setPoolSettings({
          randomize_questions:      data.randomize_questions       ?? false,
          randomize_choices:        data.randomize_choices         ?? false,
          question_pool_size:       data.question_pool_size        ?? 0,
          show_answers_after_submit: data.show_answers_after_submit ?? false,
          timeLimitHours:            totalMins > 0 ? Math.floor(totalMins / 60) : "",
          timeLimitMins:             totalMins > 0 ? totalMins % 60 : "",
          timePerQuestion:           data.time_per_question ?? "",
        });

        const qs = data.questions.map(q => ({
          ...q,
          options: q.options || ["", "", "", ""],
          is_pool: q.is_pool !== false,
        }));
        setQuestions(qs.length > 0 ? qs : [{ ...DEFAULT_QUESTION, id: Date.now() }]);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  const addQuestion = (type = "multiple_choice") => {
    const newQ = {
      ...DEFAULT_QUESTION,
      id:      Date.now(),
      type,
      options: type === "true_false" ? ["True", "False"] : ["", "", "", ""],
    };
    setQuestions(prev => [...prev, newQ]);
    setExpandedIdx(questions.length);
  };

  const updateQuestion = (idx, updates) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const removeQuestion = (idx) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    if (expandedIdx >= idx) setExpandedIdx(Math.max(0, expandedIdx - 1));
  };

  const moveQuestion = (idx, dir) => {
    const newQs = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= newQs.length) return;
    [newQs[idx], newQs[target]] = [newQs[target], newQs[idx]];
    setQuestions(newQs);
    setExpandedIdx(target);
  };

  const handleSave = async (andPublish = false) => {
  setSaving(true); setError(null);
  try {
    await saveQuestions(assessmentId, questions);

    const poolSize = Number(poolSettings.question_pool_size) || 0;
    const computedMaxPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

    const timePerQuestion   = poolSettings.timePerQuestion ? Number(poolSettings.timePerQuestion) : null;
    const totalTimeLimitMin = (Number(poolSettings.timeLimitHours) || 0) * 60 + (Number(poolSettings.timeLimitMins) || 0);
    const timeLimit         = !timePerQuestion && totalTimeLimitMin > 0 ? totalTimeLimitMin : null;

    await updateAssessment(assessmentId, {
      randomize_questions:      poolSettings.randomize_questions,
      randomize_choices:        poolSettings.randomize_choices,
      question_pool_size:       poolSize > 0 ? poolSize : null,
      show_answers_after_submit: poolSettings.show_answers_after_submit,
      max_points:                computedMaxPoints,
      time_limit:                timeLimit,
      time_per_question:         timePerQuestion,
    });

      if (andPublish) {
        await publishAssessment(assessmentId);
        onSaved({ id: assessmentId, status: "published", max_points: computedMaxPoints, ...poolSettings });
      } else {
        onSaved({ id: assessmentId, max_points: computedMaxPoints, ...poolSettings });
      }
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const poolQuestions  = questions.filter(q => q.is_pool !== false);
  const totalPoints    = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
  const autoCount      = questions.filter(q => ["multiple_choice", "true_false", "fill_blank"].includes(q.type)).length;
  const manualCount    = questions.filter(q => ["short_answer", "essay"].includes(q.type)).length;
  const anyPoolEnabled = poolSettings.randomize_questions || poolSettings.randomize_choices || poolSettings.question_pool_size > 0;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}><Spinner size={28} /></div>
  );

  return (
    <div className="fade-up">
      <style>{css}</style>

      {/* Header */}
      <div className="qb-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <button style={s.backBtn} onClick={onBack} className="back-btn">← Back to Assessments</button>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#243E36", marginTop: 8 }}>
            {assessment?.title}
          </h2>
          <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#9ab5a0" }}>{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: 12, color: "#9ab5a0" }}>{totalPoints} total points</span>
            <span style={{ fontSize: 12, color: "#7CA982" }}>{autoCount} auto-graded</span>
            {manualCount > 0 && <span style={{ fontSize: 12, color: "#e0a052" }}>{manualCount} manual</span>}
            {poolSettings.question_pool_size > 0 && (
              <span style={{ fontSize: 12, color: "#3b5bdb", fontWeight: 600 }}>
                Pool: {poolSettings.question_pool_size} of {poolQuestions.length} picked per student
              </span>
            )}
            {/* Answer visibility indicator in header */}
            <span style={{ fontSize: 12, fontWeight: 600, color: poolSettings.show_answers_after_submit ? "#1a5c30" : "#8b2020" }}>
              {poolSettings.show_answers_after_submit ? "✓ Answers visible to students" : "✗ Answers hidden from students"}
            </span>
          </div>
        </div>
        <div className="qb-actions" style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...s.secondaryBtn, borderColor: anyPoolEnabled ? "#7c3aed" : undefined, color: anyPoolEnabled ? "#7c3aed" : undefined }}
            onClick={() => setShowSettings(v => !v)}
            className="secondary-btn qb-action-btn"
          >
            <Settings2 size={14} />
            {anyPoolEnabled ? "Pool On" : "Pool / Randomize"}
          </button>
          <button style={s.secondaryBtn} onClick={() => handleSave(false)} disabled={saving} className="secondary-btn qb-action-btn">
            {saving ? <Spinner size={14} /> : null} Save Draft
          </button>
          <button style={s.primaryBtn} onClick={() => handleSave(true)} disabled={saving} className="primary-btn qb-action-btn">
            {saving ? <Spinner size={14} /> : <Send size={14} />} Save & Publish
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...s.errorBox, marginBottom: 16 }}>
          <AlertCircle size={14} color="#c0392b" />
          <span style={{ fontSize: 13, color: "#8b2020" }}>{error}</span>
        </div>
      )}

      {/* Pool / Randomize + Answer Visibility Settings Panel */}
      {showSettings && (
        <PoolSettingsPanel
          settings={poolSettings}
          poolCount={poolQuestions.length}
          totalCount={questions.length}
          onChange={setPoolSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Questions list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {questions.map((q, idx) => (
          <QuestionEditor
            key={q.id ?? idx}
            question={q}
            index={idx}
            total={questions.length}
            expanded={expandedIdx === idx}
            poolEnabled={poolSettings.question_pool_size > 0 || poolSettings.randomize_questions || poolSettings.randomize_choices}
            onToggle={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
            onChange={updates => updateQuestion(idx, updates)}
            onRemove={() => removeQuestion(idx)}
            onMoveUp={() => moveQuestion(idx, -1)}
            onMoveDown={() => moveQuestion(idx, 1)}
          />
        ))}
      </div>

      {/* Add question */}
      <div style={s.addQBox}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#243E36", marginBottom: 12 }}>Add Question</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {QUESTION_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => addQuestion(t.value)}
              style={{ ...s.addQBtn, borderColor: t.color + "50", color: t.color }}
              className="add-q-btn"
            >
              {t.icon} {t.label}
              {t.auto && <span style={{ fontSize: 9, background: t.color + "20", padding: "1px 5px", borderRadius: 99, marginLeft: 2 }}>Auto</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// POOL SETTINGS PANEL 
// ─────────────────────────────────────────────
function PoolSettingsPanel({ settings, poolCount, totalCount, onChange, onClose }) {
  const set = (key, val) => onChange(prev => ({ ...prev, [key]: val }));

  const poolSizeValid = settings.question_pool_size === 0 || settings.question_pool_size <= poolCount;

  return (
    <div style={s.poolPanel} className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#243E36", display: "flex", alignItems: "center", gap: 8 }}>
            <Settings2 size={16} color="#7c3aed" /> Assessment Settings
          </h3>
          <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 3 }}>
            Control randomization, question pools, and what students see after submitting
          </p>
        </div>
        <button style={{ ...s.qIconBtn, border: "none" }} onClick={onClose}><X size={15} /></button>
      </div>

      {/* ── ANSWER VISIBILITY SECTION ── */}
      <div style={s.sectionDivider}>
        <span style={s.sectionLabel}><Eye size={12} /> Answer Visibility</span>
      </div>

      <div style={{
        ...s.answerVisibilityCard,
        borderColor: settings.show_answers_after_submit ? "#7CA982" : "#e05252",
        background:  settings.show_answers_after_submit ? "#f6fbf6" : "#fffafa",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: settings.show_answers_after_submit ? "#e8f3ea" : "#fce8e8",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {settings.show_answers_after_submit
                ? <Eye size={20} color="#1a5c30" />
                : <EyeOff size={20} color="#8b2020" />
              }
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36" }}>
                {settings.show_answers_after_submit ? "Correct Answers Visible" : "Correct Answers Hidden"}
              </p>
              <p style={{ fontSize: 12, color: "#5a7a6e", marginTop: 4, lineHeight: 1.6, maxWidth: 460 }}>
                {settings.show_answers_after_submit
                  ? "Students will see which answers were correct after submitting. Good for self-review, but answers can be photographed and shared."
                  : "Students only see ✓ / ✗ per question and their score — not the correct answers. Recommended to prevent cheating between students."
                }
              </p>
              {!settings.show_answers_after_submit && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, background: "#fce8e8", borderRadius: 7, padding: "5px 10px", width: "fit-content" }}>
                  <Lock size={11} color="#8b2020" />
                  <span style={{ fontSize: 11, color: "#8b2020", fontWeight: 600 }}>Recommended for active assessments</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => set("show_answers_after_submit", !settings.show_answers_after_submit)}
            style={{ background: "none", border: "none", cursor: "pointer", color: settings.show_answers_after_submit ? "#7CA982" : "#e05252", padding: 0, flexShrink: 0 }}
          >
            {settings.show_answers_after_submit
              ? <ToggleRight size={32} />
              : <ToggleLeft size={32} />}
          </button>
        </div>
      </div>

      {/* ── TIMER SECTION ── */}
      <div style={{ ...s.sectionDivider, marginTop: 20 }}>
        <span style={s.sectionLabel}><Clock size={12} /> Timer Settings</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
        <div style={s.settingCard}>
          <label style={{ ...s.label, color: settings.timePerQuestion ? "#c8ddc9" : "#243E36" }}>
            Time Limit (hours + minutes)
            {settings.timePerQuestion && <span style={{ fontSize: 10, color: "#e0a052", marginLeft: 6, fontWeight: 400 }}>disabled — using per-question timer</span>}
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
            <input
              type="number" min="0" max="23" placeholder="0"
              value={settings.timeLimitHours ?? ""}
              onChange={e => set("timeLimitHours", e.target.value)}
              disabled={!!settings.timePerQuestion}
              style={{ ...s.input, background: settings.timePerQuestion ? "#f5f5f5" : "#fff", textAlign: "center" }}
              className="lms-input"
            />
            <span style={{ fontSize: 14, color: "#9ab5a0", fontWeight: 700 }}>:</span>
            <input
              type="number" min="0" max="59" placeholder="0"
              value={settings.timeLimitMins ?? ""}
              onChange={e => set("timeLimitMins", e.target.value)}
              disabled={!!settings.timePerQuestion}
              style={{ ...s.input, background: settings.timePerQuestion ? "#f5f5f5" : "#fff", textAlign: "center" }}
              className="lms-input"
            />
          </div>
          <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 6 }}>Total time for the whole assessment. Leave both blank for no limit.</p>
        </div>

        <div style={s.settingCard}>
          <label style={{ ...s.label, color: (settings.timeLimitHours || settings.timeLimitMins) && !settings.timePerQuestion ? "#c8ddc9" : "#243E36" }}>
            Time per Question (seconds)
            {(settings.timeLimitHours || settings.timeLimitMins) && !settings.timePerQuestion && <span style={{ fontSize: 10, color: "#e0a052", marginLeft: 6, fontWeight: 400 }}>disabled — using overall timer</span>}
          </label>
          <input
            type="number" min="5" max="600" placeholder="e.g. 30"
            value={settings.timePerQuestion ?? ""}
            onChange={e => {
              set("timePerQuestion", e.target.value);
              if (e.target.value) { set("timeLimitHours", ""); set("timeLimitMins", ""); }
            }}
            disabled={!!((settings.timeLimitHours || settings.timeLimitMins) && !settings.timePerQuestion)}
            style={{ ...s.input, marginTop: 6, background: (settings.timeLimitHours || settings.timeLimitMins) && !settings.timePerQuestion ? "#f5f5f5" : "#fff" }}
            className="lms-input"
          />
          <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 6 }}>Per-question countdown. Leave blank for none.</p>
        </div>
      </div>

      {/* ── RANDOMIZATION SECTION ── */}
      <div style={{ ...s.sectionDivider, marginTop: 20 }}>
        <span style={s.sectionLabel}><Shuffle size={12} /> Pool &amp; Randomization</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

        {/* Shuffle question order */}
        <div style={{ ...s.settingCard, borderColor: settings.randomize_questions ? "#7c3aed" : "#e8f3ea" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ ...s.settingIcon, background: settings.randomize_questions ? "#f3e8ff" : "#f5f5f5" }}>
              <Shuffle size={16} color={settings.randomize_questions ? "#7c3aed" : "#9ab5a0"} />
            </div>
            <button
              onClick={() => set("randomize_questions", !settings.randomize_questions)}
              style={{ background: "none", border: "none", cursor: "pointer", color: settings.randomize_questions ? "#7c3aed" : "#c8ddc9", padding: 0 }}
            >
              {settings.randomize_questions ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>Shuffle Question Order</p>
          <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 4, lineHeight: 1.5 }}>
            Each student sees questions in a different random order
          </p>
          <div style={{ ...s.settingBadge, background: settings.randomize_questions ? "#f3e8ff" : "#f5f5f5", color: settings.randomize_questions ? "#7c3aed" : "#9ab5a0" }}>
            {settings.randomize_questions ? "Active" : "Off"}
          </div>
        </div>

        {/* Shuffle answer choices */}
        <div style={{ ...s.settingCard, borderColor: settings.randomize_choices ? "#3b5bdb" : "#e8f3ea" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ ...s.settingIcon, background: settings.randomize_choices ? "#e8f0fe" : "#f5f5f5" }}>
              <Copy size={16} color={settings.randomize_choices ? "#3b5bdb" : "#9ab5a0"} />
            </div>
            <button
              onClick={() => set("randomize_choices", !settings.randomize_choices)}
              style={{ background: "none", border: "none", cursor: "pointer", color: settings.randomize_choices ? "#3b5bdb" : "#c8ddc9", padding: 0 }}
            >
              {settings.randomize_choices ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>Shuffle Answer Choices</p>
          <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 4, lineHeight: 1.5 }}>
            For multiple choice, A/B/C/D order is randomized per student
          </p>
          <div style={{ ...s.settingBadge, background: settings.randomize_choices ? "#e8f0fe" : "#f5f5f5", color: settings.randomize_choices ? "#3b5bdb" : "#9ab5a0" }}>
            {settings.randomize_choices ? "Active" : "Off"}
          </div>
        </div>

        {/* Question bank size */}
        <div style={{ ...s.settingCard, borderColor: settings.question_pool_size > 0 ? "#1a5c30" : "#e8f3ea" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ ...s.settingIcon, background: settings.question_pool_size > 0 ? "#e8f3ea" : "#f5f5f5" }}>
              <Database size={16} color={settings.question_pool_size > 0 ? "#1a5c30" : "#9ab5a0"} />
            </div>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36", marginBottom: 6 }}>Question Bank Size</p>
          <p style={{ fontSize: 12, color: "#9ab5a0", lineHeight: 1.5, marginBottom: 10 }}>
            Pick N questions randomly from the pool. Set 0 to use all.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number" min="0" max={poolCount}
              value={settings.question_pool_size || ""}
              placeholder="0 = all"
              onChange={e => set("question_pool_size", Number(e.target.value))}
              style={{
                ...s.input, width: 80,
                borderColor: !poolSizeValid ? "#e05252" : settings.question_pool_size > 0 ? "#7CA982" : "#c8ddc9",
                textAlign: "center", padding: "8px 10px",
              }}
              className="lms-input"
            />
            <span style={{ fontSize: 12, color: "#9ab5a0" }}>of {poolCount} pool questions</span>
          </div>
          {!poolSizeValid && (
            <p style={{ fontSize: 11, color: "#e05252", marginTop: 6 }}>
              Can't pick {settings.question_pool_size} — only {poolCount} questions are in the pool
            </p>
          )}
        </div>
      </div>

      {/* Info tip */}
      <div style={s.infoBox}>
        <Info size={13} color="#3b5bdb" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: "#3b5bdb", lineHeight: 1.6 }}>
          <strong>How it works:</strong> Mark individual questions as "In Pool" or "Always Show" using the toggle on each question card.
          Pool questions are eligible for random selection. "Always Show" questions appear for every student regardless of pool settings.
          {settings.question_pool_size > 0
            ? ` Each student will receive ${settings.question_pool_size} randomly selected pool question${settings.question_pool_size !== 1 ? "s" : ""}${totalCount - poolCount > 0 ? ` + ${totalCount - poolCount} always-shown question${totalCount - poolCount !== 1 ? "s" : ""}` : ""}.`
            : " Currently using all questions."}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// QUESTION EDITOR 
// ─────────────────────────────────────────────
function QuestionEditor({ question: q, index, total, expanded, poolEnabled, onToggle, onChange, onRemove, onMoveUp, onMoveDown }) {
  const typeInfo = QUESTION_TYPES.find(t => t.value === q.type) ?? QUESTION_TYPES[0];
  const isInPool = q.is_pool !== false;

  const updateOption = (i, val) => {
    const opts = [...(q.options || ["", "", "", ""])];
    opts[i] = val;
    onChange({ options: opts });
  };

  const addOption    = () => onChange({ options: [...(q.options || []), ""] });
  const removeOption = (i) => {
    const opts = (q.options || []).filter((_, idx) => idx !== i);
    onChange({ options: opts });
  };

  return (
    <div style={{ ...s.questionCard, borderLeft: `3px solid ${typeInfo.color}`, opacity: poolEnabled && !isInPool ? 0.85 : 1 }}>
      <div className="q-card-row" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={onToggle}>
        <div style={{ ...s.qNum, background: typeInfo.color }}>{index + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="q-header-badges" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: typeInfo.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {typeInfo.label}
            </span>
            {typeInfo.auto && <span style={{ fontSize: 9, background: typeInfo.color + "20", color: typeInfo.color, padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>Auto-graded</span>}
            <span style={{ fontSize: 10, color: "#9ab5a0", marginLeft: 4 }}>{q.points || 1} pt{(q.points || 1) !== 1 ? "s" : ""}</span>
            {poolEnabled && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                background: isInPool ? "#e8f0fe" : "#f5f5f5",
                color:      isInPool ? "#3b5bdb" : "#9ab5a0",
                border: `1px solid ${isInPool ? "#c5d3f7" : "#e8f3ea"}`,
              }}>
                {isInPool ? "In Pool" : "Always Show"}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: q.question ? "#243E36" : "#c8ddc9", fontWeight: q.question ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {q.question || "Click to edit question…"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {poolEnabled && (
            <button
              title={isInPool ? "In pool — click to always show" : "Always shown — click to add to pool"}
              onClick={() => onChange({ is_pool: !isInPool })}
              style={{
                ...s.qIconBtn,
                borderColor: isInPool ? "#c5d3f7" : "#e8f3ea",
                color:       isInPool ? "#3b5bdb" : "#9ab5a0",
                background:  isInPool ? "#e8f0fe" : "transparent",
                fontSize: 10, fontWeight: 700, gap: 3, padding: "4px 8px",
              }}
              className="q-icon-btn"
            >
              <Database size={11} /> {isInPool ? "Pool" : "Fixed"}
            </button>
          )}
          <button style={s.qIconBtn} onClick={() => onMoveUp()} disabled={index === 0} className="q-icon-btn" title="Move up">
            <ArrowUp size={13} />
          </button>
          <button style={s.qIconBtn} onClick={() => onMoveDown()} disabled={index === total - 1} className="q-icon-btn" title="Move down">
            <ArrowDown size={13} />
          </button>
          <button style={{ ...s.qIconBtn, color: "#e05252" }} onClick={() => onRemove()} className="q-icon-btn" title="Delete">
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={15} color="#9ab5a0" /> : <ChevronDown size={15} color="#9ab5a0" />}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e8f3ea" }}>
          {poolEnabled && (
            <div style={{ ...s.fieldGroup, marginBottom: 16 }}>
              <label style={s.label}>Question Pool Status</label>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => onChange({ is_pool: true })}
                  style={{ ...s.tfBtn, flex: "none", padding: "8px 20px", background: isInPool ? "#3b5bdb" : "#fff", color: isInPool ? "#fff" : "#5a7a6e", borderColor: isInPool ? "#3b5bdb" : "#c8ddc9" }}
                  className="tf-btn">
                  <Database size={14} /> In Pool
                </button>
                <button onClick={() => onChange({ is_pool: false })}
                  style={{ ...s.tfBtn, flex: "none", padding: "8px 20px", background: !isInPool ? "#243E36" : "#fff", color: !isInPool ? "#fff" : "#5a7a6e", borderColor: !isInPool ? "#243E36" : "#c8ddc9" }}
                  className="tf-btn">
                  <Star size={14} /> Always Show
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 4 }}>
                {isInPool
                  ? "This question is in the random pool — students may or may not see it depending on pool size."
                  : "This question will always appear for every student regardless of pool settings."}
              </p>
            </div>
          )}

          <div style={s.fieldGroup}>
            <label style={s.label}>Question Type</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {QUESTION_TYPES.map(t => (
                <button key={t.value}
                  onClick={() => {
                    const newOpts = t.value === "true_false" ? ["True", "False"] : t.value === "multiple_choice" ? ["", "", "", ""] : [];
                    onChange({ type: t.value, options: newOpts, correct_answer: "" });
                  }}
                  style={{ ...s.typeBtn, background: q.type === t.value ? t.color : "transparent", color: q.type === t.value ? "#fff" : t.color, borderColor: t.color }}
                  className="type-btn">
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Question <span style={{ color: "#e05252" }}>*</span></label>
            <textarea
              placeholder={q.type === "fill_blank" ? 'Use ___ for blanks. E.g. "The capital of the Philippines is ___."' : "Enter your question here…"}
              value={q.question} onChange={e => onChange({ question: e.target.value })}
              rows={2} style={{ ...s.input, resize: "vertical" }} className="lms-input" />
          </div>

          {q.type === "multiple_choice" && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Answer Options</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(q.options || []).map((opt, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => onChange({ correct_answer: String(i) })}
                      style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, border: "2px solid", borderColor: q.correct_answer === String(i) ? "#7CA982" : "#c8ddc9", background: q.correct_answer === String(i) ? "#7CA982" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Mark as correct">
                      {q.correct_answer === String(i) && <CheckCircle2 size={14} color="#fff" />}
                    </button>
                    <input placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt}
                      onChange={e => updateOption(i, e.target.value)}
                      style={{ ...s.input, flex: 1 }} className="lms-input" />
                    {(q.options || []).length > 2 && (
                      <button onClick={() => removeOption(i)} style={{ ...s.qIconBtn, flexShrink: 0 }} className="q-icon-btn"><X size={13} /></button>
                    )}
                  </div>
                ))}
                {(q.options || []).length < 6 && (
                  <button onClick={addOption} style={s.addOptBtn} className="add-opt-btn"><Plus size={13} /> Add Option</button>
                )}
              </div>
              <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 4 }}>Click the circle to mark the correct answer</p>
            </div>
          )}

          {q.type === "true_false" && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Correct Answer</label>
              <div style={{ display: "flex", gap: 10 }}>
                {["True", "False"].map(val => (
                  <button key={val} onClick={() => onChange({ correct_answer: val })}
                    style={{ ...s.tfBtn, background: q.correct_answer === val ? "#243E36" : "#fff", color: q.correct_answer === val ? "#fff" : "#243E36", borderColor: q.correct_answer === val ? "#243E36" : "#c8ddc9" }}
                    className="tf-btn">
                    {val === "True" ? <CheckCircle2 size={14} /> : <X size={14} />} {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {q.type === "fill_blank" && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Correct Answer (exact match)</label>
              <input placeholder="e.g. Manila" value={q.correct_answer || ""} onChange={e => onChange({ correct_answer: e.target.value })} style={s.input} className="lms-input" />
              <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 4 }}>Student's answer must match exactly (case-insensitive)</p>
            </div>
          )}

          {q.type === "short_answer" && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Answer Key / Rubric (for your reference)</label>
              <textarea placeholder="Write the expected answer or grading rubric…" value={q.correct_answer || ""} onChange={e => onChange({ correct_answer: e.target.value })} rows={2} style={{ ...s.input, resize: "vertical" }} className="lms-input" />
              <p style={{ fontSize: 11, color: "#e0a052", marginTop: 4 }}>⚠ This question requires manual grading</p>
            </div>
          )}

          {q.type === "essay" && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Rubric / Instructions (optional)</label>
              <textarea placeholder="Describe what you're looking for in the essay…" value={q.correct_answer || ""} onChange={e => onChange({ correct_answer: e.target.value })} rows={3} style={{ ...s.input, resize: "vertical" }} className="lms-input" />
              <p style={{ fontSize: 11, color: "#e0a052", marginTop: 4 }}>⚠ This question requires manual grading</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ ...s.fieldGroup, flex: 1 }}>
              <label style={s.label}>Points</label>
              <input type="number" min="1" max="100" value={q.points || 1} onChange={e => onChange({ points: Number(e.target.value) })} style={s.input} className="lms-input" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnswerReviewModal({ submission, questions, assessment, onClose, onGrade }) {
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const PER_PAGE = 5;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSingleStudentDocx(assessment, questions, submission);
    } catch (e) { alert("Export failed: " + e.message); }
    finally { setExporting(false); }
  };
  const totalPages = Math.ceil(questions.length / PER_PAGE);
  const pageQuestions = questions.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const needsManualGrading = submission.status !== "graded" &&
    questions.some(q => ["short_answer", "essay"].includes(q.type));

  const getOptions = (q) => {
    if (!q.options) return [];
    if (Array.isArray(q.options)) return q.options.map(o => String(o));
    if (typeof q.options === "object") return Object.values(q.options).map(o => String(o));
    try { return JSON.parse(q.options).map(o => String(o)); } catch { return []; }
  };

return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 750, maxHeight: "95vh", width: "95vw" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.modalHead}>
          <div>
            <h2 style={s.modalTitle}>{submission.studentName}'s Answers</h2>
            <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 3 }}>
              {assessment?.title} · {questions.length} questions
              {submission.score != null && ` · Score: ${submission.score}/${submission.max_score}`}
            </p>
          </div>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>

          {/* Score banner */}
          {submission.score != null && (
            <div style={{ background: "#243E36", borderRadius: 12, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 11, color: "rgba(241,247,237,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Final Score</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#7CA982" }}>
                  {submission.score}/{submission.max_score}
                  <span style={{ fontSize: 14, color: "rgba(124,169,130,0.7)", marginLeft: 8 }}>
                    ({Math.round((submission.score / submission.max_score) * 100)}%)
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Page label */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Questions {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, questions.length)} of {questions.length}
            </p>
          </div>

          {/* Questions */}
          {pageQuestions.map((q, idx) => {
            const globalIdx = page * PER_PAGE + idx;
            const typeInfo = QUESTION_TYPES.find(t => t.value === q.type) ?? QUESTION_TYPES[0];
            const isAutoGraded = ["multiple_choice", "true_false", "fill_blank"].includes(q.type);
            const studentAnswer = submission.answers?.[q.id];
            const options = getOptions(q);

            let isCorrect = null;
            if (isAutoGraded && studentAnswer != null) {
              isCorrect = String(studentAnswer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
            }

            return (
              <div key={q.id} style={{ background: "#fff", border: `1px solid #e8f3ea`, borderRadius: 12, borderLeft: `4px solid ${isCorrect === true ? "#7CA982" : isCorrect === false ? "#e05252" : typeInfo.color}` }}>

                {/* Question header */}
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8f3ea", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: typeInfo.color, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {globalIdx + 1}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: typeInfo.color, textTransform: "uppercase" }}>{typeInfo.label}</span>
                      {isAutoGraded
                        ? <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "#e8f3ea", color: "#1a5c30" }}>Auto-graded</span>
                        : <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "#fff8e1", color: "#7a5c00" }}>Manual</span>
                      }
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#243E36", lineHeight: 1.5 }}>{q.question}</p>
                  </div>
                  {isCorrect !== null && (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: isCorrect ? "#e8f3ea" : "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isCorrect ? <CheckCircle2 size={18} color="#1a5c30" /> : <X size={18} color="#e05252" />}
                    </div>
                  )}
                </div>

                {/* Answer options */}
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>

                  {/* MULTIPLE CHOICE */}
                    {q.type === "multiple_choice" && (
  <>
    {studentAnswer == null || studentAnswer === "" ? (
      <div style={{
        padding: "10px 14px", borderRadius: 9, fontSize: 13,
        border: "1.5px solid #e05252", background: "#fce8e8",
        color: "#8b2020", fontWeight: 600,
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
      }}>
        ⚠ Student did not answer this question
      </div>
    ) : null}
    {options.map((opt, i) => {
      const isStudentChoice = String(studentAnswer) === String(i);
      const isCorrectChoice = String(q.correct_answer) === String(i);
      return (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 9, fontSize: 13,
          border: `1.5px solid ${isCorrectChoice ? "#7CA982" : isStudentChoice ? "#e05252" : "#e8f3ea"}`,
          background: isCorrectChoice ? "#e8f3ea" : isStudentChoice ? "#fce8e8" : "#fafcfa",
          color: isCorrectChoice ? "#1a5c30" : isStudentChoice ? "#8b2020" : "#5a7a6e",
          fontWeight: (isStudentChoice || isCorrectChoice) ? 600 : 400,
        }}>
          <span style={{ fontWeight: 700, minWidth: 20 }}>{String.fromCharCode(65 + i)}.</span>
          <span style={{ flex: 1 }}>{opt}</span>
          {isStudentChoice && !isCorrectChoice && <span style={{ fontSize: 10, color: "#e05252", fontWeight: 700 }}>Student's answer</span>}
          {isCorrectChoice && <span style={{ fontSize: 10, color: "#1a5c30", fontWeight: 700 }}>{isStudentChoice ? "✓ Correct!" : "Correct answer"}</span>}
        </div>
      );
    })}
  </>
)}

                  {/* TRUE / FALSE */}
                  {q.type === "true_false" && (studentAnswer == null || studentAnswer === "") && (
                  <div style={{
                  padding: "10px 14px", borderRadius: 9, fontSize: 13,
                  border: "1.5px solid #e05252", background: "#fce8e8",
                  color: "#8b2020", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                  }}>
                  ⚠ Student did not answer this question
                  </div>
                  )}
                  {q.type === "true_false" && ["True", "False"].map((val, i) => {
                    const isStudentChoice = String(studentAnswer) === val || String(studentAnswer) === String(i);
                    const isCorrectChoice = String(q.correct_answer) === val || String(q.correct_answer) === String(i);
                    return (
                      <div key={val} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 9, fontSize: 13,
                        border: `1.5px solid ${isCorrectChoice ? "#7CA982" : isStudentChoice ? "#e05252" : "#e8f3ea"}`,
                        background: isCorrectChoice ? "#e8f3ea" : isStudentChoice ? "#fce8e8" : "#fafcfa",
                        color: isCorrectChoice ? "#1a5c30" : isStudentChoice ? "#8b2020" : "#5a7a6e",
                        fontWeight: (isStudentChoice || isCorrectChoice) ? 600 : 400,
                      }}>
                        <span style={{ flex: 1 }}>{val}</span>
                        {isStudentChoice && !isCorrectChoice && <span style={{ fontSize: 10, color: "#e05252", fontWeight: 700 }}>Student's answer</span>}
                        {isCorrectChoice && <span style={{ fontSize: 10, color: "#1a5c30", fontWeight: 700 }}>{isStudentChoice ? "✓ Correct!" : "Correct answer"}</span>}
                      </div>
                    );
                  })}

                  {/* FILL BLANK / SHORT ANSWER / ESSAY */}
                  {["fill_blank", "short_answer", "essay"].includes(q.type) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ background: "#f8fbf8", border: "1.5px solid #c8ddc9", borderRadius: 9, padding: "12px 14px" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#9ab5a0", marginBottom: 6, textTransform: "uppercase" }}>Student's Answer</p>
                        {studentAnswer
                        ? <p style={{ fontSize: 13, color: "#243E36", lineHeight: 1.7 }}>{studentAnswer}</p>
                        : <p style={{ fontSize: 13, color: "#e05252", fontWeight: 600 }}>⚠ Student did not answer this question</p>
                        }
                      </div>
                      {q.correct_answer && (
                        <div style={{ background: "#e8f3ea", border: "1.5px solid #c8ddc9", borderRadius: 9, padding: "10px 14px" }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#1a5c30", marginBottom: 4 }}>Correct / Expected Answer</p>
                          <p style={{ fontSize: 13, color: "#1a5c30", fontWeight: 600 }}>{q.correct_answer}</p>
                        </div>
                      )}
                      {!isAutoGraded && submission.manual_scores?.[q.id] !== undefined && submission.manual_scores?.[q.id] !== "" && (
                        <div style={{ background: "#243E36", borderRadius: 9, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#F1F7ED" }}>Score You Gave</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#7CA982" }}>{submission.manual_scores[q.id]} / {q.points || 1}</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e8f3ea", display: "flex", flexDirection: "column", gap: 12 }}>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #e8f3ea", background: "#fff", color: page === 0 ? "#c8ddc9" : "#5a7a6e", fontSize: 13, fontWeight: 600, cursor: page === 0 ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  style={{ width: 34, height: 34, borderRadius: 7, border: `1.5px solid ${page === i ? "#243E36" : "#e8f3ea"}`, background: page === i ? "#243E36" : "#fff", color: page === i ? "#fff" : "#5a7a6e", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #e8f3ea", background: "#fff", color: page === totalPages - 1 ? "#c8ddc9" : "#5a7a6e", fontSize: 13, fontWeight: 600, cursor: page === totalPages - 1 ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Next →
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            {needsManualGrading && (
              <button style={{ ...s.primaryBtn, flex: 2, justifyContent: "center" }} onClick={onGrade}>
                <Star size={14} /> Grade This Submission
              </button>
            )}
            <button style={{ ...s.secondaryBtn, flex: 1, justifyContent: "center" }} onClick={handleExport} disabled={exporting}>
              {exporting ? <Spinner size={14} /> : <Download size={14} />} Export to Word
            </button>
            <button style={{ ...s.secondaryBtn, flex: 1, justifyContent: "center" }} onClick={onClose}>Close</button>
          </div>
        </div>

      </div>
    </div>
  ,  document.body);
}

// ─────────────────────────────────────────────
// SUBMISSIONS VIEW 
// ─────────────────────────────────────────────
function SubmissionsView({ assessment, onBack, onGraded }) {
  const [submissions,   setSubmissions]   = useState([]);
  const [questions,     setQuestions]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [grading,       setGrading]       = useState(null);
  const [gradeScore,    setGradeScore]    = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [manualScores,  setManualScores]  = useState({});
  const [saving,        setSaving]        = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [exportingAll,  setExportingAll]  = useState(false);

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      await exportAllStudentsDocx(assessment, questions, submissions);
    } catch (e) { alert("Export failed: " + e.message); }
    finally { setExportingAll(false); }
  };

  useEffect(() => {
    Promise.all([
      getAssessmentSubmissions(assessment.id),
      getAssessmentWithQuestions(assessment.id),
    ]).then(([subs, data]) => {
      setSubmissions(subs);
      setQuestions(data.questions);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [assessment.id]);

const manualQuestions    = questions.filter(q => ["short_answer", "essay"].includes(q.type));
const manualTotal        = manualQuestions.reduce((sum, q) => sum + (Number(manualScores[q.id]) || 0), 0);
const manualQuestionsMax = manualQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
const autoGradedScore    = grading?.auto_score ?? 0;
const finalTotalScore    = autoGradedScore + manualTotal;

const manualScoresValid = manualQuestions.every(q => {
  const val = manualScores[q.id];
  return val !== "" && val !== null && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= (q.points || 1);
});

  const handleGrade = async () => {
  if (!manualScoresValid) {
    alert("Please fill in valid scores for all manually-graded questions.");
    return;
  }
  const finalScore = Math.min(Math.max(0, finalTotalScore), grading.max_score);
  setSaving(true);
  try {
    await gradeSubmission(grading.id, finalScore, gradeFeedback, manualScores);
    setSubmissions(prev => prev.map(s => s.id === grading.id
      ? { ...s, score: finalScore, feedback: gradeFeedback, manual_scores: manualScores, status: "graded" } : s
    ));
    setGrading(null);
    onGraded();
  } catch (e) { alert(e.message); }
  finally { setSaving(false); }
};

  const avgScore = submissions.filter(s => s.score != null).length > 0
    ? Math.round(submissions.filter(s => s.score != null).reduce((sum, s) => sum + (s.score / (s.max_score || 1)) * 100, 0) / submissions.filter(s => s.score != null).length)
    : null;

  return (
    <div className="fade-up">
      <style>{css}</style>
      <button style={s.backBtn} onClick={onBack} className="back-btn">← Back to Assessments</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", margin: "12px 0 20px", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#243E36" }}>{assessment?.title}</h2>
          <p style={{ fontSize: 13, color: "#9ab5a0", marginTop: 4 }}>Submissions · {submissions.length} student{submissions.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {submissions.length > 0 && (
            <button style={s.secondaryBtn} className="secondary-btn" onClick={handleExportAll} disabled={exportingAll}>
              {exportingAll ? <Spinner size={14} /> : <Download size={14} />} Export All (Word)
            </button>
          )}
          {avgScore !== null && (
            <div style={{ background: "#243E36", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "rgba(241,247,237,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Class Average</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#7CA982" }}>{avgScore}%</p>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : submissions.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><Users size={28} color="#c8ddc9" /></div>
          <p style={s.emptyTitle}>No submissions yet</p>
          <p style={s.emptySub}>Students haven't submitted this assessment yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {submissions.map(sub => {
            const pct = sub.score != null ? Math.round((sub.score / (sub.max_score || 1)) * 100) : null;
            return (
              <div key={sub.id} style={s.subCard}>
                <div style={{ ...s.miniAvatar, background: stringToColor(sub.studentName) }}>
                  {getInitials(sub.studentName)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{sub.studentName}</p>
                  <p style={{ fontSize: 11, color: "#9ab5a0" }}>{timeAgo(sub.submitted_at)}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {pct !== null ? (
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: pct >= 75 ? "#1a5c30" : "#8b2020" }}>{pct}%</p>
                      <p style={{ fontSize: 10, color: "#9ab5a0" }}>{sub.score}/{sub.max_score}</p>
                    </div>
                  ) : (
                    <span style={{ ...s.statusPill, background: "#fff8e1", color: "#7a5c00" }}>Needs grading</span>
                  )}
                  <span style={{ ...s.statusPill, background: sub.status === "graded" ? "#e8f3ea" : "#fff8e1", color: sub.status === "graded" ? "#1a5c30" : "#7a5c00" }}>
                    {sub.status}
                  </span>
                  <button style={s.secondaryBtn} className="secondary-btn"
  onClick={() => setViewingSubmission(sub)}>
  <Eye size={13} /> View Answers
</button>
<button style={s.primaryBtn} className="primary-btn"
  onClick={() => {
    setGrading(sub);
    setGradeFeedback(sub.feedback ?? "");
    const manualQs = questions.filter(q => ["short_answer", "essay"].includes(q.type));
    const initScores = {};
    manualQs.forEach(q => { initScores[q.id] = sub.manual_scores?.[q.id] ?? ""; });
    setManualScores(initScores);
  }}>
  <Star size={13} /> {sub.status === "graded" ? "Edit Grade" : "Grade"}
</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    {grading && createPortal(
    <div style={s.modalOverlay} onClick={() => setGrading(null)}>
    <div style={{ ...s.modal, maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h2 style={s.modalTitle}>Grade Submission</h2>
              <button style={s.modalClose} onClick={() => setGrading(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
  <p style={{ fontSize: 13, color: "#5a7a6e" }}><strong>{grading.studentName}</strong> · {assessment?.title}</p>

  {/* Auto-graded score summary */}
  {questions.some(q => ["multiple_choice", "true_false", "fill_blank"].includes(q.type)) && (
  <div style={{ background: "#e8f3ea", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: "#1a5c30" }}>Auto-graded Score (MC / T-F / Fill-blank)</span>
    <span style={{ fontSize: 16, fontWeight: 800, color: "#1a5c30" }}>{grading.score ?? 0} pts</span>
  </div>
  )}

  {/* Per-question manual scoring */}
  {manualQuestions.map((q, i) => {
    const isEssay = q.type === "essay";
    const typeColor = isEssay ? "#8b6ce0" : "#e0a052";
    const typeLabel = isEssay ? "Essay" : "Short Answer";
    const qScore = manualScores[q.id] ?? "";
    const qMax = q.points || 1;
    const overLimit = qScore !== "" && Number(qScore) > qMax;

    return (
      <div key={q.id} style={{
        background: "#F1F7ED", borderRadius: 10, padding: "14px 16px",
        borderLeft: `3px solid ${typeColor}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: typeColor + "20", color: typeColor, textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {typeLabel}
          </span>
          <span style={{ fontSize: 11, color: "#9ab5a0" }}>{qMax} pt{qMax !== 1 ? "s" : ""}</span>
        </div>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#243E36", marginBottom: 6 }}>Q{i + 1}: {q.question}</p>
        <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 8, padding: "10px 12px", marginBottom: q.correct_answer ? 8 : 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ab5a0", marginBottom: 4, textTransform: "uppercase" }}>Student's Answer</p>
          {grading.answers?.[q.id]
            ? <p style={{ fontSize: 13, color: "#243E36", lineHeight: 1.6 }}>{grading.answers[q.id]}</p>
            : <p style={{ fontSize: 13, color: "#e05252", fontWeight: 600 }}>⚠ No answer provided</p>
          }
        </div>
        {q.correct_answer && (
          <p style={{ fontSize: 11, color: "#7CA982", fontWeight: 600, marginBottom: 10 }}>
            {isEssay ? "Rubric / Instructions: " : "Answer Key / Rubric: "}{q.correct_answer}
          </p>
        )}

        {/* Per-question score input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#243E36" }}>Score:</label>
          <input
            type="number" min="0" max={qMax}
            placeholder={`0–${qMax}`}
            value={qScore}
            onChange={e => {
              const val = e.target.value;
              if (val === "") { setManualScores(prev => ({ ...prev, [q.id]: "" })); return; }
              const num = Number(val);
              if (!isNaN(num)) setManualScores(prev => ({ ...prev, [q.id]: Math.min(num, qMax) }));
            }}
            style={{
              width: 70, textAlign: "center", padding: "6px 10px", borderRadius: 7,
              border: `1.5px solid ${overLimit ? "#e05252" : "#c8ddc9"}`,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#243E36", outline: "none",
            }}
            className="lms-input"
          />
          <span style={{ fontSize: 12, color: "#9ab5a0" }}>/ {qMax}</span>
        </div>
      </div>
    );
  })}

  <div style={{ background: "#243E36", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <div>
    <span style={{ fontSize: 13, fontWeight: 700, color: "#F1F7ED" }}>Final Total Score</span>
    <p style={{ fontSize: 11, color: "rgba(241,247,237,0.6)", marginTop: 2 }}>
      Auto-graded ({autoGradedScore}) + Manual ({manualTotal})
    </p>
  </div>
  <span style={{ fontSize: 20, fontWeight: 800, color: "#7CA982" }}>
    {finalTotalScore} / {grading.max_score}
  </span>
</div>

  <div style={s.fieldGroup}>
    <label style={s.label}>Feedback (optional)</label>
    <textarea placeholder="Write feedback for the student…" value={gradeFeedback}
      onChange={e => setGradeFeedback(e.target.value)} rows={3}
      style={{ ...s.input, resize: "vertical" }} className="lms-input" />
  </div>
  <div style={{ display: "flex", gap: 10 }}>
    <button
      style={{
        ...s.primaryBtn, flex: 1, justifyContent: "center",
        opacity: (saving || !manualScoresValid) ? 0.5 : 1,
        cursor: (saving || !manualScoresValid) ? "not-allowed" : "pointer",
      }}
      className="primary-btn"
      onClick={handleGrade}
      disabled={saving || !manualScoresValid}>
      {saving ? <Spinner size={14} /> : <Send size={14} />} Submit Grade
    </button>
    <button style={{ ...s.secondaryBtn, flex: 1, justifyContent: "center" }} className="secondary-btn"
      onClick={() => setGrading(null)}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
  , document.body)}
      
      {viewingSubmission && (
  <AnswerReviewModal
    submission={viewingSubmission}
    questions={questions}
    assessment={assessment}
    onClose={() => setViewingSubmission(null)}
    onGrade={() => {
      setViewingSubmission(null);
      setGrading(viewingSubmission);
      setGradeScore(viewingSubmission.score ?? "");
      setGradeFeedback(viewingSubmission.feedback ?? "");
    }}
  />
)}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: CREATE ASSESSMENT 
// ─────────────────────────────────────────────
function CreateAssessmentModal({ courseId, teacherId, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", description: "", type: "quiz",
    dueDate: "", timeLimit: "", maxPoints: "100",
    timePerQuestion: "",
    show_answers_after_submit: false,
    termId: "",
    timeLimitHours: "",
    timeLimitMins: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
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

  const handleCreate = async () => {
  if (!form.title.trim()) { setError("Title is required."); return; }
  if (!form.termId) { setError("Please select a term."); return; }
  setLoading(true); setError("");
  try {
  const created = await createAssessment({
      courseId,
      teacherId,
      title:                    form.title.trim(),
      description:              form.description.trim(),
      type:                     form.type,
      dueDate:                  form.dueDate        || null,
      timeLimit:                form.timeLimit      ? Number(form.timeLimit)      : null,
      timePerQuestion:          form.timePerQuestion ? Number(form.timePerQuestion) : null,
      maxPoints:                0, // will be auto-calculated once questions are added
      show_answers_after_submit: form.show_answers_after_submit,
      termId:                   form.termId,
    });
    onCreated(created);
  } catch (e) {
    setError(e.message);
    setLoading(false);
  }
};

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h2 style={s.modalTitle}>New Assessment</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
          {error && (
            <div style={s.errorBox}>
              <AlertCircle size={14} color="#c0392b" />
              <span style={{ fontSize: 13, color: "#8b2020" }}>{error}</span>
            </div>
          )}
          <div style={s.fieldGroup}>
            <label style={s.label}>Assessment Type</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#243E36", borderRadius: 12, border: "1.5px solid #243E36" }}>
              <CheckSquare size={20} color="#F1F7ED" />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#F1F7ED" }}>Quiz / Exam</p>
                <p style={{ fontSize: 11, color: "rgba(241,247,237,0.65)", marginTop: 2 }}>Auto & manual grading supported</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 4, lineHeight: 1.5 }}>
              💡 After creating, go to <strong>Gradebook → Setup Gradebook</strong> to categorize this as a Quiz, Exam, or Activity for grade breakdown.
            </p>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Title <span style={{ color: "#e05252" }}>*</span></label>
            <input placeholder="e.g. Chapter 3 Quiz" value={form.title} onChange={e => set("title", e.target.value)} style={s.input} className="lms-input" />
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
            <label style={s.label}>Description (optional)</label>
            <textarea placeholder="Instructions for students…" value={form.description} onChange={e => set("description", e.target.value)} rows={2} style={{ ...s.input, resize: "none" }} className="lms-input" />
          </div>
          <div style={s.fieldGroup}>
          <label style={s.label}>Due Date (optional)</label>
          <input type="datetime-local" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} style={s.input} className="lms-input" />
          </div>
          <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: -8 }}>
           ℹ Max points will be calculated automatically based on the points you assign to each question.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={s.fieldGroup}>
              <label style={{ ...s.label, color: form.timePerQuestion ? "#c8ddc9" : "#243E36" }}>
                Time Limit (hours + minutes)
                {form.timePerQuestion && <span style={{ fontSize: 10, color: "#e0a052", marginLeft: 6, fontWeight: 400 }}>disabled — using per-question timer</span>}
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number" min="0" max="23" placeholder="0"
                    value={form.timeLimitHours ?? ""}
                    onChange={e => {
                      const hrs = e.target.value;
                      set("timeLimitHours", hrs);
                      const totalMins = (Number(hrs) || 0) * 60 + (Number(form.timeLimitMins) || 0);
                      set("timeLimit", totalMins > 0 ? totalMins : "");
                    }}
                    disabled={!!form.timePerQuestion}
                    style={{ ...s.input, background: form.timePerQuestion ? "#f5f5f5" : "#fff", color: form.timePerQuestion ? "#c8ddc9" : "#243E36", cursor: form.timePerQuestion ? "not-allowed" : "text", textAlign: "center" }}
                    className="lms-input"
                  />
                  <p style={{ fontSize: 10, color: "#9ab5a0", marginTop: 3, textAlign: "center" }}>hrs</p>
                </div>
                <span style={{ fontSize: 16, color: "#9ab5a0", fontWeight: 700, marginBottom: 16 }}>:</span>
                <div style={{ flex: 1 }}>
                  <input
                    type="number" min="0" max="59" placeholder="0"
                    value={form.timeLimitMins ?? ""}
                    onChange={e => {
                      const mins = e.target.value;
                      set("timeLimitMins", mins);
                      const totalMins = (Number(form.timeLimitHours) || 0) * 60 + (Number(mins) || 0);
                      set("timeLimit", totalMins > 0 ? totalMins : "");
                    }}
                    disabled={!!form.timePerQuestion}
                    style={{ ...s.input, background: form.timePerQuestion ? "#f5f5f5" : "#fff", color: form.timePerQuestion ? "#c8ddc9" : "#243E36", cursor: form.timePerQuestion ? "not-allowed" : "text", textAlign: "center" }}
                    className="lms-input"
                  />
                  <p style={{ fontSize: 10, color: "#9ab5a0", marginTop: 3, textAlign: "center" }}>min</p>
                </div>
              </div>
              {form.timeLimit && (
                <p style={{ fontSize: 11, color: "#7CA982", marginTop: 2, fontWeight: 600 }}>
                  = {form.timeLimit} minutes total
                  {Number(form.timeLimit) >= 60 && ` (${Math.floor(form.timeLimit/60)}h ${form.timeLimit%60}m)`}
                </p>
              )}
              <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 2 }}>Total time for the whole quiz. Leave both blank for no limit.</p>
            </div>
            <div style={s.fieldGroup}>
              <label style={{ ...s.label, color: form.timeLimit && !form.timePerQuestion ? "#c8ddc9" : "#243E36" }}>
                Time per Question (seconds)
                {form.timeLimit && !form.timePerQuestion && <span style={{ fontSize: 10, color: "#e0a052", marginLeft: 6, fontWeight: 400 }}>disabled — using overall timer</span>}
              </label>
              <input
                type="number" min="5" max="600" placeholder="e.g. 30"
                value={form.timePerQuestion}
                onChange={e => {
                  set("timePerQuestion", e.target.value);
                  if (e.target.value) {
                    set("timeLimit", "");
                    set("timeLimitHours", "");
                    set("timeLimitMins", "");
                  }
                }}
                disabled={!!(form.timeLimit && !form.timePerQuestion)}
                style={{ ...s.input, background: form.timeLimit && !form.timePerQuestion ? "#f5f5f5" : "#fff", color: form.timeLimit && !form.timePerQuestion ? "#c8ddc9" : "#243E36", cursor: form.timeLimit && !form.timePerQuestion ? "not-allowed" : "text" }}
                className="lms-input"
              />
              <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 4 }}>Per-question timer. Leave blank for none.</p>
            </div>
          </div>

          {/* ── Answer Visibility Toggle in Create Modal ── */}
          <div style={{ ...s.answerVisibilityCard, borderColor: form.show_answers_after_submit ? "#7CA982" : "#e05252", background: form.show_answers_after_submit ? "#f6fbf6" : "#fffafa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: form.show_answers_after_submit ? "#e8f3ea" : "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {form.show_answers_after_submit ? <Eye size={17} color="#1a5c30" /> : <EyeOff size={17} color="#8b2020" />}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>
                    Show Correct Answers After Submit
                  </p>
                  <p style={{ fontSize: 12, color: "#5a7a6e", marginTop: 2 }}>
                    {form.show_answers_after_submit
                      ? "Students will see correct answers — good for review but can be shared."
                      : "Students only see score + ✓/✗ — recommended to prevent cheating."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => set("show_answers_after_submit", !form.show_answers_after_submit)}
                style={{ background: "none", border: "none", cursor: "pointer", color: form.show_answers_after_submit ? "#7CA982" : "#e05252", padding: 0, flexShrink: 0 }}>
                {form.show_answers_after_submit ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
              </button>
            </div>
          </div>

          <button style={{ ...s.primaryBtn, width: "100%", justifyContent: "center" }}
            className="primary-btn" onClick={handleCreate} disabled={loading}>
            {loading ? <Spinner size={14} /> : <Plus size={14} />}
            {loading ? "Creating…" : "Create & Add Questions"}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}


function ExamAccessModal({ assessment, onClose, onUpdated }) {
  const [unlocked, setUnlocked] = useState(assessment.access_unlocked ?? false);
  const [code,     setCode]     = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const handleToggle = async () => {
    setSaving(true); setError("");
    try {
      const next = !unlocked;
      await toggleExamAccess(assessment.id, next);
      setUnlocked(next);
      onUpdated({ ...assessment, access_unlocked: next });
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleGenerateCode = async () => {
    setSaving(true); setError("");
    try {
      const newCode = await generateExamAccessCode(assessment.id);
      setCode(newCode);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h2 style={s.modalTitle}>Exam Access Control</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={s.errorBox}>
              <AlertCircle size={14} color="#c0392b" />
              <span style={{ fontSize: 13, color: "#8b2020" }}>{error}</span>
            </div>
          )}

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: unlocked ? "#e8f3ea" : "#fce8e8", borderRadius: 10, padding: "14px 16px",
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {unlocked ? <Unlock size={18} color="#1a5c30" /> : <Lock size={18} color="#8b2020" />}
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>
                  {unlocked ? "Exam is Unlocked" : "Exam is Locked"}
                </p>
                <p style={{ fontSize: 11, color: "#5a7a6e", marginTop: 2 }}>
                  {unlocked ? "Students can attempt entry with the code." : "Students cannot start this exam yet."}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={saving}
              style={{ ...s.primaryBtn, background: unlocked ? "#e05252" : "#243E36" }}
            >
              {unlocked ? "Lock" : "Unlock"}
            </button>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Access Code</label>
            {code ? (
              <div style={{ background: "#243E36", borderRadius: 10, padding: "16px", textAlign: "center" }}>
                <p style={{
                  fontSize: 28, fontWeight: 800, color: "#7CA982", letterSpacing: 4,
                  fontFamily: "'Playfair Display', serif",
                }}>
                  {code}
                </p>
                <p style={{ fontSize: 11, color: "rgba(241,247,237,0.6)", marginTop: 6 }}>
                  ⚠ Note this down now, you won't be able to see it again after the page is refreshed.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#9ab5a0" }}>
                No code yet, or it's no longer visible because the page was refreshed. Generate a new one to see it.
              </p>
            )}
            <button
              onClick={handleGenerateCode}
              disabled={saving}
              style={{ ...s.secondaryBtn, justifyContent: "center" }}
              className="secondary-btn"
            >
              {saving ? <Spinner size={14} /> : <RefreshCw size={14} />} Generate New Code
            </button>
          </div>

          <p style={{ fontSize: 11, color: "#9ab5a0", lineHeight: 1.6 }}>
            💡 Only unlock once students are in the computer lab. Give out the code at the exact time of the exam. 
            Change the code before the next batch to prevent reuse.
          </p>
        </div>
      </div>
    </div>
  , document.body);
}

function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = true, onConfirm, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.85)", zIndex: 999999,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)", padding: "28px 28px 24px",
          fontFamily: "'DM Sans', sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: danger ? "#fce8e8" : "#e8f3ea",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <AlertCircle size={22} color={danger ? "#e05252" : "#7CA982"} />
        </div>
        <h2 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800,
          color: "#243E36", marginBottom: 8,
        }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9,
              background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            style={{
              flex: 1, padding: "11px 0", border: "none", borderRadius: 9,
              background: danger ? "#e05252" : "#243E36", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
            className="confirm-btn"
          >
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
  assessCard:   { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 16, alignItems: "flex-start", overflow: "visible", position: "relative" },
  assessAccent: { width: 4, borderRadius: 99, alignSelf: "stretch", flexShrink: 0, minHeight: 60 },
  assessStat:   { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9ab5a0" },
  typePill:     { fontSize: 10, fontWeight: 700, color: "#fff", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em" },
  statusPill:   { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4 },
  menuBtn:  { background: "none", border: "1px solid #e8f3ea", borderRadius: 7, padding: "5px 7px", cursor: "pointer", display: "flex", alignItems: "center", color: "#9ab5a0" },
  menuDrop: { position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e8f3ea", borderRadius: 10, boxShadow: "0 8px 24px rgba(36,62,54,0.12)", zIndex: 50, minWidth: 160, overflow: "hidden" },
  menuItem: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, color: "#5a7a6e", background: "none", border: "none", cursor: "pointer", width: "100%", fontFamily: "'DM Sans', sans-serif", textAlign: "left" },
  questionCard: { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "14px 16px", transition: "box-shadow 0.2s" },
  qNum:         { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 },
  qIconBtn:     { background: "none", border: "1px solid #e8f3ea", borderRadius: 6, padding: "4px 6px", cursor: "pointer", display: "flex", alignItems: "center", color: "#9ab5a0", transition: "all 0.15s" },
  addQBox:   { background: "#F1F7ED", border: "1.5px dashed #c8ddc9", borderRadius: 12, padding: "16px 20px" },
  addQBtn:   { display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1.5px solid", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  addOptBtn: { display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1.5px dashed #c8ddc9", borderRadius: 8, background: "none", fontSize: 12, color: "#7CA982", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 },
  typeBtn:  { display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1.5px solid", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" },
  tfBtn:    { display: "flex", alignItems: "center", gap: 7, padding: "10px 24px", borderRadius: 9, border: "1.5px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", flex: 1, justifyContent: "center" },
  typeCard: { border: "1.5px solid", borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "center", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" },
  subCard:    { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 },
  miniAvatar: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label:      { fontSize: 13, fontWeight: 600, color: "#243E36" },
  input:      { width: "100%", padding: "10px 14px", borderRadius: 9, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modal: { background: "#fff", borderRadius: 16, width: "95vw", maxWidth: 800, maxHeight: "95vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 24px rgba(36,62,54,0.12)" },
  modalHead:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e8f3ea", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  modalTitle:   { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" },
  modalClose:   { background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" },
  poolPanel:            { background: "#fafbff", border: "1.5px solid #c5d3f7", borderRadius: 14, padding: "20px 24px", marginBottom: 16 },
  settingCard:          { background: "#fff", border: "1.5px solid", borderRadius: 12, padding: "16px", display: "flex", flexDirection: "column", gap: 4, transition: "border-color 0.2s" },
  settingIcon:          { width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" },
  settingBadge:         { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, alignSelf: "flex-start", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.05em" },
  infoBox:              { background: "#e8f0fe", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, marginTop: 14 },
  answerVisibilityCard: { border: "1.5px solid", borderRadius: 12, padding: "16px", transition: "all 0.2s" },
  sectionDivider:       { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionLabel:         { fontSize: 11, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
  @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.35s ease both; }
  .primary-btn:hover      { background: #1a2e28 !important; }
  .secondary-btn:hover    { background: #e8f3ea !important; border-color: #c8ddc9 !important; }
  .back-btn:hover         { color: #243E36 !important; }
  .menu-item:hover        { background: #f5faf5 !important; }
  .menu-item-danger:hover { background: #fce8e8 !important; color: #e05252 !important; }
  .q-icon-btn:hover       { background: #e8f3ea !important; color: #243E36 !important; }
  .add-q-btn:hover        { background: #e8f3ea !important; }
  .add-opt-btn:hover      { background: #e8f3ea !important; }
  .type-card:hover        { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(36,62,54,0.10); }
  .lms-input:focus        { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
  .icon-action-btn:hover  { background: #e8f3ea !important; }
  .term-tab:hover         { background: #e8f3ea !important; }
  .tf-btn:hover           { opacity: 0.85; }
  .confirm-btn:hover { opacity: 0.88 !important; }
  .cancel-btn:hover  { background: #e8f3ea !important; }

  @media (max-width: 700px) {
    /* Save Draft / Save & Publish: ilagay sa sariling row sa ilalim
       ng title, magkatabi (side-by-side) sa halip na magsiksikan */
    .qb-header {
      flex-direction: column;
      align-items: stretch !important;
    }
    .qb-actions {
      width: 100%;
      flex-wrap: wrap;
    }
    .qb-action-btn {
      flex: 1;
      justify-content: center;
      min-width: 0;
    }

    /* Question card: hayaang mag-wrap ang mga badges sa sarili
       nilang linya sa halip na sumiksik kasama ng title */
    .q-card-row {
      align-items: flex-start !important;
    }
    .q-header-badges {
      flex-wrap: wrap;
      row-gap: 4px;
    }
  }
`;
