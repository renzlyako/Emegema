// src/pages/student/StudentAssessmentsPage.jsx
import { useState, useEffect, useCallback } from "react";
import { BookOpen, Clock, Award, CheckCircle2, AlertCircle, Loader2, RefreshCw, ChevronRight, FileText, CheckSquare, Lock, Play, } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getStudentAssessments } from "../../services/assessmentService";
import StudentAssessmentTaker from "./StudentAssessmentTaker";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatDue(dateStr) {
  if (!dateStr) return null;
  const due  = new Date(dateStr);
  const now  = new Date();
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diff < 0)   return { label: "Overdue",      urgent: true  };
  if (diff === 0) return { label: "Due today",     urgent: true  };
  if (diff === 1) return { label: "Due tomorrow",  urgent: true  };
  return { label: due.toLocaleDateString("en-PH", { month: "short", day: "numeric" }), urgent: false };
}

function Spinner({ size = 20 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
      <Loader2 size={size} color="#7CA982" style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────
export default function StudentAssessmentsPage() {
  const { user } = useAuthStore();
  const [assessments,  setAssessments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filter,       setFilter]       = useState("all"); 
  const [taking,       setTaking]       = useState(null);  

  const fetchAssessments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError(null);
    try {
      const data = await getStudentAssessments(user.id);
      setAssessments(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  
  if (taking) {
    return (
      <StudentAssessmentTaker
        assessment={taking}
        onBack={() => setTaking(null)}
        onDone={() => {
          setTaking(null);
          fetchAssessments(); 
        }}
      />
    );
  }

  const filtered = assessments.filter(a => {
    if (filter === "pending")   return !a.submission;
    if (filter === "completed") return !!a.submission;
    return true;
  });

  const pendingCount   = assessments.filter(a => !a.submission).length;
  const completedCount = assessments.filter(a => !!a.submission).length;

  return (
    <div className="fade-up">
      <style>{css}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={s.pageTitle}>Assessments</h1>
        <p style={s.pageSub}>
          {loading ? "Loading…" : `${pendingCount} pending · ${completedCount} completed`}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={s.filterTabs}>
        {[
          { id: "all",       label: "All",       count: assessments.length },
          { id: "pending",   label: "Pending",   count: pendingCount       },
          { id: "completed", label: "Completed", count: completedCount     },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{ ...s.filterTab, ...(filter === f.id ? s.filterTabActive : {}) }}
            className="filter-tab"
          >
            {f.label}
            {f.count > 0 && (
              <span style={{
                ...s.filterCount,
                background: filter === f.id ? "rgba(255,255,255,0.2)" : "#e8f3ea",
                color:      filter === f.id ? "#fff" : "#5a7a6e",
              }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={s.errorBox}>
          <AlertCircle size={14} color="#c0392b" />
          <span style={{ flex: 1, fontSize: 13, color: "#8b2020" }}>{error}</span>
          <button onClick={fetchAssessments} style={s.retryBtn}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? <Spinner size={24} /> : filtered.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>
            <BookOpen size={28} color="#c8ddc9" />
          </div>
          <p style={s.emptyTitle}>
            {filter === "pending"   ? "No pending assessments" :
             filter === "completed" ? "No completed assessments" :
             "No assessments yet"}
          </p>
          <p style={s.emptySub}>
            {filter === "all" ? "Your teacher hasn't published any assessments yet" : ""}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(a => (
            <AssessmentCard
              key={a.id}
              assessment={a}
              onTake={() => setTaking(a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ASSESSMENT CARD
// ─────────────────────────────────────────────
function AssessmentCard({ assessment: a, onTake }) {
  const due        = a.due_date ? formatDue(a.due_date) : null;
  const submitted  = !!a.submission;
  const graded     = a.submission?.status === "graded";
  const score      = a.submission?.score;
  const maxScore   = a.submission?.max_score;
  const pct        = graded && maxScore ? Math.round((score / maxScore) * 100) : null;

  return (
    <div style={{ ...s.card, borderLeft: `4px solid ${a.type === "quiz" ? "#243E36" : "#8b6ce0"}` }}>
      <div style={{ flex: 1 }}>
        {/* Badges row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ ...s.typeBadge, background: a.type === "quiz" ? "#243E36" : "#8b6ce0" }}>
            {a.type === "quiz" ? "Quiz" : "Written"}
          </span>
          <span style={{ fontSize: 12, color: "#9ab5a0", fontWeight: 500 }}>{a.courseName}</span>
          {due && (
            <span style={{ ...s.dueBadge, background: due.urgent ? "#fce8e8" : "#e8f3ea", color: due.urgent ? "#8b2020" : "#1a5c30" }}>
              <Clock size={10} /> {due.label}
            </span>
          )}
          {submitted && (
            <span style={{ ...s.dueBadge, background: graded ? "#e8f3ea" : "#fff8e1", color: graded ? "#1a5c30" : "#7a5c00" }}>
              {graded ? <CheckCircle2 size={10} /> : <Clock size={10} />}
              {graded ? "Graded" : "Submitted"}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#243E36", marginBottom: 6 }}>{a.title}</h3>
        {a.description && (
          <p style={{ fontSize: 13, color: "#5a7a6e", marginBottom: 8, lineHeight: 1.5 }}>
            {a.description.length > 100 ? a.description.slice(0, 100) + "…" : a.description}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {a.max_points && (
            <div style={s.meta}><Award size={12} color="#9ab5a0" />{a.max_points} pts</div>
          )}
          {a.time_limit && (
            <div style={s.meta}><Clock size={12} color="#9ab5a0" />{a.time_limit} min total</div>
          )}
        </div>
      </div>

      {}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
        {graded && pct !== null ? (
          <div style={{ textAlign: "center" }}>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 28, fontWeight: 800,
              color: pct >= 75 ? "#1a5c30" : "#8b2020",
              lineHeight: 1,
            }}>{pct}%</p>
            <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 2 }}>{score}/{maxScore} pts</p>
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff8e1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>
              <Clock size={20} color="#e0a052" />
            </div>
            <p style={{ fontSize: 11, color: "#9ab5a0" }}>Awaiting grade</p>
          </div>
        ) : (
          <button
            style={s.takeBtn}
            onClick={onTake}
            className="take-btn"
          >
            <Play size={14} /> Take Assessment
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = {
  pageTitle:  { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#243E36", marginBottom: 4 },
  pageSub:    { fontSize: 14, color: "#9ab5a0" },

  filterTabs:      { display: "flex", gap: 8, marginBottom: 20 },
  filterTab:       { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1.5px solid #e8f3ea", background: "#fff", color: "#5a7a6e", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  filterTabActive: { background: "#243E36", color: "#fff", borderColor: "#243E36" },
  filterCount:     { fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99 },

  errorBox:  { background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  retryBtn:  { background: "none", border: "1px solid #f5c6c6", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#8b2020", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 4 },

  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 20px", gap: 10 },
  emptyIcon:  { width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#243E36" },
  emptySub:   { fontSize: 13, color: "#9ab5a0", textAlign: "center" },

  card:     { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "18px 20px", display: "flex", gap: 16, alignItems: "flex-start", transition: "box-shadow 0.2s" },
  typeBadge:{ fontSize: 10, fontWeight: 700, color: "#fff", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em" },
  dueBadge: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 },
  meta:     { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9ab5a0" },

  takeBtn:  { background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s", whiteSpace: "nowrap" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
  @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.4s ease both; }
  .take-btn:hover    { background: #1a2e28 !important; }
  .filter-tab:hover  { background: #e8f3ea !important; }
`;
