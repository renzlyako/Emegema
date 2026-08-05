// src/pages/student/StudentAssessmentTaker.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, XCircle, Award, FileText, AlignLeft, Maximize, Shield, Send, Loader2, EyeOff, } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getAssessmentWithQuestions, getQuestionsForStudent, submitAssessment, sendAssessmentNotifications, getOrCreateAttempt, saveAttemptProgress, completeAttempt, } from "../../services/assessmentService";

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function getTimerMode(assessment) {
  if (assessment.time_per_question > 0) return "per_question";
  if (assessment.time_limit > 0)        return "overall";
  return "none";
}

export default function StudentAssessmentTaker({ assessment, onBack, onDone }) {
  const { user, profile } = useAuthStore();
  const [phase, setPhase] = useState("pre");
  const [result, setResult] = useState(null);
  const [liveAssessment, setLiveAssessment] = useState(assessment);

  const handleStart = (freshAssessment) => {
    if (freshAssessment) setLiveAssessment(freshAssessment);
    setPhase("taking");
  };

  const handleSubmit = (answers, questions, autoSubmitted = false, submissionResult = null) => {
  setPhase("results");
  setResult({ answers, questions, autoSubmitted, submissionResult });
  };

  if (phase === "pre") return <PreScreen assessment={assessment} onStart={handleStart} onBack={onBack} />;
  if (phase === "taking") return <TakingScreen assessment={liveAssessment} studentId={user?.id} onSubmit={handleSubmit} />;
  if (phase === "results") return <ResultsScreen assessment={liveAssessment} result={result} studentId={user?.id} studentName={profile?.full_name ?? "Student"} onDone={onDone} />;
  return null;
}

