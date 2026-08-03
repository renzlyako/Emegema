// src/pages/teacher/CourseLecturesTab.jsx

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Link as LinkIcon, ExternalLink, Edit2, Trash2,
  X, AlertCircle, Loader2, RefreshCw, BookOpen,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  getLectures, createLecture, updateLecture, deleteLecture,
} from "../../services/lectureService";

// ─────────────────────────────────────────────
// LINK PLATFORM DETECTOR
// ─────────────────────────────────────────────
function getLinkPlatform(url = "") {
  if (!url) return { label: "Link", color: "#7c3aed" };
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return { label: "YouTube", color: "#ff0000" };
  if (u.includes("vimeo.com"))       return { label: "Vimeo",       color: "#1ab7ea" };
  if (u.includes("drive.google"))    return { label: "Google Drive", color: "#1a73e8" };
  if (u.includes("docs.google"))     return { label: "Google Docs",  color: "#1a73e8" };
  if (u.includes("onedrive") || u.includes("1drv")) return { label: "OneDrive", color: "#0078d4" };
  return { label: "Link", color: "#7c3aed" };
}

function isValidUrl(val) {
  try { new URL(val); return true; } catch { return false; }
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
      <Loader2 size={20} color="#7CA982" style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT: CourseLecturesTab
// ─────────────────────────────────────────────
export default function CourseLecturesTab({ course, teacherId }) {
  const [lectures, setLectures] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchLectures = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getLectures(course.id);
      setLectures(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [course.id]);

  useEffect(() => { fetchLectures(); }, [fetchLectures]);

  const handleSaved = (lecture) => {
    setLectures(prev => {
      const exists = prev.some(l => l.id === lecture.id);
      return exists ? prev.map(l => l.id === lecture.id ? lecture : l) : [...prev, lecture];
    });
    setShowForm(false);
    setEditing(null);
  };

  const handleDeleted = async () => {
    try {
      await deleteLecture(deleting.id);
      setLectures(prev => prev.filter(l => l.id !== deleting.id));
      setDeleting(null);
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <style>{css}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#243E36" }}>
          {loading ? "Lectures" : `${lectures.length} Lecture${lectures.length !== 1 ? "s" : ""}`}
        </h3>
        <button style={s.primaryBtn} onClick={() => { setEditing(null); setShowForm(true); }} className="primary-btn">
          <Plus size={14} /> Add Lecture
        </button>
      </div>

      {error && (
        <div style={s.errorBanner}>
          <AlertCircle size={16} color="#c0392b" />
          <p style={{ fontSize: 13, color: "#8b2020", flex: 1 }}>{error}</p>
          <button onClick={fetchLectures} style={s.retryBtn}><RefreshCw size={12} /> Retry</button>
        </div>
      )}

      {loading ? <Spinner /> : lectures.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><BookOpen size={28} color="#c8ddc9" /></div>
          <p style={s.emptyTitle}>No lectures yet</p>
          <p style={s.emptySub}>Add a link to a video, slide deck, or reading — students will see it in their Lectures tab.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lectures.map(lec => {
            const platform = getLinkPlatform(lec.link_url);
            return (
              <div key={lec.id} style={{ ...s.row, borderLeft: `4px solid ${platform.color}` }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: platform.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <LinkIcon size={16} color={platform.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36", marginBottom: 2 }}>{lec.title}</p>
                  {lec.description && <p style={{ fontSize: 12, color: "#5a7a6e", lineHeight: 1.5 }}>{lec.description}</p>}
                  <a href={lec.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: platform.color, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4 }}>
                    {platform.label} <ExternalLink size={10} />
                  </a>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button style={s.iconBtn} onClick={() => { setEditing(lec); setShowForm(true); }} className="icon-btn" title="Edit"><Edit2 size={13} /></button>
                  <button style={{ ...s.iconBtn, color: "#e05252" }} onClick={() => setDeleting(lec)} className="icon-btn" title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <LectureFormModal
          courseId={course.id}
          lecture={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          title={deleting.title}
          onClose={() => setDeleting(null)}
          onConfirm={handleDeleted}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ADD / EDIT MODAL
// ─────────────────────────────────────────────
function LectureFormModal({ courseId, lecture, onClose, onSaved }) {
  const isEdit = !!lecture;
  const [title,       setTitle]       = useState(lecture?.title ?? "");
  const [description, setDescription] = useState(lecture?.description ?? "");
  const [linkUrl,      setLinkUrl]     = useState(lecture?.link_url ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const MAX_LECTURES_PER_COURSE = 50;

  const handleSave = async () => {
    if (!title.trim())    { setError("Title is required."); return; }
    if (!linkUrl.trim())  { setError("Link URL is required."); return; }
    if (!isValidUrl(linkUrl.trim())) { setError("Please enter a valid URL (include https://)."); return; }

    if (!isEdit) {
      try {
        const existing = await getLectures(courseId);
        if (existing.length >= MAX_LECTURES_PER_COURSE) {
          setError(`This course has reached the maximum of ${MAX_LECTURES_PER_COURSE} lectures. Consider deleting old ones.`);
          return;
        }
      } catch (e) {
        
      }
    }

    setLoading(true); setError("");
    try {
      const saved = isEdit
        ? await updateLecture(lecture.id, { title: title.trim(), description: description.trim(), linkUrl: linkUrl.trim() })
        : await createLecture({ courseId, title: title.trim(), description: description.trim(), linkUrl: linkUrl.trim() });
      onSaved(saved);
    } catch (e) { setError(e.message); setLoading(false); }
  };

  return createPortal(
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h2 style={s.modalTitle}>{isEdit ? "Edit Lecture" : "Add Lecture"}</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div style={{ background: "#fce8e8", border: "1px solid #e08080", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", display: "flex", gap: 8, alignItems: "center" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={s.label}>Title <span style={{ color: "#e05252" }}>*</span></label>
            <input placeholder="e.g. Lesson 3: Introduction to Networks" value={title} onChange={e => setTitle(e.target.value)} style={s.input} className="lms-input" autoFocus />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={s.label}>Description <span style={{ fontWeight: 400, color: "#9ab5a0" }}>(optional)</span></label>
            <textarea placeholder="Short note about this lecture…" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...s.input, resize: "vertical" }} className="lms-input" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={s.label}>Link URL <span style={{ color: "#e05252" }}>*</span></label>
            <input type="url" placeholder="https://youtube.com/watch?v=…" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} style={s.input} className="lms-input" />
            <p style={{ fontSize: 11, color: "#9ab5a0" }}>Paste a link to a video, slides, PDF, or any other lecture material.</p>
          </div>
          <button type="button" onClick={handleSave} disabled={loading} style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }} className="primary-btn">
            {loading
              ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
              : isEdit ? "Save Changes" : <><Plus size={15} /> Add Lecture</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// DELETE CONFIRM MODAL
// ─────────────────────────────────────────────
function ConfirmDeleteModal({ title, onClose, onConfirm }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <AlertCircle size={22} color="#e05252" />
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#243E36", marginBottom: 8 }}>Delete Lecture</h2>
          <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6, marginBottom: 24 }}>
            Are you sure you want to delete "{title}"? Students will no longer see it. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={s.cancelBtn} className="cancel-btn">Cancel</button>
            <button onClick={onConfirm} style={s.dangerBtn} className="confirm-btn">Delete</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = {
  primaryBtn: { background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 7 },
  errorBanner: { background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  retryBtn: { background: "none", border: "1px solid #f5c6c6", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#8b2020", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: 8, textAlign: "center" },
  emptyIcon: { width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: "#243E36" },
  emptySub: { fontSize: 13, color: "#9ab5a0", maxWidth: 340 },
  row: { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" },
  iconBtn: { background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 7, padding: "6px 9px", cursor: "pointer", display: "flex", alignItems: "center", color: "#5a7a6e" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", maxHeight: "90vh", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e8f3ea" },
  modalTitle: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" },
  modalClose: { background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" },
  label: { fontSize: 13, fontWeight: 600, color: "#243E36" },
  input: { width: "100%", padding: "11px 14px", borderRadius: 9, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
  cancelBtn: { flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  dangerBtn: { flex: 1, padding: "11px 0", border: "none", borderRadius: 9, background: "#e05252", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
};

const css = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .primary-btn:hover { background: #1a2e28 !important; }
  .icon-btn:hover { background: #e8f3ea !important; }
  .cancel-btn:hover { background: #e8f3ea !important; }
  .confirm-btn:hover { opacity: 0.88 !important; }
  .lms-input:focus { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
`;
