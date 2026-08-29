// src/pages/student/StudentDashboard.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, LayoutDashboard, GraduationCap, FileText, Star, Bell, Mail, LogOut, Menu, X, ChevronRight, ChevronDown, Clock, TrendingUp, Award, AlertCircle, CheckCircle2, BookMarked, Calendar, MessageSquare, ClipboardList, Loader2, RefreshCw, Search, Play, CheckSquare, Plus, Hash, Eye, EyeOff, Calculator, FlaskConical, Languages, Landmark, Dumbbell, Palette, Music2, Cpu, HeartHandshake, Sparkles, PartyPopper, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getStudentProfile, getStudentCourses, getStudentAssignments, getStudentGrades, getStudentAnnouncements, getStudentNotifications, markNotificationRead, markAnnouncementsRead, } from "../../services/studentService";
import { joinCourseByCode } from "../../services/courseService";
import { getStudentAssessments } from "../../services/assessmentService";
import StudentAssessmentTaker from "./StudentAssessmentTaker";
import StudentCoursePage from "./StudentCoursePage";
import { supabase } from "../../services/supabase";
import { sendSupportRequest, canSendSupportRequest } from "../../services/supportService";
import logo from "../../assets/logo.png";

// ─────────────────────────────────────────────
// NAV ITEMS
// ─────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard",     label: "Dashboard",     icon: <LayoutDashboard size={18} /> },
  { id: "courses",       label: "My Courses",    icon: <BookOpen size={18} />        },
  { id: "assignments",   label: "Assignments",   icon: <FileText size={18} />        },
  { id: "assessments",   label: "Assessments",   icon: <ClipboardList size={18} />   },
  { id: "announcements", label: "Announcements", icon: <MessageSquare size={18} />   },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function getSubjectIcon(subject = "") {
  const s = subject.toLowerCase();
  if (s.includes("math")) return Calculator;
  if (s.includes("science")) return FlaskConical;
  if (s.includes("filipino") || s.includes("language")) return Languages;
  if (s.includes("history")) return Landmark;
  if (s.includes("pe") || s.includes("sport")) return Dumbbell;
  if (s.includes("art")) return Palette;
  if (s.includes("music")) return Music2;
  if (s.includes("tech")) return Cpu;
  if (s.includes("values")) return HeartHandshake;
  if (s.includes("english")) return BookOpen;
  return BookOpen;
}

function formatDueDate(dateStr) {
  if (!dateStr) return "No due date";
  const due = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return due.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function isUrgent(dateStr) {
  if (!dateStr) return false;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)) <= 1;
}

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

