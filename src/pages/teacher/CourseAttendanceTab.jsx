// src/pages/teacher/CourseAttendanceTab.jsx

import { useState, useEffect, useCallback } from "react";
import {
  Save, Settings2, X, Plus, Trash2, ChevronDown,
  ChevronUp, Calendar, Loader2, AlertCircle, Check,
} from "lucide-react";
import { supabase } from "../../services/supabase";
import { createPortal } from "react-dom";

// ─────────────────────────────────────────────
// CONSTANTS — PRESETS
// ─────────────────────────────────────────────
const TERM_PRESETS = [
  {
    id: "trimester",
    label: "Trimester (Prelim · Midterm · Finals)",
    terms: [
      { id: "prelim",   label: "Prelim"   },
      { id: "midterm",  label: "Midterm"  },
      { id: "finals",   label: "Finals"   },
    ],
  },
  {
    id: "quarterly",
    label: "Quarterly (1st – 4th Quarter)",
    terms: [
      { id: "q1", label: "1st Quarter" },
      { id: "q2", label: "2nd Quarter" },
      { id: "q3", label: "3rd Quarter" },
      { id: "q4", label: "4th Quarter" },
    ],
  },
  {
    id: "semester",
    label: "Semester (Prelim · Midterm · Pre-Finals · Finals)",
    terms: [
      { id: "prelim",    label: "Prelim"     },
      { id: "midterm",   label: "Midterm"    },
      { id: "prefinals", label: "Pre-Finals" },
      { id: "finals",    label: "Finals"     },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    terms: [],
  },
];

const LEGEND_PRESETS = [
  {
    id: "standard",
    label: "Standard (Present · Late · Absent)",
    legend: [
      { id: "P", label: "Present", value: 1,   color: "#4a7c59" },
      { id: "L", label: "Late",    value: 0.5, color: "#e0a052" },
      { id: "A", label: "Absent",  value: 0,   color: "#e05252" },
    ],
  },
  {
    id: "simple",
    label: "Simple (Present · Absent)",
    legend: [
      { id: "P", label: "Present", value: 1, color: "#4a7c59" },
      { id: "A", label: "Absent",  value: 0, color: "#e05252" },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    legend: [],
  },
];

const DEFAULT_CONFIG = {
  terms: TERM_PRESETS[0].terms,
  legend: LEGEND_PRESETS[0].legend,
};

const COLOR_OPTIONS = [
  "#4a7c59", "#7CA982", "#243E36",
  "#e0a052", "#f0c060", "#e8b84b",
  "#e05252", "#c0392b", "#8b2020",
  "#3b5bdb", "#7c3aed", "#9ab5a0",
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <Loader2
      size={size}
      color="#7CA982"
      style={{ animation: "spin 1s linear infinite" }}
    />
  );
}

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

// ─────────────────────────────────────────────
// CONFIRM MODAL (centered popup, replaces window.confirm)
// ─────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = "Confirm", onConfirm, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", padding: "28px 28px 24px", fontFamily: "'DM Sans', sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <AlertCircle size={22} color="#e05252" />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#243E36", marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }}
            style={{ flex: 1, padding: "11px 0", border: "none", borderRadius: 9, background: "#e05252", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────
export default function CourseAttendanceTab({ course, teacherId }) {
  const [config, setConfig]           = useState(null);
  const [activeTerm, setActiveTerm]   = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showSetup, setShowSetup]     = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");
  const [pendingConfig, setPendingConfig] = useState(null);
  const [isTermDirty, setIsTermDirty] = useState(false);
  const [pendingTermId, setPendingTermId] = useState(null);

  const requestTermChange = (termId) => {
    if (termId === activeTerm) return;
    if (isTermDirty) {
      setPendingTermId(termId);
    } else {
      setActiveTerm(termId);
    }
  };

  // ── Load config from course row ──
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("attendance_config, terms")
        .eq("id", course.id)
        .single();

      if (error) throw error;

      const needsTermsSave = !data.terms || data.terms.length === 0;
      const terms  = needsTermsSave ? DEFAULT_CONFIG.terms : data.terms;
      const legend = data.attendance_config?.legend || DEFAULT_CONFIG.legend;
      const cfg    = { terms, legend };

      // Persist default terms to DB right away, so the student side
      // (which reads courses.terms directly) sees the same terms
      // the teacher is seeing — instead of only living in memory.
      if (needsTermsSave) {
        await supabase
          .from("courses")
          .update({ terms: DEFAULT_CONFIG.terms })
          .eq("id", course.id);
      }

      setConfig(cfg);
      setActiveTerm(cfg.terms?.[0]?.id || null);

    } catch (e) {
      console.error(e);
      setConfig(DEFAULT_CONFIG);
      setActiveTerm(DEFAULT_CONFIG.terms[0].id);
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveConfig = async (newConfig) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({
          terms:             newConfig.terms,
          attendance_config: { legend: newConfig.legend },
        })
        .eq("id", course.id);
      if (error) throw error;

      await supabase
        .from("attendance_records")
        .update({ attendance_data: {} })
        .eq("course_id", course.id);

      setConfig(newConfig);

      const ids = newConfig.terms.map(t => t.id);
      if (!ids.includes(activeTerm)) setActiveTerm(ids[0] || null);
      setSaveMsg("✓ Config saved! Attendance marks were reset.");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (e) {
      setSaveMsg("❌ " + e.message);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#243E36" }}>
            Attendance
          </h3>
          <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 2 }}>
            {config.terms.length} term{config.terms.length !== 1 ? "s" : ""} ·{" "}
            {config.legend.length} status type{config.legend.length !== 1 ? "s" : ""}
          </p>
          <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 2 }}>
            ℹ️ Terms (with start/end dates) are managed from the <strong>Gradebook</strong>. Configure here to set the Legend and sessions per term.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saveMsg && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "6px 14px",
              borderRadius: 8,
              background: saveMsg.startsWith("❌") ? "#fce8e8" : "#e8f3ea",
              color: saveMsg.startsWith("❌") ? "#8b2020" : "#1a5c30",
              border: `1px solid ${saveMsg.startsWith("❌") ? "#f5c6c6" : "#c8ddc9"}`,
            }}>
              {saveMsg}
            </span>
          )}
          <button
            style={{
              ...s.secondaryBtn,
              borderColor: showSetup ? "#243E36" : undefined,
              color: showSetup ? "#243E36" : undefined,
            }}
            onClick={() => setShowSetup(v => !v)}
            className="att-btn"
          >
            <Settings2 size={14} />
            {showSetup ? "Hide Setup" : "Configure Attendance"}
            {showSetup ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* ── Collapsible Setup Panel ── */}
      {showSetup && (
        <AttendanceConfigPanel
          config={config}
          onSave={(newConfig) => setPendingConfig(newConfig)}
          onClose={() => setShowSetup(false)}
        />
      )}

      {pendingConfig && (
        <ConfirmModal
          title="Save Configuration?"
          message="Changing terms or attendance statuses will clear all recorded attendance marks for every term in this course. This cannot be undone."
          confirmLabel="Save & Reset"
          onConfirm={() => { saveConfig(pendingConfig); setShowSetup(false); setPendingConfig(null); }}
          onClose={() => setPendingConfig(null)}
        />
      )}

      {/* ── Term tabs ── */}
      {config.terms.length === 0 ? (
        <div style={s.emptyState}>
          <Calendar size={28} color="#c8ddc9" />
          <p style={{ fontSize: 14, color: "#9ab5a0", marginTop: 12 }}>
            No terms configured yet. Go to the <strong>Gradebook</strong> to set up terms for this course.
          </p>
        </div>
      ) : (
        <>
          <div style={s.termTabs}>
            {config.terms.map(term => (
              <button
                key={term.id}
                onClick={() => requestTermChange(term.id)}
                style={{
                  ...s.termTab,
                  ...(activeTerm === term.id ? s.termTabActive : {}),
                }}
                className="att-term-tab"
              >
                {term.label}
              </button>
            ))}
          </div>

          {activeTerm && (
            <TermAttendancePanel
              key={activeTerm}
              course={course}
              termId={activeTerm}
              termLabel={config.terms.find(t => t.id === activeTerm)?.label}
              legend={config.legend}
              teacherId={teacherId}
              onDirtyChange={setIsTermDirty}
            />
          )}
        </>
      )}

      {pendingTermId && (
        <ConfirmModal
          title="Unsaved Attendance Changes"
          message="You have unsaved changes in this term's attendance. Switching terms now will discard these changes. Are you sure you want to switch?"
          confirmLabel="Discard & Switch"
          onConfirm={() => { setActiveTerm(pendingTermId); setIsTermDirty(false); setPendingTermId(null); }}
          onClose={() => setPendingTermId(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SETUP PANEL
// ─────────────────────────────────────────────
function AttendanceConfigPanel({ config, onSave, onClose }) {
  const [legend, setLegend] = useState(config.legend.map(l => ({ ...l })));
  const [legendPreset, setLegendPreset] = useState("custom");
  const [error, setError] = useState("");

  const applyLegendPreset = (presetId) => {
    setLegendPreset(presetId);
    const preset = LEGEND_PRESETS.find(p => p.id === presetId);
    if (preset && preset.legend.length > 0) {
      setLegend(preset.legend.map(l => ({ ...l })));
    }
  };

  const MAX_LEGEND_ENTRIES = 10;

  const addLegend = () => {
    if (legend.length >= MAX_LEGEND_ENTRIES) return;
    setLegend(prev => [...prev, { id: uid(), label: "", value: 1, color: "#9ab5a0" }]);
    setLegendPreset("custom");
  };

  const removeLegend = (id) => setLegend(prev => prev.filter(l => l.id !== id));

  const updateLegend = (id, field, val) =>
    setLegend(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));

  const handleSave = () => {
    if (legend.length === 0) { setError("Add at least one legend status."); return; }
    if (legend.length > MAX_LEGEND_ENTRIES) { setError(`Maximum of ${MAX_LEGEND_ENTRIES} legend statuses allowed.`); return; }
    if (legend.some(l => !l.label.trim())) { setError("All legend entries need a label."); return; }
    if (legend.some(l => l.value < 0 || l.value > 1)) { setError("Legend values must be between 0 and 1."); return; }
    setError("");
    onSave({ terms: config.terms, legend });
  };

  return (
    <div style={s.setupPanel} className="fade-up">
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 20,
      }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#243E36", display: "flex", alignItems: "center", gap: 8 }}>
            <Settings2 size={16} color="#7CA982" /> Attendance Legend
          </h3>
          <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 3 }}>
            Set up attendance status types for this course. Terms themselves are managed from the <strong>Gradebook</strong>.
          </p>
        </div>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ab5a0" }}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      {error && (
        <div style={s.errorBox}>
          <AlertCircle size={14} color="#c0392b" />
          <span style={{ fontSize: 13, color: "#8b2020" }}>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>

        {/* ── LEGEND ── */}
        <div style={{ maxWidth: 460 }}>
          <div style={s.sectionHead}>
            <span style={s.sectionLabel}>Attendance Legend</span>
          </div>

          {/* Preset picker */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: "#9ab5a0", marginBottom: 8 }}>Quick presets:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LEGEND_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyLegendPreset(p.id)}
                  style={{
                    ...s.presetBtn,
                    borderColor: legendPreset === p.id ? "#7CA982" : "#e8f3ea",
                    background:  legendPreset === p.id ? "#e8f3ea" : "#fff",
                    color:       legendPreset === p.id ? "#243E36" : "#5a7a6e",
                  }}
                  className="att-btn"
                >
                  {legendPreset === p.id && <Check size={12} color="#7CA982" />}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {legend.map(entry => (
              <div key={entry.id} style={s.legendRow}>
                {/* Color picker */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: entry.color,
                    border: "2px solid rgba(0,0,0,0.1)",
                    flexShrink: 0,
                  }} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, width: 80 }}>
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c}
                        onClick={() => updateLegend(entry.id, "color", c)}
                        style={{
                          width: 16, height: 16, borderRadius: "50%",
                          background: c, border: "none", cursor: "pointer",
                          outline: entry.color === c ? "2px solid #243E36" : "none",
                          outlineOffset: 1,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  {/* Label */}
                  <input
                    value={entry.label}
                    onChange={e => { updateLegend(entry.id, "label", e.target.value); setLegendPreset("custom"); }}
                    placeholder="Label (e.g. Present)"
                    style={s.input}
                    className="lms-input"
                  />
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {/* Short code */}
                    <input
                      value={entry.id}
                      onChange={e => updateLegend(entry.id, "id", e.target.value.toUpperCase().slice(0, 3))}
                      placeholder="Code"
                      style={{ ...s.input, width: 60, textAlign: "center", fontWeight: 700 }}
                      className="lms-input"
                    />
                    {/* Value */}
                    <input
                      type="number"
                      min="0" max="1" step="0.1"
                      value={entry.value}
                      onChange={e => updateLegend(entry.id, "value", Number(e.target.value))}
                      placeholder="Value"
                      style={{ ...s.input, width: 70, textAlign: "center" }}
                      className="lms-input"
                    />
                    <span style={{ fontSize: 11, color: "#9ab5a0" }}>pts</span>
                    {legend.length > 1 && (
                      <button
                        onClick={() => removeLegend(entry.id)}
                        style={{ ...s.removeBtn, marginLeft: "auto" }}
                        className="att-btn"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addLegend}
              disabled={legend.length >= MAX_LEGEND_ENTRIES}
              style={{
                ...s.addBtn,
                opacity: legend.length >= MAX_LEGEND_ENTRIES ? 0.5 : 1,
                cursor: legend.length >= MAX_LEGEND_ENTRIES ? "not-allowed" : "pointer",
              }}
              className="att-btn"
            >
              <Plus size={13} />
              {legend.length >= MAX_LEGEND_ENTRIES ? "Max 10 statuses reached" : "Add Status"}
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div style={s.previewBox}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#9ab5a0", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Preview
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {config.terms.map(t => (
            <span key={t.id} style={s.previewTerm}>{t.label || "Untitled"}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {legend.map(l => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 5, background: l.color + "20", border: `1px solid ${l.color}40`, borderRadius: 99, padding: "3px 10px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>{l.id}</span>
              <span style={{ fontSize: 11, color: "#5a7a6e" }}>{l.label} ({l.value})</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={s.secondaryBtn} className="att-btn">Cancel</button>
        <button onClick={handleSave} style={{ ...s.primaryBtn, flex: 1, justifyContent: "center" }} className="att-btn-primary">
          <Save size={14} /> Save Configuration
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TERM ATTENDANCE PANEL
// ─────────────────────────────────────────────
function TermAttendancePanel({ course, termId, termLabel, legend, teacherId, onDirtyChange }) {
  const [students,    setStudents]    = useState([]);
  const [sessions,    setSessions]    = useState([]);
  const [attendance,  setAttendance]  = useState({});
  const [setup,       setSetup]       = useState({ sessionCount: 6 });
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState("");

  // Load term data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Load students
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("student_id, profiles(id, full_name)")
          .eq("course_id", course.id);

        const studs = (enrollments || []).map(e => ({
          id:   e.profiles.id,
          name: e.profiles.full_name,
        }));
        setStudents(studs);

        // Load term attendance record
        const { data: record } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("course_id", course.id)
          .eq("term_id", termId)
          .maybeSingle();

        if (record) {
          setSetup({
            sessionCount: record.session_count || 6,
          });
          setSessions(record.sessions || []);
          setAttendance(record.attendance_data || {});
        } else {
          setSessions(generateSessions(6));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        onDirtyChange?.(false);
      }
    };
    load();
  }, [course.id, termId]);

  const generateSessions = (count) => {
    return Array.from({ length: Number(count) || 6 }, (_, i) => ({
      id:   `session_${i + 1}`,
      date: "",
    }));
  };

  // ADD this function inside TermAttendancePanel, before the return statement:
const handleExport = () => {
  if (students.length === 0 || sessions.length === 0) return;

  const headers = [
    "Student",
    ...sessions.map((sess, i) =>
      sess.date ? sess.date : `Session ${i + 1}`
    ),
    "Attendance Grade (%)",
  ];

  const rows = students.map(student => {
    const sessionMarks = sessions.map(sess => {
      const mark  = attendance[student.id]?.[sess.id];
      const entry = legend.find(l => l.id === mark);
      return entry ? `${entry.id} - ${entry.label}` : "—";
    });
    const grade = getGrade(student.id);
    return [
      student.name,
      ...sessionMarks,
      grade !== null ? `${grade}%` : "—",
    ];
  });

  // Add legend info at the bottom
  const legendInfo = ["", "LEGEND:"];
  legend.forEach(l => {
    legendInfo.push(`${l.id} = ${l.label} (${l.value} pts)`);
  });

  const csv = [headers, ...rows, [], legendInfo]
    .map(row =>
      Array.isArray(row)
        ? row.map(cell => `"${String(cell ?? "—").replace(/"/g, '""')}"`).join(",")
        : `"${row}"`
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `${course.title}_${termLabel}_attendance.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

  const [confirmModal, setConfirmModal] = useState(null);

  const handleSetupSave = () => {
    const hasExistingMarks = Object.keys(attendance).length > 0;
    if (hasExistingMarks) {
      setConfirmModal({
        title: "Reset Attendance?",
        message: "Changing the session setup will clear all attendance marks and dates for this term. This cannot be undone.",
        confirmLabel: "Reset & Apply",
        onConfirm: () => {
          const newSessions = generateSessions(setup.sessionCount);
          setSessions(newSessions);
          setAttendance({});
          onDirtyChange?.(true);
        },
      });
      return;
    }
    const newSessions = generateSessions(setup.sessionCount);
    setSessions(newSessions);
    onDirtyChange?.(true);
  };

  const setMark = (studentId, sessionId, statusId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [sessionId]: statusId,
      },
    }));
    onDirtyChange?.(true);
  };

  const getGrade = (studentId) => {
    const totalSessions = sessions.length;
    if (totalSessions === 0) return null;
    let totalPoints = 0;
    sessions.forEach(sess => {
      const mark    = attendance[studentId]?.[sess.id];
      const entry   = legend.find(l => l.id === mark);
      const maxVal  = Math.max(...legend.map(l => l.value), 1);
      totalPoints  += entry ? (entry.value / maxVal) : 0;
    });
    return Math.round((totalPoints / totalSessions) * 100);
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const payload = {
        course_id:       course.id,
        term_id:         termId,
        teacher_id:      teacherId,
        session_count:   Number(setup.sessionCount),
        sessions,
        attendance_data: attendance,
        updated_at:      new Date().toISOString(),
      };

      // Upsert
      const { error } = await supabase
        .from("attendance_records")
        .upsert(payload, { onConflict: "course_id,term_id" });

      if (error) throw error;
      onDirtyChange?.(false);
      setSaveMsg("✓ Attendance saved!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (e) {
      setSaveMsg("❌ " + e.message);
      setTimeout(() => setSaveMsg(""), 4000);
    } finally {
      setSaving(false);
    }
  };

  const updateSessionDate = (sessionId, date) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, date } : s));
    onDirtyChange?.(true);
  };

  // Find the max value in legend (for grade calculation reference)
  const maxLegendValue = Math.max(...legend.map(l => l.value), 1);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }} className="fade-up">

      {/* ── Term Setup ── */}
      <div style={s.termSetupBox}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Calendar size={15} color="#7CA982" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#243E36" }}>
            {termLabel} Setup
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
         <div style={{ minWidth: 100 }}>
  <label style={s.label}>
    Sessions
    <span style={{ fontSize: 11, color: "#9ab5a0", fontWeight: 400, marginLeft: 4 }}>(1–60)</span>
  </label>
  <input
    type="number" min="1" max="60"
    value={setup.sessionCount}
    onChange={e => setSetup(p => ({ ...p, sessionCount: Math.min(60, Math.max(1, Number(e.target.value))) }))}
    style={{ ...s.input, width: 90, textAlign: "center" }}
    className="lms-input"
  />
  <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 4, maxWidth: 100, lineHeight: 1.4 }}>
    Change then click Apply Setup
  </p>
</div>
        </div>
        <button
          onClick={handleSetupSave}
          style={{ ...s.primaryBtn, marginTop: 14 }}
          className="att-btn-primary"
        >
          <Save size={13} /> Apply Setup
        </button>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#9ab5a0" }}>Legend:</span>
        {legend.map(l => (
          <div key={l.id} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: l.color + "20", border: `1px solid ${l.color}40`,
            borderRadius: 99, padding: "3px 10px",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>{l.id}</span>
            <span style={{ fontSize: 11, color: "#5a7a6e" }}>{l.label} ({l.value})</span>
          </div>
        ))}
        <span style={{ fontSize: 11, color: "#c8ddc9", marginLeft: "auto" }}>
          Grade = total ÷ {sessions.length} sessions × 100
        </span>
      </div>

      {/* ── Attendance Table ── */}
      {students.length === 0 ? (
        <div style={s.emptyState}>
          <p style={{ fontSize: 14, color: "#9ab5a0" }}>No students enrolled yet.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead>
              <tr style={{ background: "#fafcfa" }}>
                <th style={{ ...s.th, minWidth: 160, position: "sticky", left: 0, background: "#fafcfa", zIndex: 2 }}>
                  STUDENT
                </th>
                {sessions.map((sess, i) => (
                  <th key={sess.id} style={{ ...s.th, minWidth: 120, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ab5a0", marginBottom: 4 }}>
                      SESSION {i + 1}
                    </div>
                    <input
                      type="date"
                      value={sess.date}
                      onChange={e => updateSessionDate(sess.id, e.target.value)}
                      style={{
                        fontSize: 11, border: "1px solid #e8f3ea", borderRadius: 6,
                        padding: "3px 6px", fontFamily: "'DM Sans', sans-serif",
                        color: "#243E36", background: "#fff", width: "100%",
                      }}
                      className="lms-input"
                    />
                  </th>
                ))}
                <th style={{ ...s.th, textAlign: "center", minWidth: 80 }}>GRADE</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, si) => {
                const grade = getGrade(student.id);
                return (
                  <tr
                    key={student.id}
                    style={{ borderTop: si > 0 ? "1px solid #e8f3ea" : "none" }}
                  >
                    <td style={{
                      ...s.td, fontWeight: 600,
                      position: "sticky", left: 0, background: "#fff",
                      zIndex: 1, borderRight: "1px solid #e8f3ea",
                    }}>
                      {student.name}
                    </td>
                    {sessions.map(sess => {
                      const mark = attendance[student.id]?.[sess.id];
                      return (
                        <td key={sess.id} style={{ ...s.td, textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                            {legend.map(l => {
                              const isActive = mark === l.id;
                              return (
                                <button
                                  key={l.id}
                                  onClick={() => setMark(student.id, sess.id, l.id)}
                                  title={`${l.label} (${l.value})`}
                                  style={{
                                    width: 28, height: 28, borderRadius: "50%",
                                    border: `2px solid ${isActive ? l.color : "#e8f3ea"}`,
                                    background: isActive ? l.color : "transparent",
                                    color: isActive ? "#fff" : "#c8ddc9",
                                    fontSize: 10, fontWeight: 800,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}
                                  className="att-mark-btn"
                                >
                                  {l.id[0]}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ ...s.td, textAlign: "center" }}>
                      {grade !== null ? (
                        <span style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: 15, fontWeight: 800,
                          color: grade >= 75 ? "#1a5c30" : "#8b2020",
                        }}>
                          {grade}%
                        </span>
                      ) : (
                        <span style={{ color: "#c8ddc9", fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Save button ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 12, alignItems: "center" }}>
  {saveMsg && (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
      background: saveMsg.startsWith("❌") ? "#fce8e8" : "#e8f3ea",
      color: saveMsg.startsWith("❌") ? "#8b2020" : "#1a5c30",
      border: `1px solid ${saveMsg.startsWith("❌") ? "#f5c6c6" : "#c8ddc9"}`,
    }}>
      {saveMsg}
    </span>
  )}
  <button
    onClick={handleExport}
    style={{
      ...s.primaryBtn,
      background: "#fff",
      color: "#243E36",
      border: "1px solid #c8ddc9",
    }}
    className="att-btn"
  >
    ⬇ Export CSV
  </button>
  <button
    onClick={handleSaveAttendance}
    disabled={saving}
    style={s.primaryBtn}
    className="att-btn-primary"
  >
    {saving ? <Spinner size={14} /> : <Save size={14} />}
    Save Attendance
  </button>
</div>

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = {
  primaryBtn:   { background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s", whiteSpace: "nowrap" },
  secondaryBtn: { background: "#fff", color: "#5a7a6e", border: "1px solid #e8f3ea", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", whiteSpace: "nowrap" },
  input:        { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 13, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
  label:        { fontSize: 12, fontWeight: 600, color: "#243E36", display: "block", marginBottom: 5 },
  th:           { textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e8f3ea", whiteSpace: "nowrap" },
  td:           { padding: "10px 14px", fontSize: 13, color: "#243E36", verticalAlign: "middle" },
  setupPanel:   { background: "#fafbff", border: "1.5px solid #c5d3f7", borderRadius: 14, padding: "20px 24px", marginBottom: 20 },
  termSetupBox: { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "16px 20px", marginBottom: 16 },
  termTabs:     { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" },
  termTab:      { padding: "8px 20px", borderRadius: 9, border: "1.5px solid #e8f3ea", background: "#fff", color: "#5a7a6e", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  termTabActive:{ background: "#243E36", borderColor: "#243E36", color: "#fff" },
  sectionHead:  { display: "flex", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#243E36", textTransform: "uppercase", letterSpacing: "0.05em" },
  presetBtn:    { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "1.5px solid", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "all 0.15s" },
  addBtn:       { display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1.5px dashed #c8ddc9", borderRadius: 8, background: "none", fontSize: 12, fontWeight: 600, color: "#7CA982", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 4 },
  removeBtn:    { background: "none", border: "1px solid #f5c6c6", borderRadius: 6, padding: "5px 7px", cursor: "pointer", color: "#e05252", display: "flex", alignItems: "center" },
  termNumBadge: { width: 24, height: 24, borderRadius: "50%", background: "#e8f3ea", color: "#243E36", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  legendRow:    { display: "flex", gap: 10, alignItems: "flex-start", background: "#fafcfa", border: "1px solid #e8f3ea", borderRadius: 10, padding: "10px 12px" },
  previewBox:   { background: "#F1F7ED", border: "1px solid #c8ddc9", borderRadius: 10, padding: "14px 16px", marginTop: 20 },
  previewTerm:  { fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: "#243E36", color: "#fff" },
  errorBox:     { background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 },
  emptyState:   { display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px", gap: 12 },
};

const css = `
  @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.3s ease both; }
  .att-btn:hover         { background: #e8f3ea !important; }
  .att-btn-primary:hover { background: #1a2e28 !important; }
  .att-term-tab:hover    { background: #e8f3ea !important; }
  .att-mark-btn:hover    { opacity: 0.8; transform: scale(1.1); }
  .lms-input:focus       { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
`;