// ─────────────────────────────────────────────
// PHASE 1: PRE-SCREEN
// ─────────────────────────────────────────────
function PreScreen({ assessment, onStart, onBack }) {
  const [loading,        setLoading]        = useState(true);
  const [questions,      setQuestions]      = useState([]);
  const [error,          setError]          = useState(null);
  const [liveAssessment, setLiveAssessment] = useState(assessment);

  useEffect(() => {
    Promise.all([
      getAssessmentWithQuestions(assessment.id),
      getQuestionsForStudent(assessment.id),
    ])
      .then(([fresh, qs]) => {
        setLiveAssessment(fresh);
        setQuestions(qs);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [assessment.id]);

  const timerMode = getTimerMode(liveAssessment);
  const totalTime = timerMode === "per_question"
    ? (liveAssessment.time_per_question || 30) * questions.length
    : timerMode === "overall"
      ? (liveAssessment.time_limit || 0) * 60
      : 0;

  const mins      = Math.floor(totalTime / 60);
  const secs      = totalTime % 60;
  const hasManual = questions.some(q => ["short_answer", "essay"].includes(q.type));

  return (
    <div style={ps.root}>
      <style>{css}</style>
      <div style={ps.card} className="fade-up">
        <div style={ps.header}>
          <div style={ps.headerIcon}>
            {liveAssessment.type === "quiz"
              ? <CheckCircle2 size={28} color="#7CA982" />
              : <FileText size={28} color="#8b6ce0" />
            }
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ ...ps.typeBadge, background: liveAssessment.type === "quiz" ? "#243E36" : "#8b6ce0" }}>
              {liveAssessment.type === "quiz" ? "Quiz" : "Written Assessment"}
            </span>
            <h1 style={ps.title}>{liveAssessment.title}</h1>
            {liveAssessment.description && <p style={ps.desc}>{liveAssessment.description}</p>}
          </div>
        </div>

        {!loading && (
          <div style={ps.statsRow}>
            <div style={ps.stat}>
              <p style={ps.statNum}>{questions.length}</p>
              <p style={ps.statLabel}>Questions</p>
            </div>
            <div style={ps.statDivider} />
            <div style={ps.stat}>
  <p style={ps.statNum}>
    {timerMode === "none"
      ? "Untimed"
      : timerMode === "per_question"
        ? `${liveAssessment.time_per_question}s`
        : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    }
  </p>
  <p style={ps.statLabel}>
    {timerMode === "per_question" ? "Per Question" : "Total Time"}
  </p>
</div>
            <div style={ps.statDivider} />
            <div style={ps.stat}>
              <p style={ps.statNum}>{liveAssessment.max_points}</p>
              <p style={ps.statLabel}>Max Points</p>
            </div>
          </div>
        )}

        <div style={ps.rulesBox}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Shield size={16} color="#e05252" />
            <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>Assessment Rules</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { icon: <Maximize size={13} />,      text: "The assessment will open in fullscreen mode", color: "#243E36" },
              { icon: <AlertTriangle size={13} />, text: "Exiting fullscreen will immediately auto-submit your answers", color: "#e05252" },
              timerMode === "per_question" && { icon: <Clock size={13} />, text: "Each question has its own countdown timer, when it reaches 0, it auto-advances and cannot be revisited", color: "#e0a052" },
              timerMode === "overall" && { icon: <Clock size={13} />, text: "A single countdown runs for the whole assessment, when it reaches 0, your answers are auto-submitted", color: "#e0a052" },
              timerMode !== "none" && { icon: <ChevronLeft size={13} />, text: "Once you move to the next question, you cannot go back to it", color: "#e05252" },
              { icon: <CheckCircle2 size={13} />,  text: hasManual ? "Some questions require manual grading by your teacher" : "All questions are auto-graded — you'll see your score immediately", color: "#7CA982" },
            ].filter(Boolean).map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ color: r.color, marginTop: 1, flexShrink: 0 }}>{r.icon}</span>
                <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.5 }}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: "#fce8e8", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#8b2020" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button style={ps.backBtn} onClick={onBack} className="back-btn">← Go Back</button>
          <button
            style={{ ...ps.startBtn, opacity: loading ? 0.6 : 1 }}
            onClick={() => onStart(liveAssessment)}
            disabled={loading || !!error}
            className="start-btn"
          >
            {loading
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading…</>
              : <><Maximize size={16} /> Start Assessment</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PHASE 2: TAKING SCREEN
// ─────────────────────────────────────────────
function TakingScreen({ assessment, studentId, onSubmit }) {
  const timerMode = getTimerMode(assessment);
  const [questions,       setQuestions]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [currentIdx,      setCurrentIdx]      = useState(0);
  const [answers,         setAnswers]         = useState({});
  const [timeLeft,        setTimeLeft]        = useState(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [violated,        setViolated]        = useState(false);
  const [lockedQuestions, setLockedQuestions] = useState(new Set());
  const containerRef  = useRef(null);
  const timerRef      = useRef(null);
  const answersRef    = useRef({});
  const questionsRef  = useRef([]);
  const currentIdxRef = useRef(0);
  const submittedRef  = useRef(false);
  const lockedRef     = useRef(new Set());
  const attemptIdRef     = useRef(null);
  const attemptStartRef  = useRef(null);
  const autosaveTimerRef = useRef(null);

  useEffect(() => { answersRef.current    = answers;         }, [answers]);
  useEffect(() => { currentIdxRef.current = currentIdx;      }, [currentIdx]);
  useEffect(() => { lockedRef.current     = lockedQuestions; }, [lockedQuestions]);

  const autoSubmit = useCallback(async (reason = "manual") => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);

    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch (_) {}
    }

    clearInterval(autosaveTimerRef.current);

    setSubmitting(true);
    let submissionResult = null;
    try {
    const result = await submitAssessment(
    assessment.id, studentId, answersRef.current, questionsRef.current
    );
    submissionResult = result;
    await completeAttempt(attemptIdRef.current);
    await sendAssessmentNotifications(
    assessment.id, studentId,
    result.autoScore, result.maxScore, result.status
    );
    } catch (e) { console.error(e); }

    onSubmit(answersRef.current, questionsRef.current, reason === "violation", submissionResult);
    }, [assessment.id, studentId, onSubmit]);

  const lockCurrentAndAdvance = useCallback((fromIdx) => {
    setLockedQuestions(prev => new Set([...prev, fromIdx]));
    lockedRef.current = new Set([...lockedRef.current, fromIdx]);
    const next = fromIdx + 1;
    saveAttemptProgress(attemptIdRef.current, answersRef.current, next);
    if (next < questionsRef.current.length) {
      setCurrentIdx(next);
    } else {
      autoSubmit("timeout");
    }
  }, [autoSubmit]);

  useEffect(() => {
    Promise.all([
      getQuestionsForStudent(assessment.id),
      getOrCreateAttempt(assessment.id, studentId),
    ])
      .then(([qs, attempt]) => {
        setQuestions(qs);
        questionsRef.current = qs;

        attemptIdRef.current = attempt.id;
        attemptStartRef.current = new Date(attempt.started_at);

        if (attempt.answers && Object.keys(attempt.answers).length > 0) {
          setAnswers(attempt.answers);
          answersRef.current = attempt.answers;
        }
        if (attempt.current_index > 0 && attempt.current_index < qs.length) {
          setCurrentIdx(attempt.current_index);
          const restoredLocks = new Set(Array.from({ length: attempt.current_index }, (_, i) => i));
          setLockedQuestions(restoredLocks);
          lockedRef.current = restoredLocks;
        }

        setLoading(false);
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});

        autosaveTimerRef.current = setInterval(() => {
          saveAttemptProgress(attemptIdRef.current, answersRef.current, currentIdxRef.current);
        }, 20000);
      })
      .catch(e => { console.error("Failed to load questions:", e); setLoading(false); });

    const handleFsChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) { setViolated(true); autoSubmit("violation"); }
    };
    const handleVisibility = () => {
      if (document.hidden && !submittedRef.current) { setViolated(true); autoSubmit("violation"); }
    };

    // ── Block browser back button ──
    window.history.pushState({ examGuard: true }, "", window.location.href);
    const handlePopState = () => {
      if (submittedRef.current) return;
      window.history.pushState({ examGuard: true }, "", window.location.href);
      setViolated(true);
      autoSubmit("violation");
    };
    window.addEventListener("popstate", handlePopState);

    // ── Warn on tab close / refresh ──
    const handleBeforeUnload = (e) => {
      if (submittedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(timerRef.current);
      clearInterval(autosaveTimerRef.current);
      document.body.style.overflow = "";
    };
  }, [autoSubmit, assessment.id]);


  useEffect(() => {
    if (loading || questions.length === 0 || timerMode !== "per_question") return;
    const secs = assessment.time_per_question || 30;
    setTimeLeft(secs);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          lockCurrentAndAdvance(currentIdxRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIdx, loading, questions, timerMode, assessment.time_per_question, lockCurrentAndAdvance]);

  useEffect(() => {
    if (loading || questions.length === 0 || timerMode !== "overall") return;
    const totalSecs   = assessment.time_limit * 60;
    const elapsedSecs = attemptStartRef.current
      ? Math.floor((Date.now() - attemptStartRef.current.getTime()) / 1000)
      : 0;
    const remaining = Math.max(0, totalSecs - elapsedSecs);
    setTimeLeft(remaining);
    if (remaining <= 0) { autoSubmit("timeout"); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          autoSubmit("timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    
  }, [loading, questions.length, timerMode]);

  const handleAnswer = (questionId, answer) => setAnswers(prev => ({ ...prev, [questionId]: answer }));

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      if (timerMode === "per_question") {
        lockCurrentAndAdvance(currentIdx);
      } else {
        const next = currentIdx + 1;
        setLockedQuestions(prev => new Set([...prev, currentIdx]));
        saveAttemptProgress(attemptIdRef.current, answersRef.current, next);
        setCurrentIdx(prev => prev + 1);
      }
    } else {
      autoSubmit("manual");
    }
  };

  const handlePrev = () => {
    if (currentIdx === 0) return;
    if (timerMode === "per_question" && lockedQuestions.has(currentIdx - 1)) return;
    setCurrentIdx(prev => prev - 1);
  };

  if (loading) return (
    <div style={ts.loadingScreen}>
      <Loader2 size={40} color="#7CA982" style={{ animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#F1F7ED", marginTop: 16, fontSize: 15 }}>Loading assessment…</p>
    </div>
  );

  if (submitting || violated) return (
    <div style={ts.loadingScreen}>
      <Loader2 size={40} color="#e05252" style={{ animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#F1F7ED", marginTop: 16, fontSize: 15 }}>
        {violated ? "Fullscreen exited — submitting…" : "Submitting…"}
      </p>
    </div>
  );

  const q           = questions[currentIdx];
  const progress    = (currentIdx / questions.length) * 100;
  const isUrgent    = timeLeft !== null && timeLeft <= 10;
  const isLastQ     = currentIdx === questions.length - 1;
  const isPrevLocked = currentIdx === 0 || lockedQuestions.has(currentIdx - 1);

  return (
    <div ref={containerRef} style={ts.root}>
      <style>{css}</style>

      <div style={ts.topBar}>
        <p style={ts.assessTitle}>{assessment.title}</p>
        <div style={ts.progressPills}>
          {questions.map((_, i) => (
            <div key={i} style={{
              ...ts.pill,
              background: i < currentIdx ? "#7CA982" : i === currentIdx ? "#fff" : "rgba(255,255,255,0.2)",
              width: i === currentIdx ? 24 : 8,
            }} />
          ))}
        </div>
        {timerMode !== "none" && (
          <div style={{ ...ts.timer, background: isUrgent ? "#e05252" : "rgba(255,255,255,0.15)", animation: isUrgent ? "pulse 1s ease-in-out infinite" : "none" }}>
            <Clock size={14} color="#fff" />
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans', sans-serif", minWidth: 32 }}>
              {String(Math.floor((timeLeft || 0) / 60)).padStart(2, "0")}:{String((timeLeft || 0) % 60).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      <div style={ts.progressBar}>
        <div style={{ ...ts.progressFill, width: `${progress}%` }} />
      </div>

      <div style={ts.questionArea}>
        <div style={ts.questionCard} className="q-fade">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={ts.qNumber}>{currentIdx + 1}</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Question {currentIdx + 1} of {questions.length}
                </p>
                <p style={{ fontSize: 11, color: "#c8ddc9", marginTop: 2 }}>
                  {q.points || 1} point{(q.points || 1) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {timerMode === "per_question" && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 11, color: isUrgent ? "#e05252" : "#9ab5a0", fontWeight: isUrgent ? 700 : 400 }}>
                  {isUrgent ? "⚠ Hurry up!" : "Time remaining"}
                </p>
                <p style={{ fontSize: 22, fontWeight: 800, color: isUrgent ? "#e05252" : "#243E36", fontFamily: "'Playfair Display', serif" }}>
                  {timeLeft}s
                </p>
              </div>
            )}
          </div>

          <p style={ts.questionText}>{q.question}</p>

          <div style={{ marginTop: 28 }}>
            {q.type === "multiple_choice" && <MultipleChoiceInput question={q} value={answers[q.id] ?? ""} onChange={val => handleAnswer(q.id, val)} />}
            {q.type === "true_false"      && <TrueFalseInput   value={answers[q.id] ?? ""} onChange={val => handleAnswer(q.id, val)} />}
            {q.type === "fill_blank"      && <FillBlankInput    value={answers[q.id] ?? ""} onChange={val => handleAnswer(q.id, val)} />}
            {q.type === "short_answer"    && <ShortAnswerInput  value={answers[q.id] ?? ""} onChange={val => handleAnswer(q.id, val)} />}
            {q.type === "essay"           && <EssayInput        value={answers[q.id] ?? ""} onChange={val => handleAnswer(q.id, val)} />}
          </div>

          <div style={ts.navRow}>
            <button
              style={{ ...ts.navBtn, opacity: isPrevLocked ? 0.3 : 1, cursor: isPrevLocked ? "not-allowed" : "pointer" }}
              onClick={handlePrev}
              disabled={isPrevLocked}
              className="nav-btn"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              style={{ ...ts.nextBtn, background: isLastQ ? "#e05252" : "#243E36" }}
              onClick={handleNext}
              className="next-btn"
            >
              {isLastQ ? <><Send size={15} /> Submit</> : <>Next <ChevronRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ANSWER INPUT COMPONENTS
// ─────────────────────────────────────────────
function MultipleChoiceInput({ question, value, onChange }) {
  const options = question.options || [];
  const letters = ["A", "B", "C", "D", "E", "F"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {options.map((opt, i) => {
        const selected = value === String(i);
        return (
          <button key={i} onClick={() => onChange(String(i))}
            style={{ ...ai.optionBtn, background: selected ? "#243E36" : "#fff", borderColor: selected ? "#243E36" : "#e8f3ea", color: selected ? "#fff" : "#243E36", transform: selected ? "scale(1.01)" : "scale(1)" }}
            className="option-btn"
          >
            <div style={{ ...ai.optionLetter, background: selected ? "rgba(255,255,255,0.2)" : "#e8f3ea", color: selected ? "#fff" : "#7CA982" }}>
              {letters[i]}
            </div>
            <span style={{ fontSize: 14, flex: 1, textAlign: "left" }}>{opt}</span>
            {selected && <CheckCircle2 size={18} color="#7CA982" />}
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      {["True", "False"].map(opt => {
        const selected = value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ ...ai.tfBtn, background: selected ? (opt === "True" ? "#7CA982" : "#e05252") : "#fff", borderColor: selected ? (opt === "True" ? "#7CA982" : "#e05252") : "#e8f3ea", color: selected ? "#fff" : "#243E36" }}
            className="option-btn"
          >
            {opt === "True" ? <CheckCircle2 size={20} color={selected ? "#fff" : "#7CA982"} /> : <XCircle size={20} color={selected ? "#fff" : "#e05252"} />}
            <span style={{ fontSize: 16, fontWeight: 700 }}>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function FillBlankInput({ value, onChange }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: "#9ab5a0", marginBottom: 8 }}>Type your answer below:</p>
      <input type="text" placeholder="Your answer…" value={value} onChange={e => onChange(e.target.value)} style={ai.textInput} className="lms-input" autoFocus />
    </div>
  );
}

function ShortAnswerInput({ value, onChange }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: "#9ab5a0", marginBottom: 8 }}>Write a short answer (2-3 sentences):</p>
      <textarea placeholder="Your answer…" value={value} onChange={e => onChange(e.target.value)} rows={4} style={{ ...ai.textInput, resize: "vertical" }} className="lms-input" autoFocus />
      <p style={{ fontSize: 11, color: "#e0a052", marginTop: 6 }}>⚠ This question will be graded manually by your teacher</p>
    </div>
  );
}

function EssayInput({ value, onChange }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: "#9ab5a0", marginBottom: 8 }}>Write your essay response:</p>
      <textarea placeholder="Your essay response…" value={value} onChange={e => onChange(e.target.value)} rows={8} style={{ ...ai.textInput, resize: "vertical" }} className="lms-input" autoFocus />
      <p style={{ fontSize: 11, color: "#e0a052", marginTop: 6 }}>⚠ This question will be graded manually by your teacher</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// PHASE 3: RESULTS SCREEN
// ─────────────────────────────────────────────
function ResultsScreen({ assessment, result, studentId, studentName, onDone }) {
  const { answers, questions, autoSubmitted, submissionResult } = result;
  const [submitting, setSubmitting] = useState(true);
  const [score,      setScore]      = useState(null);
  const [maxScore,   setMaxScore]   = useState(null);

  const showAnswers = assessment?.show_answers_after_submit === true;

  useEffect(() => {
    
    if (submissionResult) {
      setScore(submissionResult.autoScore);
      setMaxScore(submissionResult.maxScore);
      setSubmitting(false);
      return;
    }
    
    let s = 0, ms = 0;
    questions.forEach(q => {
      ms += q.points || 1;
      if (["multiple_choice", "true_false", "fill_blank"].includes(q.type)) {
        const ans = (answers[q.id] || "").toString().trim().toLowerCase();
        const cor = (q.correct_answer || "").toString().trim().toLowerCase();
        if (ans === cor) s += q.points || 1;
      }
    });
    setScore(s);
    setMaxScore(ms);
    setSubmitting(false);
  }, []);

  const hasManual = questions.some(q => ["short_answer", "essay"].includes(q.type));
  const autoOnly  = questions.filter(q => ["multiple_choice", "true_false", "fill_blank"].includes(q.type));
  const pct       = maxScore > 0 ? Math.round(((score ?? 0) / maxScore) * 100) : 0;
  const passed    = pct >= 75;

  const getGradeLabel = () => {
    if (pct >= 95) return { label: "Excellent!",       color: "#1a5c30" };
    if (pct >= 85) return { label: "Great job!",       color: "#7CA982" };
    if (pct >= 75) return { label: "Good work!",       color: "#4a7c59" };
    if (pct >= 60) return { label: "Keep trying!",     color: "#e0a052" };
    return               { label: "Need improvement", color: "#e05252" };
  };
  const grade = getGradeLabel();

  if (submitting) return (
    <div style={rs.root}>
      <style>{css}</style>
      <div style={rs.card} className="fade-up">
        <Loader2 size={40} color="#7CA982" style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
        <p style={{ fontSize: 15, color: "#5a7a6e" }}>Saving your answers…</p>
      </div>
    </div>
  );

  return (
    <div style={rs.root}>
      <style>{css}</style>
      <div style={rs.card} className="fade-up">

        {autoSubmitted && (
          <div style={rs.violationBanner}>
            <AlertTriangle size={16} color="#8b2020" />
            <p style={{ fontSize: 13, color: "#8b2020" }}>Assessment was auto-submitted because you exited fullscreen.</p>
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ ...rs.scoreCircle, borderColor: passed ? "#7CA982" : "#e05252" }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: passed ? "#7CA982" : "#e05252", lineHeight: 1 }}>
              {hasManual && autoOnly.length === 0 ? "—" : `${pct}%`}
            </p>
            {!hasManual && <p style={{ fontSize: 13, color: "#9ab5a0", marginTop: 4 }}>{score}/{maxScore} pts</p>}
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: grade.color, marginTop: 16, marginBottom: 4 }}>
            {hasManual && autoOnly.length === 0 ? "Submitted!" : grade.label}
          </h2>
          <p style={{ fontSize: 14, color: "#5a7a6e" }}>
            {hasManual
              ? "Some questions require manual grading. Your teacher will review and post your final score soon."
              : `You answered ${autoOnly.filter(q => {
                  const ans = (answers[q.id] || "").toString().trim().toLowerCase();
                  const cor = (q.correct_answer || "").toString().trim().toLowerCase();
                  return ans === cor;
                }).length} out of ${autoOnly.length} questions correctly.`
            }
          </p>
        </div>

        {autoOnly.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>Question Review</p>
              {!showAnswers && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#fce8e8", borderRadius: 7, padding: "4px 10px" }}>
                  <EyeOff size={11} color="#8b2020" />
                  <span style={{ fontSize: 11, color: "#8b2020", fontWeight: 600 }}>Correct answers hidden</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {questions.map((q, i) => {
                const isAuto  = ["multiple_choice", "true_false", "fill_blank"].includes(q.type);
                const ans     = answers[q.id] ?? "";
                const correct = q.correct_answer ?? "";
                const isRight = isAuto && ans.toString().trim().toLowerCase() === correct.toString().trim().toLowerCase();
                const displayAns     = q.type === "multiple_choice" ? (q.options || [])[Number(ans)]     ?? "No answer" : ans || "No answer";
                const displayCorrect = q.type === "multiple_choice" ? (q.options || [])[Number(correct)] ?? correct     : correct;
                const borderColor = isAuto ? (isRight ? "#7CA982" : "#e05252") : "#e0a052";
                const rowIcon = isAuto
                  ? isRight ? <CheckCircle2 size={14} color="#7CA982" /> : <XCircle size={14} color="#e05252" />
                  : <Clock size={14} color="#e0a052" />;

                return (
                  <div key={q.id} style={{ ...rs.qRow, borderLeft: `3px solid ${borderColor}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {rowIcon}
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#243E36" }}>Q{i + 1}: {q.question}</p>
                    </div>

                    {/* Show correct answer when teacher enabled it — always, whether right or wrong */}
                    {isAuto && showAnswers && (
                    <p style={{ fontSize: 12, color: isRight ? "#7CA982" : "#e05252", paddingLeft: 22, marginTop: 4 }}>
                    {isRight ? "✓ Your answer: " : "Correct: "}
                    <strong>{displayCorrect}</strong>
                    </p>
                    )}

                    {!isAuto && (
                      <p style={{ fontSize: 11, color: "#e0a052", paddingLeft: 22 }}>Pending teacher review</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button style={rs.doneBtn} onClick={onDone} className="done-btn">
          <Award size={16} /> Back to Assessments
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const ps = {
  root:       { minHeight: "100vh", background: "#F1F7ED", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', sans-serif" },
  card:       { background: "#fff", borderRadius: 20, padding: "36px 40px", maxWidth: 560, width: "100%", boxShadow: "0 8px 40px rgba(36,62,54,0.10)", display: "flex", flexDirection: "column", gap: 24 },
  header:     { display: "flex", gap: 16, alignItems: "flex-start" },
  headerIcon: { width: 56, height: 56, borderRadius: 14, background: "#e8f3ea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  typeBadge:  { fontSize: 10, fontWeight: 700, color: "#fff", padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.08em", display: "inline-block", marginBottom: 8 },
  title:      { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: "#243E36", marginBottom: 6 },
  desc:       { fontSize: 14, color: "#5a7a6e", lineHeight: 1.6 },
  statsRow:   { display: "flex", background: "#F1F7ED", borderRadius: 12, padding: "16px 0", justifyContent: "space-around" },
  stat:       { textAlign: "center" },
  statNum:    { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: "#243E36" },
  statLabel:  { fontSize: 11, color: "#9ab5a0", marginTop: 2 },
  statDivider:{ width: 1, background: "#e8f3ea" },
  rulesBox:   { background: "#fafcfa", border: "1px solid #e8f3ea", borderRadius: 12, padding: "16px 20px" },
  backBtn:    { flex: 1, padding: "12px 0", border: "1.5px solid #e8f3ea", borderRadius: 10, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  startBtn:   { flex: 2, padding: "12px 0", border: "none", borderRadius: 10, background: "#243E36", color: "#F1F7ED", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" },
};

const ts = {
  root:          { position: "fixed", inset: 0, background: "#F1F7ED", display: "flex", flexDirection: "column", zIndex: 99999, fontFamily: "'DM Sans', sans-serif" },
  loadingScreen: { position: "fixed", inset: 0, background: "#243E36", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 99999 },
  topBar:        { background: "#243E36", padding: "12px 24px", display: "flex", alignItems: "center", gap: 20, flexShrink: 0 },
  assessTitle:   { fontSize: 13, fontWeight: 700, color: "rgba(241,247,237,0.7)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  progressPills: { display: "flex", gap: 4, alignItems: "center" },
  pill:          { height: 6, borderRadius: 99, transition: "all 0.3s ease", flexShrink: 0 },
  timer:         { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, flexShrink: 0, transition: "background 0.3s" },
  progressBar:   { height: 3, background: "#e8f3ea", flexShrink: 0 },
  progressFill:  { height: "100%", background: "#7CA982", transition: "width 0.5s ease" },
  questionArea:  { flex: 1, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px" },
  questionCard:  { background: "#fff", borderRadius: 20, padding: "32px 36px", maxWidth: 680, width: "100%", boxShadow: "0 4px 24px rgba(36,62,54,0.08)" },
  qNumber:       { width: 36, height: 36, borderRadius: "50%", background: "#243E36", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 },
  questionText:  { fontSize: 20, fontWeight: 700, color: "#243E36", lineHeight: 1.5, fontFamily: "'Playfair Display', serif" },
  navRow:        { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 20, borderTop: "1px solid #e8f3ea" },
  navBtn:        { display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", border: "1.5px solid #e8f3ea", borderRadius: 10, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  nextBtn:       { display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" },
};

const ai = {
  optionBtn:   { width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", border: "2px solid", borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", textAlign: "left" },
  optionLetter:{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 },
  tfBtn:       { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "18px", border: "2px solid", borderRadius: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, transition: "all 0.2s" },
  textInput:   { width: "100%", padding: "14px 16px", borderRadius: 10, border: "1.5px solid #c8ddc9", background: "#fafcfa", fontSize: 15, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
};

const rs = {
  root:            { minHeight: "100vh", background: "#F1F7ED", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px", fontFamily: "'DM Sans', sans-serif" },
  card:            { background: "#fff", borderRadius: 20, padding: "36px 40px", maxWidth: 600, width: "100%", boxShadow: "0 8px 40px rgba(36,62,54,0.10)" },
  violationBanner: { background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  scoreCircle:     { width: 140, height: 140, borderRadius: "50%", border: "6px solid", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" },
  qRow:            { background: "#fafcfa", border: "1px solid #e8f3ea", borderRadius: 10, padding: "12px 16px" },
  doneBtn:         { width: "100%", padding: "13px 0", background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
  @keyframes qFade   { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  .fade-up  { animation: fadeUp 0.4s ease both; }
  .q-fade   { animation: qFade 0.3s ease both; }
  .start-btn:hover:not(:disabled) { background: #1a2e28 !important; }
  .back-btn:hover  { background: #e8f3ea !important; }
  .done-btn:hover  { background: #1a2e28 !important; }
  .nav-btn:not(:disabled):hover { background: #e8f3ea !important; }
  .next-btn:hover  { opacity: 0.9; }
  .option-btn:hover { transform: scale(1.01) !important; box-shadow: 0 4px 16px rgba(36,62,54,0.08); }
  .lms-input:focus { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
`;