function Spinner({ size = 20, color = "#7CA982" }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 0" }}>
      <Loader2 size={size} color={color} style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <AlertCircle size={16} color="#c0392b" />
      <p style={{ fontSize: 13, color: "#8b2020", flex: 1 }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={{ background: "none", border: "1px solid #f5c6c6", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#8b2020", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}>
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

function EmptyCard({ icon, text }) {
  return (
    <div style={{ ...s.card, padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {icon}
      <p style={{ fontSize: 14, color: "#9ab5a0" }}>{text}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// JOIN COURSE MODAL
// ─────────────────────────────────────────────
function JoinCourseModal({ studentId, onClose, onJoined }) {
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(null);

  
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  
  const handleCodeChange = (val) => {
    
    const clean = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
    if (clean.length > 3) {
      setCode(clean.slice(0, 3) + "-" + clean.slice(3));
    } else {
      setCode(clean);
    }
    setError("");
    setSuccess(null);
  };

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed) { setError("Please enter a join code."); return; }
    if (trimmed.length < 7) { setError("Code must be in format ABC-1234."); return; }

    setLoading(true); setError("");
    try {
      const result = await joinCourseByCode(studentId, trimmed);
      if (result.success) {
        setSuccess(result.course);
      } else {
        setError(result.message || "Invalid code or you're already enrolled.");
      }
    } catch (e) {
      setError(e.message || "Invalid code or you're already enrolled.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={jm.overlay} onClick={onClose}>
      <div style={jm.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={jm.header}>
          <div style={jm.headerIcon}>
            <Hash size={20} color="#7CA982" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={jm.title}>Join a Course</h2>
            <p style={jm.subtitle}>Enter the join code given by your teacher</p>
          </div>
          <button style={jm.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={jm.body}>
          {/* Success state */}
          {success ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0 16px" }}>
              <div style={{ width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={32} color="#7CA982" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Successfully joined!</p>
                <p style={{ fontSize: 14, color: "#5a7a6e" }}>
                  You're now enrolled in <strong>{success?.title ?? "the course"}</strong>
                </p>
              </div>
              <button
                style={{ ...jm.joinBtn, background: "#7CA982", width: "100%" }}
                onClick={() => { onJoined(); onClose(); }}
              >
                Go to My Courses
              </button>
            </div>
          ) : (
            <>
              {/* Code input */}
              <div style={{ marginBottom: 20 }}>
                <label style={jm.label}>Course Join Code</label>
                <div style={{ position: "relative", marginTop: 8 }}>
                  <input
                    placeholder="ABC-1234"
                    value={code}
                    onChange={e => handleCodeChange(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleJoin()}
                    style={{
                      ...jm.input,
                      borderColor: error ? "#e05252" : code.length === 7 ? "#7CA982" : "#c8ddc9",
                      textAlign: "center",
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "#243E36",
                    }}
                    className="lms-input"
                    autoFocus
                    maxLength={8}
                  />
                </div>
                {error && (
                  <p style={{ fontSize: 12, color: "#e05252", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                    <AlertCircle size={12} /> {error}
                  </p>
                )}
                <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 8 }}>
                  Ask your teacher for the course join code. It looks like <strong>ABC-1234</strong>.
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button style={jm.cancelBtn} onClick={onClose} className="cancel-btn">Cancel</button>
                <button
                  style={{ ...jm.joinBtn, opacity: loading || code.length < 7 ? 0.65 : 1 }}
                  onClick={handleJoin}
                  disabled={loading || code.length < 7}
                  className="join-btn"
                >
                  {loading
                    ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Joining…</>
                    : <><BookOpen size={15} /> Join Course</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: MESSAGE ADMIN (Support Request)
// ─────────────────────────────────────────────
function SupportRequestModal({ userId, userRole, onClose }) {
  const [requestType,   setRequestType]   = useState("general");
  const [subject,       setSubject]       = useState("");
  const [message,       setMessage]       = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [canSend,       setCanSend]       = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const allowed = await canSendSupportRequest(userId);
        setCanSend(allowed);
      } catch (_) {
        setCanSend(true);
      } finally {
        setCheckingLimit(false);
      }
    })();
  }, [userId]);

  const requestTypes = [
    { value: "general",          label: "General Message" },
    { value: "account_deletion", label: "Request Account Deletion" },
    { value: "bug_report",       label: "Report a Problem" },
    { value: "other",            label: "Other" },
  ];

  const handleSubmit = async () => {
    setError("");
    if (!subject.trim()) { setError("Please enter a subject."); return; }
    if (!message.trim()) { setError("Please enter your message."); return; }

    setLoading(true);
    try {
      await sendSupportRequest({ userId, userRole, requestType, subject: subject.trim(), message: message.trim() });
      setSuccess(true);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={jm.overlay} onClick={onClose}>
      <div style={{ ...jm.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={jm.header}>
          <div style={{ ...jm.headerIcon, background: "#e8f3ea" }}>
            <Mail size={20} color="#7CA982" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={jm.title}>Message Admin</h2>
            <p style={jm.subtitle}>Send a message directly to your administrator</p>
          </div>
          <button style={jm.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={jm.body}>
          {success ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0 16px" }}>
              <div style={{ width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={32} color="#7CA982" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Message sent!</p>
                <p style={{ fontSize: 14, color: "#5a7a6e" }}>Your admin will get back to you soon.</p>
              </div>
              <button style={{ ...jm.joinBtn, width: "100%" }} onClick={onClose}>Done</button>
            </div>
          ) : checkingLimit ? (
            <Spinner />
          ) : !canSend ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0 16px" }}>
              <div style={{ width: 64, height: 64, background: "#fff8e1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertCircle size={32} color="#e0a052" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Daily limit reached</p>
                <p style={{ fontSize: 14, color: "#5a7a6e" }}>You've already sent a message today. Please try again tomorrow.</p>
              </div>
              <button style={{ ...jm.joinBtn, width: "100%" }} onClick={onClose}>Close</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {error && (
                <div style={{ background: "#fce8e8", border: "1px solid #e08080", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={jm.label}>What is this about?</label>
                <select
                  value={requestType}
                  onChange={e => setRequestType(e.target.value)}
                  style={{ ...jm.input, fontSize: 14, cursor: "pointer" }}
                  className="lms-input"
                >
                  {requestTypes.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={jm.label}>Subject</label>
                <input
                  placeholder="Short summary of your message"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{ ...jm.input, fontSize: 14 }}
                  className="lms-input"
                  maxLength={100}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={jm.label}>Message</label>
                <textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  style={{ ...jm.input, fontSize: 14, resize: "vertical", fontFamily: "'DM Sans', sans-serif" }}
                  className="lms-input"
                  maxLength={1000}
                />
                <p style={{ fontSize: 11, color: "#9ab5a0", textAlign: "right" }}>{message.length}/1000</p>
              </div>

              <p style={{ fontSize: 11, color: "#9ab5a0" }}>Note: You can send only one message per day.</p>

              <div style={{ display: "flex", gap: 10 }}>
                <button style={jm.cancelBtn} onClick={onClose} className="cancel-btn">Cancel</button>
                <button
                  style={{ ...jm.joinBtn, opacity: loading ? 0.7 : 1 }}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
                    : "Send Message"
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  const [activePage,       setActivePage]       = useState("dashboard");
  const [sidebarOpen,      setSidebarOpen]       = useState(false);
  const [notifOpen,        setNotifOpen]         = useState(false);
  const notifRef = useRef(null);
  const [takingAssessment, setTakingAssessment]  = useState(null);
  const [viewingCourse,    setViewingCourse]      = useState(null);
  const [showJoinModal,    setShowJoinModal]      = useState(false);
  const [showSupportModal, setShowSupportModal]   = useState(false);
  const [avatarOpen,           setAvatarOpen]           = useState(false);
  const [showChangePassword,   setShowChangePassword]   = useState(false);

  const [profile,       setProfile]       = useState(null);
  const [courses,       setCourses]       = useState([]);
  const [assignments,   setAssignments]   = useState([]);
  const [grades,        setGrades]        = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [assessments,   setAssessments]   = useState([]);

  const [loading, setLoading] = useState({
    profile: true, courses: true, assignments: true, grades: true,
    announcements: true, notifications: true, assessments: true,
  });
  const [errors, setErrors] = useState({});

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));
  const setErr  = (key, val) => setErrors(prev  => ({ ...prev, [key]: val }));

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoad("profile", true); setErr("profile", null);
    try { setProfile(await getStudentProfile(user.id)); }
    catch (e) { setErr("profile", e.message); }
    finally { setLoad("profile", false); }
  }, [user?.id]);

  const fetchCourses = useCallback(async () => {
    if (!user?.id) return;
    setLoad("courses", true); setErr("courses", null);
    try { setCourses(await getStudentCourses(user.id)); }
    catch (e) { setErr("courses", e.message); }
    finally { setLoad("courses", false); }
  }, [user?.id]);

  const fetchAssignments = useCallback(async () => {
    if (!user?.id) return;
    setLoad("assignments", true); setErr("assignments", null);
    try { setAssignments(await getStudentAssignments(user.id)); }
    catch (e) { setErr("assignments", e.message); }
    finally { setLoad("assignments", false); }
  }, [user?.id]);

  const fetchGrades = useCallback(async () => {
    if (!user?.id) return;
    setLoad("grades", true); setErr("grades", null);
    try { setGrades(await getStudentGrades(user.id)); }
    catch (e) { setErr("grades", e.message); }
    finally { setLoad("grades", false); }
  }, [user?.id]);

  const fetchAnnouncements = useCallback(async () => {
    if (!user?.id) return;
    setLoad("announcements", true); setErr("announcements", null);
    try { setAnnouncements(await getStudentAnnouncements(user.id)); }
    catch (e) { setErr("announcements", e.message); }
    finally { setLoad("announcements", false); }
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoad("notifications", true); setErr("notifications", null);
    try { setNotifications(await getStudentNotifications(user.id)); }
    catch (e) { setErr("notifications", e.message); }
    finally { setLoad("notifications", false); }
  }, [user?.id]);

  const fetchAssessments = useCallback(async () => {
    if (!user?.id) return;
    setLoad("assessments", true); setErr("assessments", null);
    try { setAssessments(await getStudentAssessments(user.id)); }
    catch (e) { setErr("assessments", e.message); }
    finally { setLoad("assessments", false); }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
    fetchCourses();
    fetchAssignments();
    fetchGrades();
    fetchAnnouncements();
    fetchNotifications();
    fetchAssessments();
  }, [fetchProfile, fetchCourses, fetchAssignments, fetchGrades,
      fetchAnnouncements, fetchNotifications, fetchAssessments]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`student-dashboard-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assessments" },
        () => { fetchAssessments(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        () => { fetchAssignments(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assessment_submissions", filter: `student_id=eq.${user.id}` },
        (payload) => { console.log("REALTIME EVENT (submissions):", payload); fetchAssessments(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { fetchNotifications(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchAssessments, fetchAssignments, fetchNotifications]);

  const pendingAssignments  = assignments.filter(a => !a.submission);
  const pendingAssessments  = assessments.filter(a => !a.submission);
  const unreadNotifCount    = notifications.filter(n => !n.is_read).length;
  const unreadAnnouncCount  = announcements.filter(a => !a.is_read).length;
  const displayName         = profile?.full_name || user?.email || "Student";
  const initials            = getInitials(displayName);

  const avgGrade = grades.length
    ? Math.round(grades.reduce((sum, g) => sum + (g.grade / g.maxPoints) * 100, 0) / grades.length)
    : null;
  const completedCount = assignments.filter(a => a.submission?.status === "graded").length;

  const stats = [
    { label: "Enrolled Courses", value: loading.courses    ? "…" : courses.length,                                  icon: <BookMarked size={20} />,   color: "#243E36" },
    { label: "Pending Tasks",    value: loading.assignments ? "…" : pendingAssignments.length,                       icon: <Clock size={20} />,        color: "#e0a052" },
    { label: "Avg. Grade",       value: loading.grades      ? "…" : avgGrade !== null ? `${avgGrade}%` : "—",        icon: <TrendingUp size={20} />,   color: "#7CA982" },
    { label: "Completed",        value: loading.assignments ? "…" : completedCount,                                  icon: <CheckCircle2 size={20} />, color: "#4a7c59" },
  ];

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const handleMarkNotifRead = async (notifId) => {
    try {
      await markNotificationRead(notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (_) {}
  };

  const handleMarkAllRead = async () => {
  try {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  } catch (_) {}
};

useEffect(() => {
  if (!notifOpen) return;
  const handleClickOutside = (e) => {
    if (notifRef.current && !notifRef.current.contains(e.target)) {
      setNotifOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [notifOpen]);

const markAnnouncementsAsRead = useCallback(async () => {
  if (!user?.id) return;
  const unreadIds = announcements.filter(a => !a.is_read).map(a => a.id);
  if (unreadIds.length === 0) return;
  await markAnnouncementsRead(user.id, unreadIds);
  setAnnouncements(prev => prev.map(a => ({ ...a, is_read: true })));
}, [user?.id, announcements]); 

  
  const handleJoined = () => {
    fetchCourses();
    fetchAssignments();
    fetchAssessments();
    setActivePage("courses");
  };

  if (viewingCourse) {
  return (
    <StudentCoursePage
      course={viewingCourse}
      onBack={() => {
        setViewingCourse(null);
        fetchAssignments();
        fetchAssessments();
        fetchGrades();
      }}
    />
  );
  }

  if (takingAssessment) {
    return (
      <StudentAssessmentTaker
        assessment={takingAssessment}
        onBack={() => setTakingAssessment(null)}
        onDone={() => {
          setTakingAssessment(null);
          fetchAssessments();
          fetchNotifications();
          setActivePage("assessments");
        }}
      />
    );
  }

  return (
    <div style={s.root}>
      <style>{css}</style>

      {/* ── Sidebar ── */}
      <aside style={{ ...s.sidebar, transform: sidebarOpen ? "translateX(0)" : undefined }} className="sidebar">
        <div style={s.sidebarLogo}>
          <div className="logo-glow-wrap">
            <img src={logo} alt="EMEGEMA logo" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0, position: "relative", zIndex: 1 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={s.logoText}>EMEGEMA</p>
            <p style={s.logoSubtext}>Integrated Learning Hub</p>
          </div>
          <button style={s.closeMobile} onClick={() => setSidebarOpen(false)} className="close-mobile">
            <X size={18} color="rgba(241,247,237,0.5)" />
          </button>
        </div>
        <div style={s.userPill}>
          <div style={s.avatar}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={s.userName}>{displayName}</div>
            <div style={s.userRole}>Student</div>
          </div>
        </div>
        <nav style={s.nav}>
          <p style={s.navLabel}>MENU</p>
          {NAV_ITEMS.map(item => (
            <button key={item.id}
              onClick={() => { setActivePage(item.id); setSidebarOpen(false); if (item.id === "announcements") markAnnouncementsAsRead(); }}
              style={{ ...s.navItem, ...(activePage === item.id ? s.navItemActive : {}) }}
              className="nav-item">
              <span style={{ opacity: activePage === item.id ? 1 : 0.55 }}>{item.icon}</span>
              {item.label}
              {item.id === "assignments"   && pendingAssignments.length > 0  && <span style={s.navBadge}>{pendingAssignments.length}</span>}
              {item.id === "assessments"   && pendingAssessments.length > 0  && <span style={s.navBadge}>{pendingAssessments.length}</span>}
              {item.id === "announcements" && unreadAnnouncCount > 0         && <span style={s.navBadge}>{unreadAnnouncCount}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {sidebarOpen && <div style={s.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <div style={s.main}>
        <header style={s.topbar}>
          <button style={s.menuBtn} onClick={() => setSidebarOpen(true)} className="menu-btn">
            <Menu size={20} color="#243E36" />
          </button>
          <div style={s.topbarTitle}>{NAV_ITEMS.find(n => n.id === activePage)?.label ?? "Dashboard"}</div>
          <div style={s.topbarRight}>
            <button style={s.messageBtn} onClick={() => setShowSupportModal(true)} className="message-btn" title="Message Admin">
              <Mail size={18} color="#243E36" />
            </button>
            <div style={{ position: "relative" }} ref={notifRef}>
              <button style={s.notifBtn} onClick={() => setNotifOpen(v => !v)} className="notif-btn">
                <Bell size={18} color="#243E36" />
                {unreadNotifCount > 0 && <span style={s.notifDot}>{unreadNotifCount}</span>}
              </button>
              {notifOpen && (
                <div style={s.notifDropdown} className="notif-dropdown">
                  <div style={s.notifHeader}>
  <span style={s.notifHeaderTitle}>Notifications</span>
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span style={s.notifHeaderCount}>{unreadNotifCount} new</span>
    {unreadNotifCount > 0 && (
      <button onClick={handleMarkAllRead} style={{ background: "none", border: "none", fontSize: 11, color: "#9ab5a0", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
        Mark all read
      </button>
    )}
  </div>
</div>
                  {loading.notifications ? <Spinner size={16} /> : notifications.length === 0 ? (
                    <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ab5a0", fontSize: 13 }}>No notifications yet</div>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => handleMarkNotifRead(n.id)}
                      style={{ ...s.notifItem, ...(!n.is_read ? s.notifItemUnread : {}), cursor: "pointer" }}>
                      <div style={{ ...s.notifDotSmall, background: !n.is_read ? "#7CA982" : "transparent" }} />
                      <div style={{ flex: 1 }}>
                        <p style={s.notifMsg}>{n.message || n.title}</p>
                        <p style={s.notifTime}>{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setAvatarOpen(v => !v)}
                style={s.topbarAvatarBtn}
                className="avatar-trigger-btn"
              >
                <div style={s.topbarAvatar}>{initials}</div>
                <ChevronDown size={13} color="#243E36" style={{ transition: "transform 0.2s", transform: avatarOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>

              {avatarOpen && (
                <>
                  {/* backdrop to close on outside click */}
                  <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setAvatarOpen(false)} />
                  <div style={s.avatarDropdown}>
                    <div style={s.avatarDropdownHeader}>
                      <div style={s.avatarDropdownAvatar}>{initials}</div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{displayName}</p>
                        <p style={{ fontSize: 11, color: "#9ab5a0" }}>Student</p>
                      </div>
                    </div>
                    <div style={s.avatarDropdownDivider} />
                    <button
                      style={s.avatarDropdownItem}
                      className="avatar-dropdown-item"
                      onClick={() => { setAvatarOpen(false); setShowChangePassword(true); }}
                    >
                      <Eye size={14} /> Change Password
                    </button>
                    <div style={s.avatarDropdownDivider} />
                    <button
                      style={{ ...s.avatarDropdownItem, color: "#e05252" }}
                      className="avatar-dropdown-item-danger"
                      onClick={() => { setAvatarOpen(false); handleLogout(); }}
                    >
                      <LogOut size={14} /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div style={s.content}>
          {activePage === "dashboard" && (
            <DashboardHome
              setActivePage={setActivePage}
              displayName={displayName}
              stats={stats}
              courses={courses}
              assignments={assignments}
              pendingAssignments={pendingAssignments}
              grades={grades}
              announcements={announcements}
              assessments={assessments}
              loading={loading}
              errors={errors}
              onRetry={{ fetchCourses, fetchAssignments, fetchGrades, fetchAnnouncements }}
              onTakeAssessment={setTakingAssessment}
              onJoinCourse={() => setShowJoinModal(true)}
            />
          )}
          {activePage === "courses" && (
            <CoursesPage
              courses={courses}
              loading={loading.courses}
              error={errors.courses}
              onRetry={fetchCourses}
              onView={setViewingCourse}
              onJoin={() => setShowJoinModal(true)}
              pendingAssignments={pendingAssignments}
              pendingAssessments={pendingAssessments}
            />
          )}
          {activePage === "assignments"   && <AssignmentsPage assignments={assignments} loading={loading.assignments} error={errors.assignments} onRetry={fetchAssignments} />}
          {activePage === "assessments"   && <AssessmentsPage assessments={assessments} loading={loading.assessments} error={errors.assessments} onRetry={fetchAssessments} onTake={setTakingAssessment} />}
          {activePage === "grades"        && <GradesPage grades={grades} loading={loading.grades} error={errors.grades} onRetry={fetchGrades} />}
          {activePage === "announcements" && <AnnouncementsPage announcements={announcements} loading={loading.announcements} error={errors.announcements} onRetry={fetchAnnouncements} />}
        </div>
      </div>

      {/* ── Join Course Modal ── */}
      {showJoinModal && (
        <JoinCourseModal
          studentId={user?.id}
          onClose={() => setShowJoinModal(false)}
          onJoined={handleJoined}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {showSupportModal && (
        <SupportRequestModal
          userId={user?.id}
          userRole="student"
          onClose={() => setShowSupportModal(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: DASHBOARD HOME
// ─────────────────────────────────────────────
function DashboardHome({ setActivePage, displayName, stats, courses, assignments, pendingAssignments, grades, announcements, assessments, loading, errors, onRetry, onTakeAssessment, onJoinCourse }) {
  const today              = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const firstName          = displayName.split(" ")[0];
  const pendingAssessments = assessments.filter(a => !a.submission);

  return (
    <div className="fade-up">
      <div style={s.welcomeBar}>
        <div>
          <h1 style={s.welcomeTitle}>
            Good day, {firstName}! <Sparkles size={22} color="#e0a052" style={{ display: "inline", verticalAlign: "middle", marginLeft: 4 }} />
          </h1>
          <p style={s.welcomeDate}>{today}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button style={s.joinBtnTopbar} onClick={onJoinCourse} className="join-topbar-btn">
            <Plus size={14} /> Join a Course
          </button>
          <div style={s.welcomeBadge}><GraduationCap size={14} color="#7CA982" /><span>Student</span></div>
        </div>
      </div>

      <div style={s.statsGrid}>
        {stats.map((stat, i) => (
          <div key={i} style={s.statCard} className="stat-card">
            <div style={{ ...s.statIcon, background: stat.color + "18", color: stat.color }}>{stat.icon}</div>
            <div style={s.statValue}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={s.twoCol}>
        <div>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>My Courses</h2>
            <button style={s.seeAll} onClick={() => setActivePage("courses")}>See all <ChevronRight size={13} /></button>
          </div>
          {errors.courses && <ErrorBanner message={errors.courses} onRetry={onRetry.fetchCourses} />}
          {loading.courses ? <Spinner /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {courses.length === 0 ? (
                <div style={{ ...s.card, padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <BookOpen size={28} color="#c8ddc9" />
                  <p style={{ fontSize: 14, color: "#9ab5a0" }}>No courses enrolled yet.</p>
                  <button style={s.joinBtnEmpty} onClick={onJoinCourse} className="join-btn">
                    <Plus size={14} /> Join a Course
                  </button>
                </div>
              ) : courses.slice(0, 3).map(course => <CourseCard key={course.id} course={course} />)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {!loading.assessments && pendingAssessments.length > 0 && (
            <div>
              <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Assessments Due</h2>
                <button style={s.seeAll} onClick={() => setActivePage("assessments")}>See all <ChevronRight size={13} /></button>
              </div>
              <div style={s.card}>
                {pendingAssessments.slice(0, 3).map((a, i, arr) => (
                  <div key={a.id}
                    style={{ ...s.assignRow, borderBottom: i < arr.length - 1 ? "1px solid #e8f3ea" : "none", cursor: "pointer" }}
                    onClick={() => onTakeAssessment(a)}>
                    <div style={{ flex: 1 }}>
                      <p style={s.assignTitle}>{a.title}</p>
                      <p style={s.assignCourse}>{a.courseName} · {a.type === "quiz" ? "Quiz" : "Written"}</p>
                    </div>
                    <span style={{ ...s.dueBadge, ...(isUrgent(a.due_date) ? s.dueBadgeUrgent : {}) }}>
                      {formatDueDate(a.due_date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Upcoming</h2>
              <button style={s.seeAll} onClick={() => setActivePage("assignments")}>See all <ChevronRight size={13} /></button>
            </div>
            {errors.assignments && <ErrorBanner message={errors.assignments} onRetry={onRetry.fetchAssignments} />}
            {loading.assignments ? <Spinner /> : (
              <div style={s.card}>
                {pendingAssignments.length === 0
                  ? <div style={{ padding: "20px 16px", textAlign: "center", color: "#9ab5a0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <PartyPopper size={15} color="#7CA982" /> All caught up!
                    </div>
                  : pendingAssignments.slice(0, 4).map((a, i, arr) => (
                    <div key={a.id} style={{ ...s.assignRow, borderBottom: i < arr.length - 1 ? "1px solid #e8f3ea" : "none" }}>
                      <div style={{ flex: 1 }}>
                        <p style={s.assignTitle}>{a.title}</p>
                        <p style={s.assignCourse}>{a.courseName}</p>
                      </div>
                      <span style={{ ...s.dueBadge, ...(isUrgent(a.due_date) ? s.dueBadgeUrgent : {}) }}>
                        {formatDueDate(a.due_date)}
                      </span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          <div>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Announcements</h2>
              <button style={s.seeAll} onClick={() => setActivePage("announcements")}>See all <ChevronRight size={13} /></button>
            </div>
            {errors.announcements && <ErrorBanner message={errors.announcements} onRetry={onRetry.fetchAnnouncements} />}
            {loading.announcements ? <Spinner /> : (
              <div style={s.card}>
                {announcements.length === 0
                  ? <div style={{ padding: "20px 16px", textAlign: "center", color: "#9ab5a0", fontSize: 13 }}>No announcements yet.</div>
                  : announcements.slice(0, 3).map((a, i) => (
                    <div key={a.id} style={{ ...s.announceRow, borderBottom: i < 2 ? "1px solid #e8f3ea" : "none" }}>
                      {!a.is_read && <div style={s.unreadDot} />}
                      <div style={{ flex: 1, paddingLeft: !a.is_read ? 0 : 14 }}>
                        <p style={{ ...s.announceTitle, fontWeight: !a.is_read ? 700 : 500 }}>{a.title}</p>
                        <p style={s.announceMeta}>{a.authorName} · {timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Recent Grades</h2>
          <button style={s.seeAll} onClick={() => setActivePage("grades")}>See all <ChevronRight size={13} /></button>
        </div>
        {errors.grades && <ErrorBanner message={errors.grades} onRetry={onRetry.fetchGrades} />}
        {loading.grades ? <Spinner /> : (
          grades.length === 0
            ? <EmptyCard icon={<Star size={28} color="#c8ddc9" />} text="No graded work yet." />
            : (
              <div style={s.card} className="table-scroll">
                <table style={s.table}>
                  <thead><tr>{["Assignment", "Course", "Grade", "Date"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {grades.slice(0, 5).map((g, i) => (
                      <tr key={g.submissionId} style={{ borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                        <td style={s.td}>{g.assignmentTitle}</td>
                        <td style={{ ...s.td, color: "#7CA982", fontSize: 12 }}>{g.courseName}</td>
                        <td style={s.td}>
                          <span style={{ ...s.gradePill, background: g.grade >= g.maxPoints * 0.9 ? "#e8f3ea" : "#fff8e1", color: g.grade >= g.maxPoints * 0.9 ? "#1a5c30" : "#7a5c00" }}>
                            {g.grade}/{g.maxPoints}
                          </span>
                        </td>
                        <td style={{ ...s.td, color: "#9ab5a0", fontSize: 12 }}>
                          {g.dueDate ? new Date(g.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: MY COURSES  — with Join button
// ─────────────────────────────────────────────
function CoursesPage({ courses, loading, error, onRetry, onView, onJoin, pendingAssignments = [], pendingAssessments = [] }) {
  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={s.pageTitle}>My Courses</h1>
          <p style={s.pageSubtitle}>{loading ? "Loading…" : `Enrolled in ${courses.length} course${courses.length !== 1 ? "s" : ""}.`}</p>
        </div>
        <button style={s.joinBtnPrimary} onClick={onJoin} className="join-btn">
          <Plus size={15} /> Join a Course
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={onRetry} />}
      {loading ? <Spinner /> : (
        courses.length === 0 ? (
          <div style={{ ...s.card, padding: "64px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <BookOpen size={40} color="#c8ddc9" />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#5a7a6e" }}>You're not enrolled in any courses yet</p>
            <p style={{ fontSize: 13, color: "#9ab5a0" }}>Ask your teacher for a join code to get started</p>
            <button style={s.joinBtnPrimary} onClick={onJoin} className="join-btn">
              <Plus size={15} /> Join a Course
            </button>
          </div>
        ) : (
          <div style={s.coursesGrid}>
            {courses.map(c => {
              const pendingCount =
                pendingAssignments.filter(a => a.courseId === c.id).length +
                pendingAssessments.filter(a => a.courseId === c.id).length;
              return <CourseCardFull key={c.id} course={c} onView={onView} pendingCount={pendingCount} />;
            })}
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: ASSIGNMENTS
// ─────────────────────────────────────────────
function AssignmentsPage({ assignments, loading, error, onRetry }) {
  const [filter, setFilter] = useState("all");
  const filtered = assignments.filter(a => {
    if (filter === "all")       return true;
    if (filter === "pending")   return !a.submission;
    if (filter === "submitted") return a.submission?.status === "submitted";
    if (filter === "graded")    return a.submission?.status === "graded";
    return true;
  });
  const getStatus = (a) => {
    if (!a.submission) return "pending";
    if (a.submission.status === "graded") return "graded";
    return "submitted";
  };
  return (
    <div className="fade-up">
      <h1 style={s.pageTitle}>Assignments</h1>
      <p style={s.pageSubtitle}>Track all your tasks and deadlines.</p>
      <div style={{ ...s.filterTabs, marginBottom: 20 }}>
        {["all", "pending", "submitted", "graded"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ ...s.filterTab, ...(filter === f ? s.filterTabActive : {}) }} className="filter-tab">
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {error && <ErrorBanner message={error} onRetry={onRetry} />}
      {loading ? <Spinner /> : (
        <div style={s.card}>
          {filtered.length === 0 ? (
            <div style={s.emptyState}><CheckCircle2 size={32} color="#c8ddc9" /><p style={{ color: "#9ab5a0", marginTop: 8, fontSize: 14 }}>No assignments here!</p></div>
          ) : filtered.map((a, i) => {
            const status = getStatus(a);
            const urgent = status === "pending" && isUrgent(a.due_date);
            return (
              <div key={a.id} style={{ ...s.assignRowFull, borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                <div style={{ ...s.statusDot, background: status === "graded" ? "#7CA982" : status === "submitted" ? "#e0a052" : urgent ? "#e05252" : "#c8ddc9" }} />
                <div style={{ flex: 1 }}>
                  <p style={s.assignTitle}>{a.title}</p>
                  <p style={s.assignCourse}>{a.courseName} · Due {formatDueDate(a.due_date)}</p>
                  {a.submission?.grade != null && (
                    <p style={{ fontSize: 12, color: "#7CA982", marginTop: 3, fontWeight: 600 }}>
                      Grade: {a.submission.grade}/{a.maxPoints || 100}
                      {a.submission.feedback && ` — "${a.submission.feedback}"`}
                    </p>
                  )}
                </div>
                <span style={{ ...s.statusPill, background: status === "graded" ? "#e8f3ea" : status === "submitted" ? "#fff8e1" : "#fce8e8", color: status === "graded" ? "#1a5c30" : status === "submitted" ? "#7a5c00" : "#8b2020" }}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: ASSESSMENTS
// ─────────────────────────────────────────────
function AssessmentsPage({ assessments, loading, error, onRetry, onTake }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = assessments.filter(a => {
    const matchFilter = filter === "all" ? true : filter === "pending" ? !a.submission : !!a.submission;
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.courseName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const pendingCount   = assessments.filter(a => !a.submission).length;
  const completedCount = assessments.filter(a =>  a.submission).length;

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={s.pageTitle}>Assessments</h1>
          <p style={s.pageSubtitle}>{loading ? "Loading…" : `${pendingCount} pending · ${completedCount} completed`}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} color="#9ab5a0" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input placeholder="Search assessments..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...s.searchInput, paddingLeft: 36 }} className="lms-input" />
        </div>
        <div style={s.filterTabs}>
          {["all", "pending", "completed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...s.filterTab, ...(filter === f ? s.filterTabActive : {}) }} className="filter-tab">
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {error && <ErrorBanner message={error} onRetry={onRetry} />}
      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyCard icon={<ClipboardList size={36} color="#c8ddc9" />} text={search ? "No assessments match your search." : "No assessments available yet."} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(a => <AssessmentCard key={a.id} assessment={a} onTake={onTake} />)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ASSESSMENT CARD
// ─────────────────────────────────────────────
function AssessmentCard({ assessment: a, onTake }) {
  const done     = !!a.submission;
  const isGraded = a.submission?.status === "graded";
  const score    = a.submission?.score;
  const maxScore = a.submission?.max_score ?? a.max_points;
  const pct      = maxScore > 0 && score != null ? Math.round((score / maxScore) * 100) : null;
  const isQuiz   = a.type === "quiz";

  return (
    <div style={{ ...s.card, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${done ? "#7CA982" : isUrgent(a.due_date) ? "#e05252" : "#243E36"}` }} className="assessment-card">
      <div style={{ width: 44, height: 44, borderRadius: 12, background: done ? "#e8f3ea" : isQuiz ? "#e8eef9" : "#f3eefb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} className="assessment-card-icon">
        {done ? <CheckSquare size={20} color="#7CA982" /> : isQuiz ? <ClipboardList size={20} color="#3a6fd8" /> : <FileText size={20} color="#8b6ce0" />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36" }}>{a.title}</p>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: isQuiz ? "#e8eef9" : "#f3eefb", color: isQuiz ? "#3a6fd8" : "#8b6ce0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {isQuiz ? "Quiz" : "Written"}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#7CA982", marginBottom: 4 }}>{a.courseName}</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#9ab5a0", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} /> Due {formatDueDate(a.due_date)}
          </span>
          <span style={{ fontSize: 11, color: "#9ab5a0" }}>{a.max_points} pts</span>
          {done && isGraded && pct !== null && (
            <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 75 ? "#1a5c30" : "#8b2020" }}>
              Score: {score}/{maxScore} ({pct}%)
            </span>
          )}
          {done && !isGraded && <span style={{ fontSize: 11, color: "#e0a052", fontWeight: 600 }}>Pending teacher review</span>}
        </div>
      </div>
      {done ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#e8f3ea", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#1a5c30", flexShrink: 0 }} className="assessment-card-status">
          <CheckCircle2 size={14} /> Submitted
        </div>
      ) : (
        <button onClick={() => onTake(a)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "#243E36", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0, transition: "background 0.2s" }}
          className="take-btn assessment-card-status">
          <Play size={14} /> Take
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: GRADES
// ─────────────────────────────────────────────
function GradesPage({ grades, loading, error, onRetry }) {
  const avg = grades.length ? Math.round(grades.reduce((sum, g) => sum + (g.grade / g.maxPoints) * 100, 0) / grades.length) : null;
  return (
    <div className="fade-up">
      <h1 style={s.pageTitle}>My Grades</h1>
      <p style={s.pageSubtitle}>Your academic performance this semester.</p>
      {error && <ErrorBanner message={error} onRetry={onRetry} />}
      {!loading && avg !== null && (
        <div style={s.avgBanner}>
          <div><p style={s.avgLabel}>Semester Average</p><p style={s.avgValue}>{avg}%</p></div>
          <div style={s.avgIcon}><Award size={32} color="#7CA982" /></div>
        </div>
      )}
      {loading ? <Spinner /> : (
        grades.length === 0 ? <EmptyCard icon={<Award size={36} color="#c8ddc9" />} text="No graded assignments yet." /> : (
          <div style={s.card} className="table-scroll">
            <table style={s.table}>
              <thead><tr>{["Assignment", "Course", "Score", "Percentage", "Feedback"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {grades.map((g, i) => {
                  const pct = Math.round((g.grade / g.maxPoints) * 100);
                  return (
                    <tr key={g.submissionId} style={{ borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                      <td style={s.td}>{g.assignmentTitle}</td>
                      <td style={{ ...s.td, color: "#7CA982", fontSize: 12 }}>{g.courseName}</td>
                      <td style={s.td}><strong>{g.grade}</strong>/{g.maxPoints}</td>
                      <td style={s.td}>
                        <div style={s.progressWrap}><div style={{ ...s.progressBar, width: `${pct}%`, background: pct >= 90 ? "#7CA982" : pct >= 75 ? "#e0a052" : "#e05252" }} /></div>
                        <span style={{ fontSize: 11, color: "#5a7a6e" }}>{pct}%</span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#9ab5a0", maxWidth: 180 }}>{g.feedback || <span style={{ fontStyle: "italic" }}>No feedback</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: ANNOUNCEMENTS
// ─────────────────────────────────────────────
function AnnouncementsPage({ announcements, loading, error, onRetry }) {
  return (
    <div className="fade-up">
      <h1 style={s.pageTitle}>Announcements</h1>
      <p style={s.pageSubtitle}>Stay updated with your school and class notices.</p>
      {error && <ErrorBanner message={error} onRetry={onRetry} />}
      {loading ? <Spinner /> : (
        announcements.length === 0 ? <EmptyCard icon={<MessageSquare size={36} color="#c8ddc9" />} text="No announcements yet." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {announcements.map(a => (
              <div key={a.id} style={{ ...s.card, padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start", borderLeft: `4px solid ${!a.is_read ? "#7CA982" : "#e8f3ea"}` }}>
                <div style={{ width: 40, height: 40, background: !a.is_read ? "#e8f3ea" : "#f5f5f5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MessageSquare size={16} color={!a.is_read ? "#7CA982" : "#9ab5a0"} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: !a.is_read ? 700 : 500, color: "#243E36", marginBottom: 4 }}>{a.title}</p>
                    {!a.is_read && <span style={{ ...s.gradePill, background: "#e8f3ea", color: "#1a5c30", flexShrink: 0 }}>New</span>}
                  </div>
                  {a.courseName && <p style={{ fontSize: 12, color: "#7CA982", marginBottom: 2 }}>{a.courseName}</p>}
                  {a.is_global  && <p style={{ fontSize: 12, color: "#7CA982", marginBottom: 2 }}>School-wide</p>}
                  <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6, marginBottom: 6 }}>{a.content}</p>
                  <p style={{ fontSize: 12, color: "#9ab5a0" }}>By {a.authorName} · {timeAgo(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// REUSABLE CARDS
// ─────────────────────────────────────────────
function CourseCard({ course }) {
  const color = course.cover_color || "#243E36";
  return (
    <div style={s.courseCard} className="course-card">
      <div style={{ ...s.courseStripe, background: color }} />
      <div style={{ ...s.courseCardBody, position: "relative", overflow: "hidden" }}>
        <div><p style={s.courseCardTitle}>{course.title}</p><p style={s.courseCardTeacher}>{course.teacherName}</p></div>
        <p style={s.courseCardNext}>{course.schedule || "See schedule"}</p>
      </div>
      <div style={s.courseProgressBg}><div style={{ ...s.courseProgressFill, width: "100%", background: color + "55" }} /></div>
    </div>
  );
}

function CourseCardFull({ course, onView, pendingCount = 0 }) {
  const color = course.cover_color || "#243E36";
  const SubjectIcon = getSubjectIcon(course.subject);
  return (
    <div style={{ ...s.courseCardFull, position: "relative" }} className="course-card">
      {pendingCount > 0 && (
        <span style={{
          position: "absolute", top: 12, right: 12, zIndex: 1,
          background: "#e05252", color: "#fff", fontSize: 11, fontWeight: 700,
          minWidth: 20, height: 20, borderRadius: 99, display: "flex",
          alignItems: "center", justifyContent: "center", padding: "0 6px",
        }}>
          {pendingCount}
        </span>
      )}
      <div style={{ ...s.courseCardHeader, background: color, position: "relative", overflow: "hidden" }}>
        <SubjectIcon
          size={92}
          strokeWidth={1.5}
          style={{
            position: "absolute",
            bottom: -18,
            right: -14,
            color: "#fff",
            opacity: 0.16,
            pointerEvents: "none",
          }}
        />
        <span style={s.courseCardSubject}>{course.subject}</span>
        <p style={s.courseCardTitleFull}>{course.title}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{course.teacherName}</p>
      </div>
      <div style={s.courseCardFooter}>
        {course.description && <p style={{ fontSize: 13, color: "#5a7a6e", marginBottom: 12, lineHeight: 1.5 }}>{course.description.length > 80 ? course.description.slice(0, 80) + "…" : course.description}</p>}
        {course.schedule && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}><Calendar size={12} color="#9ab5a0" /><span style={{ fontSize: 12, color: "#9ab5a0" }}>{course.schedule}</span></div>}
        <button onClick={() => onView(course)}
          style={{ width: "100%", padding: "10px 0", background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.2s" }}
          className="view-course-btn">
          View Course <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: CHANGE PASSWORD
// ─────────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState(false);

  const { user } = useAuthStore();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSubmit = async () => {
    setError("");

    if (!currentPassword) { setError("Please enter your current password."); return; }
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
    if (currentPassword === newPassword) { setError("New password must be different from current password."); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) { setError(updateError.message); setLoading(false); return; }

      setSuccess(true);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={jm.overlay} onClick={onClose}>
      <div style={{ ...jm.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={jm.header}>
          <div style={{ ...jm.headerIcon, background: "#e8f3ea" }}>
            <Eye size={20} color="#7CA982" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={jm.title}>Change Password</h2>
            <p style={jm.subtitle}>Update your account password</p>
          </div>
          <button style={jm.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={jm.body}>
          {success ? (
            /* ── Success State ── */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0 16px" }}>
              <div style={{ width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={32} color="#7CA982" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Password updated!</p>
                <p style={{ fontSize: 14, color: "#5a7a6e" }}>Your password has been changed successfully.</p>
              </div>
              <button style={{ ...jm.joinBtn, width: "100%" }} onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {error && (
                <div style={{ background: "#fce8e8", border: "1px solid #e08080", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Current Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={jm.label}>Current Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    style={{ ...jm.input, fontSize: 14, paddingRight: 44 }}
                    className="lms-input"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" }}>
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={jm.label}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ ...jm.input, fontSize: 14, paddingRight: 44 }}
                    className="lms-input"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={jm.label}>Confirm New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={{ ...jm.input, fontSize: 14, paddingRight: 44,
                      borderColor: confirmPassword && confirmPassword !== newPassword ? "#e05252" : undefined }}
                    className="lms-input"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p style={{ fontSize: 12, color: "#e05252", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={12} /> Passwords do not match
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button style={jm.cancelBtn} onClick={onClose} className="cancel-btn">Cancel</button>
                <button
                  style={{ ...jm.joinBtn, opacity: loading ? 0.7 : 1 }}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Updating…</>
                    : "Update Password"
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = {
  root: { display: "flex", minHeight: "100vh", background: "#F1F7ED", fontFamily: "'DM Sans', sans-serif", position: "relative" },
  sidebar: { width: 240, flexShrink: 0, background: "#243E36", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto", zIndex: 40, transition: "transform 0.25s ease" },
  sidebarLogo: { display: "flex", alignItems: "center", gap: 10, padding: "24px 20px 20px", borderBottom: "1px solid rgba(124,169,130,0.15)" },
  logoIcon: { width: 34, height: 34, background: "rgba(124,169,130,0.15)", border: "1px solid rgba(124,169,130,0.25)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logoText: { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15, color: "#F1F7ED", letterSpacing: "0.03em", lineHeight: 1.2 },
  logoSubtext: { fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 9, color: "rgba(124,169,130,0.8)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 1 },
  closeMobile: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "none" },
  userPill: { display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", margin: "12px 12px 0", background: "rgba(124,169,130,0.1)", borderRadius: 10 },
  avatar: { width: 36, height: 36, background: "#7CA982", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: "#F1F7ED", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { fontSize: 11, color: "rgba(241,247,237,0.45)", marginTop: 1 },
  nav: { padding: "20px 12px", flex: 1 },
  navLabel: { fontSize: 10, fontWeight: 700, color: "rgba(241,247,237,0.3)", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 8 },
  navItem: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "transparent", border: "none", color: "rgba(241,247,237,0.55)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", marginBottom: 2, transition: "all 0.15s", position: "relative" },
  navItemActive: { background: "#7CA982", color: "#fff" },
  navBadge: { marginLeft: "auto", background: "#e05252", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 },
  logoutBtn: { display: "none" },
  topbarAvatarBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 99, transition: "background 0.15s", fontFamily: "'DM Sans', sans-serif" },
  avatarDropdown: { position: "absolute", top: "calc(100% + 10px)", right: 0, width: 220, background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, boxShadow: "0 8px 32px rgba(36,62,54,0.14)", zIndex: 50, overflow: "hidden" },
  avatarDropdownHeader: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" },
  avatarDropdownAvatar: { width: 34, height: 34, background: "#243E36", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  avatarDropdownDivider: { height: 1, background: "#e8f3ea" },
  avatarDropdownItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", fontSize: 13, fontWeight: 500, color: "#243E36", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "background 0.15s" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 35 },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar: { height: 60, background: "#fff", borderBottom: "1px solid #e8f3ea", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, position: "sticky", top: 0, zIndex: 30 },
  menuBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "none" },
  topbarTitle: { flex: 1, fontSize: 15, fontWeight: 600, color: "#243E36" },
  topbarRight: { display: "flex", alignItems: "center", gap: 12 },
  messageBtn: { position: "relative", background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  notifBtn: { position: "relative", background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  notifDot: { position: "absolute", top: -4, right: -4, background: "#e05252", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" },
  notifDropdown: { position: "absolute", top: "calc(100% + 10px)", right: 0, width: 320, background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, boxShadow: "0 8px 32px rgba(36,62,54,0.12)", overflow: "hidden", zIndex: 50, maxHeight: 420, overflowY: "auto" },
  notifHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e8f3ea" },
  notifHeaderTitle: { fontSize: 13, fontWeight: 700, color: "#243E36" },
  notifHeaderCount: { fontSize: 11, color: "#7CA982", fontWeight: 600 },
  notifItem: { display: "flex", gap: 10, padding: "12px 16px", borderBottom: "1px solid #f5faf5", alignItems: "flex-start" },
  notifItemUnread: { background: "#f8fdf8" },
  notifDotSmall: { width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  notifMsg: { fontSize: 12, color: "#243E36", lineHeight: 1.5, marginBottom: 2 },
  notifTime: { fontSize: 11, color: "#9ab5a0" },
  topbarAvatar: { width: 34, height: 34, background: "#243E36", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  content: { padding: "28px 28px", flex: 1, overflowY: "auto" },
  welcomeBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  welcomeTitle: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#243E36", marginBottom: 4 },
  welcomeDate: { fontSize: 13, color: "#9ab5a0" },
  welcomeBadge: { display: "flex", alignItems: "center", gap: 6, background: "#e8f3ea", border: "1px solid #c8ddc9", borderRadius: 99, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#243E36" },
  joinBtnTopbar: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#7CA982", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s", whiteSpace: "nowrap" },
  joinBtnPrimary: { display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s", whiteSpace: "nowrap" },
  joinBtnEmpty: { display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", background: "#7CA982", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 },
  statCard: { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "18px 20px", transition: "transform 0.2s, box-shadow 0.2s" },
  statIcon: { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statValue: { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#243E36", lineHeight: 1, marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#9ab5a0", fontWeight: 500 },
  twoCol: { display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#243E36" },
  seeAll: { background: "none", border: "none", color: "#7CA982", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontFamily: "'DM Sans', sans-serif" },
  card: { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, overflow: "hidden" },
  courseCard: { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" },
  courseStripe: { height: 4 },
  courseCardBody: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px 16px 10px" },
  courseCardTitle: { fontSize: 13, fontWeight: 700, color: "#243E36", marginBottom: 2 },
  courseCardTeacher: { fontSize: 11, color: "#9ab5a0" },
  courseCardNext: { fontSize: 10, color: "#9ab5a0", textAlign: "right", marginTop: 1 },
  courseProgressBg: { height: 4, background: "#e8f3ea", margin: "0 16px 12px" },
  courseProgressFill: { height: "100%", borderRadius: 99 },
  assignRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" },
  assignRowFull: { display: "flex", alignItems: "center", gap: 14, padding: "14px 20px" },
  assignTitle: { fontSize: 13, fontWeight: 600, color: "#243E36", marginBottom: 2 },
  assignCourse: { fontSize: 11, color: "#9ab5a0" },
  dueBadge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "#e8f3ea", color: "#1a5c30", whiteSpace: "nowrap", flexShrink: 0 },
  dueBadgeUrgent: { background: "#fce8e8", color: "#8b2020" },
  statusDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  statusPill: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, textTransform: "capitalize", flexShrink: 0 },
  announceRow: { display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px" },
  unreadDot: { width: 8, height: 8, background: "#7CA982", borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  announceTitle: { fontSize: 13, color: "#243E36", marginBottom: 2 },
  announceMeta: { fontSize: 11, color: "#9ab5a0" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e8f3ea", background: "#fafcfa" },
  td: { padding: "12px 16px", fontSize: 13, color: "#243E36", verticalAlign: "middle" },
  gradePill: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "inline-block" },
  progressWrap: { height: 5, background: "#e8f3ea", borderRadius: 99, width: 80, marginBottom: 3 },
  progressBar: { height: "100%", borderRadius: 99 },
  coursesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 },
  courseCardFull: { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 14, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" },
  courseCardHeader: { padding: "22px 20px" },
  courseCardSubject: { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" },
  courseCardTitleFull: { fontSize: 17, fontWeight: 700, color: "#fff", marginTop: 6, lineHeight: 1.3 },
  courseCardFooter: { padding: "16px 20px" },
  avgBanner: { background: "#243E36", borderRadius: 14, padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  avgLabel: { fontSize: 12, color: "rgba(241,247,237,0.5)", marginBottom: 4 },
  avgValue: { fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: "#7CA982" },
  avgIcon: { width: 64, height: 64, background: "rgba(124,169,130,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  filterTabs: { display: "flex", gap: 8 },
  filterTab: { padding: "7px 18px", borderRadius: 8, border: "1px solid #e8f3ea", background: "#fff", color: "#5a7a6e", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  filterTabActive: { background: "#243E36", color: "#fff", border: "1px solid #243E36" },
  emptyState: { padding: "48px 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#243E36", marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: "#9ab5a0", marginBottom: 20 },
  searchInput: { width: "100%", padding: "9px 14px", borderRadius: 9, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 13, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s" },
};

const jm = {
  overlay:   { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:     { background: "#fff", borderRadius: 18, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" },
  header:    { display: "flex", alignItems: "center", gap: 14, padding: "22px 24px 0" },
  headerIcon:{ width: 44, height: 44, background: "#e8f3ea", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title:     { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" },
  subtitle:  { fontSize: 13, color: "#9ab5a0", marginTop: 2 },
  closeBtn:  { background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", marginLeft: "auto", display: "flex", alignItems: "center", padding: 4 },
  body:      { padding: "20px 24px 24px" },
  label:     { fontSize: 13, fontWeight: 600, color: "#243E36" },
  input:     { width: "100%", padding: "14px", borderRadius: 10, border: "1.5px solid #c8ddc9", background: "#fafcfa", fontSize: 22, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
  cancelBtn: { flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" },
  joinBtn:   { flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", border: "none", borderRadius: 9, background: "#243E36", color: "#F1F7ED", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&family=Poppins:wght@600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes logoPulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(124,169,130,0.5); }
    50%      { box-shadow: 0 0 0 6px rgba(124,169,130,0); }
  }
  .logo-glow-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    animation: logoPulseGlow 2.2s ease-in-out infinite;
    flex-shrink: 0;
  }
  .fade-up { animation: fadeUp 0.4s ease both; }
  .stat-card:hover   { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(36,62,54,0.08); }
  .course-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(36,62,54,0.08); }
  .nav-item:hover:not([style*="background: rgb(124"]) { background: rgba(124,169,130,0.1) !important; color: rgba(241,247,237,0.85) !important; }
  .logout-btn:hover  { color: rgba(241,247,237,0.75) !important; }
  .take-btn:hover         { background: #1a2e28 !important; }
  .view-course-btn:hover  { background: #1a2e28 !important; }
  .join-btn:hover         { background: #1a2e28 !important; }
  .join-topbar-btn:hover  { background: #5a8c62 !important; }
  .cancel-btn:hover       { background: #e8f3ea !important; }
  .filter-tab:hover:not([style*="background: rgb(36"]) { background: #e8f3ea !important; border-color: #c8ddc9 !important; }
  .avatar-trigger-btn:hover { background: #e8f3ea !important; }
  .message-btn:hover { background: #e8f3ea !important; }
  .avatar-dropdown-item:hover { background: #f5faf5 !important; }
  .avatar-dropdown-item-danger:hover { background: #fce8e8 !important; }
  .lms-input:focus   { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
  @media (max-width: 900px) {
    .sidebar { position: fixed !important; top: 0; left: 0; bottom: 0; transform: translateX(-100%); z-index: 40; }
    .sidebar[style*="translateX(0)"] { transform: translateX(0) !important; }
    .close-mobile { display: flex !important; }
    .menu-btn     { display: flex !important; }
    div[style*="grid-template-columns: 1.2fr"] { grid-template-columns: 1fr !important; }
    div[style*="repeat(4, 1fr)"]               { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 500px) {
    div[style*="repeat(4, 1fr)"]     { grid-template-columns: repeat(2, 1fr) !important; }
    div[style*="padding: 28px 28px"] { padding: 16px !important; }
    .table-scroll {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
    }
    .table-scroll table {
      min-width: 480px;
    }

    /* Assessment card: stack icon/content/status vertically instead of
       squeezing them into one row that overflows on narrow screens */
    .assessment-card {
      flex-direction: column;
      align-items: stretch !important;
    }
    .assessment-card-icon {
      width: 36px !important;
      height: 36px !important;
    }
    .assessment-card-status {
      width: 100%;
      justify-content: center;
    }
  }
  @media (max-width: 480px) {
    .notif-dropdown {
      position: fixed !important;
      top: 64px !important;
      left: 12px !important;
      right: 12px !important;
      width: auto !important;
      max-width: none !important;
    }
  }
`;
