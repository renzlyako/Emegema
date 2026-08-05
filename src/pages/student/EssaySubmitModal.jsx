// ─────────────────────────────────────────────
// ESSAY SUBMIT MODAL
// ─────────────────────────────────────────────

function EssaySubmitModal({ assignment, studentId, onClose, onSubmitted }) {
  const [answer,   setAnswer]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [existing, setExisting] = useState(null); 

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (!studentId || !assignment?.id) return;
    supabase
      .from("submissions")
      .select("id, essay_answer, status, grade, feedback")
      .eq("assignment_id", assignment.id)
      .eq("student_id", studentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setAnswer(data.essay_answer ?? "");
        }
      });
  }, [assignment?.id, studentId]);

  const handleSubmit = async () => {
    if (!answer.trim()) { setError("Please write your essay before submitting."); return; }
    if (wordCount < 10) { setError("Your essay is too short. Please write at least 10 words."); return; }
    setLoading(true); setError("");

    try {
      if (existing) {
        const { error: err } = await supabase
          .from("submissions")
          .update({ essay_answer: answer.trim(), status: "submitted" })
          .eq("id", existing.id);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase
          .from("submissions")
          .insert({
            assignment_id: assignment.id,
            student_id:    studentId,
            essay_answer:  answer.trim(),
            status:        "submitted",
          });
        if (err) throw new Error(err.message);
      }
      onSubmitted();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const isGraded = existing?.status === "graded";

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      minHeight: "100vh", minWidth: "100vw",
      background: "rgba(0,0,0,0.85)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: 680,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e8f3ea", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#4a7c5918", color: "#4a7c59" }}>
                ✏ Essay Assignment
              </span>
              {isGraded && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f3ea", color: "#1a5c30" }}>
                  Graded: {existing.grade}/{assignment.max_points}
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" }}>
              {assignment.title}
            </h2>
            {assignment.due_date && (
              <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 3 }}>
                Due {new Date(assignment.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center", padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {}
          {assignment.description && (
            <div style={{ background: "#F1F7ED", borderRadius: 10, padding: "14px 16px", borderLeft: "3px solid #7CA982" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#7CA982", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Prompt / Instructions
              </p>
              <p style={{ fontSize: 14, color: "#243E36", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {assignment.description}
              </p>
            </div>
          )}

          {}
          {isGraded && existing.feedback && (
            <div style={{ background: "#e8f3ea", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1a5c30", marginBottom: 6 }}>Teacher's Feedback</p>
              <p style={{ fontSize: 13, color: "#243E36", lineHeight: 1.6 }}>{existing.feedback}</p>
            </div>
          )}

          {}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>
                Your Essay Answer <span style={{ color: "#e05252" }}>*</span>
              </label>
              <span style={{ fontSize: 11, color: wordCount >= 10 ? "#7CA982" : "#9ab5a0", fontWeight: 600 }}>
                {wordCount} word{wordCount !== 1 ? "s" : ""}
              </span>
            </div>
            <textarea
              placeholder="Write your essay here. Be clear, organized, and support your ideas with evidence…"
              value={answer}
              onChange={e => { setAnswer(e.target.value); setError(""); }}
              disabled={isGraded}
              rows={12}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 10,
                border: `1.5px solid ${error ? "#e05252" : "#c8ddc9"}`,
                background: isGraded ? "#fafcfa" : "#fff",
                fontSize: 14, color: "#243E36", outline: "none",
                fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8,
                resize: "vertical", transition: "border-color 0.2s, box-shadow 0.2s",
                boxSizing: "border-box",
              }}
              className="essay-input"
            />
            {error && (
              <p style={{ fontSize: 12, color: "#e05252", display: "flex", alignItems: "center", gap: 5 }}>
                ⚠ {error}
              </p>
            )}
            {!isGraded && (
              <p style={{ fontSize: 11, color: "#9ab5a0" }}>
                Tip: Review your answer before submitting. {existing ? "You can edit and resubmit until the teacher grades it." : ""}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e8f3ea", display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif' " }}
            className="cancel-btn">
            {isGraded ? "Close" : "Cancel"}
          </button>
          {!isGraded && (
            <button onClick={handleSubmit} disabled={loading || !answer.trim()}
              style={{ flex: 2, padding: "11px 0", border: "none", borderRadius: 9, background: loading ? "#4a7c59aa" : "#4a7c59", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}
              className="submit-btn">
              {loading
                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".3"/><path d="M21 12a9 9 0 01-9 9"/></svg> Submitting…</>
                : existing ? "✓ Update Submission" : "✓ Submit Essay"
              }
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .essay-input:focus { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
        .submit-btn:hover:not(:disabled) { background: #3a6448 !important; }
        .cancel-btn:hover { background: #e8f3ea !important; }
      `}</style>
    </div>
  );
}
