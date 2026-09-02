// src/pages/teacher/TeacherDashboard.jsx

import TeacherCoursesPage from "./TeacherCoursesPage";
import { getCourseStudents } from "../../services/courseService";
import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, LayoutDashboard, FileText, Star, Bell, Mail, LogOut, Menu, X, ChevronRight, Clock, Users, TrendingUp, Award, CheckCircle2, MessageSquare, Plus, Calendar, Send, AlertCircle, Eye, Trash2, GraduationCap, BookMarked, ClipboardList, Loader2, RefreshCw, Search, ChevronDown, ChevronUp, UserX, ExternalLink, Link, CheckSquare, EyeOff, UserPlus, Sparkles, PartyPopper, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getTeacherDashboardStats, getTeacherPendingSubmissions, getTeacherCourseAnalytics, getTeacherTodaySchedule, getTeacherAssignments, deleteAssignment, getTeacherStudents, getTeacherGradebook, getTeacherAnnouncements, postAnnouncement, deleteAnnouncement, gradeSubmission, saveGradebookConfig, saveManualScore, } from "../../services/teacherService";
import { updateCourseTerms, createStudentAccount } from "../../services/courseService";
import { supabase } from "../../services/supabase";
import { sendSupportRequest, canSendSupportRequest } from "../../services/supportService";
import { createPortal } from "react-dom";
import logo from "../../assets/logo.png";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────
const NAV = [
  { id: "dashboard",    label: "Dashboard",    icon: <LayoutDashboard size={18} /> },
  { id: "courses",      label: "My Courses",   icon: <BookOpen size={18} />        },
  { id: "gradebook",    label: "Gradebook",    icon: <Star size={18} />            },
  { id: "students",     label: "Students",     icon: <Users size={18} />           },
  { id: "announcements",label: "Announcements",icon: <MessageSquare size={18} />   },
  { id: "schedule",     label: "Schedule",     icon: <Calendar size={18} />        },
];

const NOTIF_META = {
  grade:        { color: "#7CA982", icon: "⭐" },
  submission:   { color: "#3b5bdb", icon: "📋" },
  announcement: { color: "#e0a052", icon: "📢" },
  general:      { color: "#9ab5a0", icon: "🔔" },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function stringToColor(str = "") {
  const colors = ["#243E36", "#7CA982", "#4a7c59", "#2d5a45", "#5c8a6a", "#3d6b50"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function validateStudentEmail(email) {
  const trimmed = (email || "").trim().toLowerCase();

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(trimmed)) {
    return "Please enter a valid email address.";
  }

  const [localPart, domain] = trimmed.split("@");
  const domainName = domain.split(".")[0];

  const blockedDomains = ["test.com", "example.com", "asdasd.com", "fake.com", "sample.com", "email.com", "domain.com", "mail.com"];
  if (blockedDomains.includes(domain)) {
    return "This looks like a placeholder email. Please use the student's real email address.";
  }

  if (localPart === domainName) {
    return "This email looks like a test/placeholder. Please use the student's real email address.";
  }

  if (/^(.)\1{3,}$/.test(localPart)) {
    return "Please enter a valid email address.";
  }

  return null; // valid
}

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
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return due.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function statusStyle(status) {
  if (status === "active")   return { background: "#e8f3ea", color: "#1a5c30" };
  if (status === "upcoming") return { background: "#fff8e1", color: "#7a5c00" };
  if (status === "closed")   return { background: "#f0f0f0", color: "#666" };
  return {};
}

function gradeColor(g) {
  if (g == null) return { background: "#f5f5f5", color: "#aaa" };
  if (g >= 90) return { background: "#e8f3ea", color: "#1a5c30" };
  if (g >= 75) return { background: "#fff8e1", color: "#7a5c00" };
  return { background: "#fce8e8", color: "#8b2020" };
}

function getLinkPlatform(url = "") {
  if (!url) return { label: "Link", color: "#7c3aed" };
  const u = url.toLowerCase();
  if (u.includes("github.com"))   return { label: "GitHub",       color: "#24292e" };
  if (u.includes("vercel.app"))   return { label: "Vercel",       color: "#000" };
  if (u.includes("netlify.app"))  return { label: "Netlify",      color: "#00ad9f" };
  if (u.includes("drive.google")) return { label: "Google Drive", color: "#1a73e8" };
  if (u.includes("docs.google"))  return { label: "Google Docs",  color: "#1a73e8" };
  if (u.includes("figma.com"))    return { label: "Figma",        color: "#f24e1e" };
  if (u.includes("youtube.com") || u.includes("youtu.be")) return { label: "YouTube",  color: "#ff0000" };
  if (u.includes("onedrive") || u.includes("1drv"))        return { label: "OneDrive", color: "#0078d4" };
  return { label: "Link", color: "#7c3aed" };
}

function Spinner({ size = 18 }) {
  return <Loader2 size={size} color="#7CA982" style={{ animation: "spin 1s linear infinite" }} />;
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <AlertCircle size={14} color="#c0392b" />
      <span style={{ fontSize: 13, color: "#8b2020", flex: 1 }}>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{ background: "none", border: "1px solid #f5c6c6", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#8b2020", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
          <RefreshCw size={11} /> Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon, text, action, onAction }) {
  return (
    <div style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
      {icon}
      <p style={{ fontSize: 14, color: "#9ab5a0" }}>{text}</p>
      {action && (
        <button onClick={onAction} style={{ background: "#243E36", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          {action}
        </button>
      )}
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
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: "#e8f3ea", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={18} color="#7CA982" />
            </div>
            <div>
              <h2 style={s.modalTitle}>Message Admin</h2>
              <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 1 }}>Send a message directly to your administrator</p>
            </div>
          </div>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {success ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0 16px" }}>
              <div style={{ width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={32} color="#7CA982" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Message sent!</p>
                <p style={{ fontSize: 14, color: "#5a7a6e" }}>Your admin will get back to you soon.</p>
              </div>
              <button style={{ ...s.primaryBtn, justifyContent: "center", width: "100%" }} className="primary-btn" onClick={onClose}>Done</button>
            </div>
          ) : checkingLimit ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}><Spinner size={20} /></div>
          ) : !canSend ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0 16px" }}>
              <div style={{ width: 64, height: 64, background: "#fff8e1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertCircle size={32} color="#e0a052" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Daily limit reached</p>
                <p style={{ fontSize: 14, color: "#5a7a6e" }}>You've already sent a message today. Please try again tomorrow.</p>
              </div>
              <button style={{ ...s.primaryBtn, justifyContent: "center", width: "100%" }} className="primary-btn" onClick={onClose}>Close</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {error && (
                <div style={{ background: "#fce8e8", border: "1px solid #e08080", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div style={s.fieldGroup}>
                <label style={s.label}>What is this about?</label>
                <select
                  value={requestType}
                  onChange={e => setRequestType(e.target.value)}
                  style={{ ...s.input, cursor: "pointer" }}
                  className="lms-input"
                >
                  {requestTypes.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
              </div>

              <div style={s.fieldGroup}>
                <label style={s.label}>Subject</label>
                <input
                  placeholder="Short summary of your message"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={s.input}
                  className="lms-input"
                  maxLength={100}
                />
              </div>

              <div style={s.fieldGroup}>
                <label style={s.label}>Message</label>
                <textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  style={{ ...s.input, resize: "vertical" }}
                  className="lms-input"
                  maxLength={1000}
                />
                <p style={{ fontSize: 11, color: "#9ab5a0", textAlign: "right" }}>{message.length}/1000</p>
              </div>

              <p style={{ fontSize: 11, color: "#9ab5a0" }}>Note: You can send only one message per day.</p>

              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                  onClick={onClose} className="cancel-btn">Cancel</button>
                <button
                  style={{ ...s.primaryBtn, flex: 2, justifyContent: "center", opacity: loading ? 0.7 : 1 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  className="primary-btn"
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
export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();

  const [activePage,  setActivePage]  = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen,           setNotifOpen]           = useState(false);
  const notifRef = useRef(null);
  const [avatarOpen,          setAvatarOpen]          = useState(false);
  const [showChangePassword,  setShowChangePassword]  = useState(false);
  const [showSupportModal,    setShowSupportModal]    = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notifLoading,  setNotifLoading]  = useState(false);

  const [stats,         setStats]         = useState(null);
  const [submissions,   setSubmissions]   = useState([]);
  const [analytics,     setAnalytics]     = useState([]);
  const [todayClasses,  setTodayClasses]  = useState([]);
  const [assignments,   setAssignments]   = useState([]);
  const [students,      setStudents]      = useState([]);
  const [gradebook, setGradebook] = useState({ courses: [], courseData: {} });
  const [announcements, setAnnouncements] = useState([]);
  const [courses,       setCourses]       = useState([]);

  const [loading, setLoading] = useState({
    stats: true, submissions: true, analytics: true, schedule: true,
    assignments: true, students: true, gradebook: true, announcements: true,
  });
  const [errors, setErrors] = useState({});

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));
  const setErr  = (key, val) => setErrors(prev  => ({ ...prev, [key]: val }));

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setNotifLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error) setNotifications(data || []);
    } catch (_) {}
    finally { setNotifLoading(false); }
  }, [user?.id]);

  const handleMarkRead = async (notifId) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (_) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (_) {}
  };

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    setLoad("stats", true); setErr("stats", null);
    try { setStats(await getTeacherDashboardStats(user.id)); }
    catch (e) { setErr("stats", e.message); }
    finally { setLoad("stats", false); }
  }, [user?.id]);

  const fetchSubmissions = useCallback(async () => {
    if (!user?.id) return;
    setLoad("submissions", true); setErr("submissions", null);
    try { setSubmissions(await getTeacherPendingSubmissions(user.id, 10)); }
    catch (e) { setErr("submissions", e.message); }
    finally { setLoad("submissions", false); }
  }, [user?.id]);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;
    setLoad("analytics", true); setErr("analytics", null);
    try { setAnalytics(await getTeacherCourseAnalytics(user.id)); }
    catch (e) { setErr("analytics", e.message); }
    finally { setLoad("analytics", false); }
  }, [user?.id]);

  const fetchSchedule = useCallback(async () => {
    if (!user?.id) return;
    setLoad("schedule", true); setErr("schedule", null);
    try { setTodayClasses(await getTeacherTodaySchedule(user.id)); }
    catch (e) { setErr("schedule", e.message); }
    finally { setLoad("schedule", false); }
  }, [user?.id]);

  const fetchAssignments = useCallback(async () => {
    if (!user?.id) return;
    setLoad("assignments", true); setErr("assignments", null);
    try { setAssignments(await getTeacherAssignments(user.id)); }
    catch (e) { setErr("assignments", e.message); }
    finally { setLoad("assignments", false); }
  }, [user?.id]);

  const fetchStudents = useCallback(async () => {
    if (!user?.id) return;
    setLoad("students", true); setErr("students", null);
    try { setStudents(await getTeacherStudents(user.id)); }
    catch (e) { setErr("students", e.message); }
    finally { setLoad("students", false); }
  }, [user?.id]);

  const fetchGradebook = useCallback(async () => {
    if (!user?.id) return;
    setLoad("gradebook", true); setErr("gradebook", null);
    try { setGradebook(await getTeacherGradebook(user.id)); }
    catch (e) { setErr("gradebook", e.message); }
    finally { setLoad("gradebook", false); }
  }, [user?.id]);

  const fetchAnnouncementsData = useCallback(async () => {
    if (!user?.id) return;
    setLoad("announcements", true); setErr("announcements", null);
    try { setAnnouncements(await getTeacherAnnouncements(user.id)); }
    catch (e) { setErr("announcements", e.message); }
    finally { setLoad("announcements", false); }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
    fetchSubmissions();
    fetchAnalytics();
    fetchSchedule();
    fetchAssignments();
    fetchStudents();
    fetchGradebook();
    fetchAnnouncementsData();
    fetchNotifications();
  }, [fetchStats, fetchSubmissions, fetchAnalytics, fetchSchedule,
      fetchAssignments, fetchStudents, fetchGradebook, fetchAnnouncementsData,
      fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`teacher-dashboard-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { fetchNotifications(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchNotifications]);

  const handleBellClick = () => {
    setNotifOpen(v => !v);
    if (!notifOpen) fetchNotifications();
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

  useEffect(() => {
    if (analytics.length > 0) setCourses(analytics);
  }, [analytics]);

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const displayName      = profile?.full_name ?? user?.email ?? "Teacher";
  const firstName        = displayName.split(" ").find(w => !["Mr.", "Ms.", "Mrs.", "Dr."].includes(w)) ?? displayName.split(" ")[0];
  const initials         = getInitials(displayName);
  const pendingCount     = submissions.length;
  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  const STATS_CARDS = stats ? [
    { label: "Total Students",   value: stats.totalStudents,   icon: <Users size={20} />,        color: "#243E36", sub: "enrolled across all courses" },
    { label: "Active Courses",   value: stats.activeCourses,   icon: <BookMarked size={20} />,   color: "#7CA982", sub: "currently running" },
    { label: "Pending Grading",  value: stats.pendingGrading,  icon: <ClipboardList size={20}/>, color: "#e0a052", sub: stats.pendingGrading > 0 ? "Needs action" : "All caught up!" },
    { label: "Avg. Class Grade", value: stats.avgClassGrade !== null ? `${stats.avgClassGrade}%` : "—", icon: <TrendingUp size={20} />, color: "#4a7c59", sub: "across all graded work" },
  ] : [];

  return (
    <div style={s.root}>
      <style>{css}</style>

      <aside style={{ ...s.sidebar, ...(sidebarOpen ? { transform: "translateX(0)" } : {}) }} className="sidebar">
        <div style={s.sidebarTop}>
          <div style={s.logoWrap}>
            <div className="logo-glow-wrap">
              <img src={logo} alt="EMEGEMA logo" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0, position: "relative", zIndex: 1 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.logoText}>EMEGEMA</p>
              <p style={s.logoSubtext}>Integrated Learning Hub</p>
            </div>
            <button style={s.closeBtn} onClick={() => setSidebarOpen(false)} className="close-btn">
              <X size={18} color="rgba(241,247,237,0.4)" />
            </button>
          </div>
          <div style={s.teacherPill}>
            <div style={{ ...s.avatar, background: stringToColor(initials) }}>{initials}</div>
            <div>
              <p style={s.teacherName}>{displayName}</p>
              <p style={s.teacherRole}>Teacher</p>
            </div>
          </div>
        </div>

        <nav style={s.nav}>
          <p style={s.navLabel}>NAVIGATION</p>
          {NAV.map(item => (
            <button key={item.id}
              onClick={() => { setActivePage(item.id); setSidebarOpen(false);
               if (item.id === "courses") {
              fetchStats();
              fetchAnalytics();}
               if (item.id === "gradebook") {
              fetchGradebook();
              }
               if (item.id === "students") {
              fetchAnalytics();
              fetchStudents();
              }
               }}
              style={{ ...s.navItem, ...(activePage === item.id ? s.navActive : {}) }}
              className="nav-item">
              <span style={{ opacity: activePage === item.id ? 1 : 0.5, display: "flex" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === "submissions" && pendingCount > 0 && (
                <span style={s.badge}>{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {sidebarOpen && <div style={s.sidebarOverlay} onClick={() => setSidebarOpen(false)} />}

      <div style={s.main}>
        <header style={s.topbar}>
          <button style={s.menuBtn} onClick={() => setSidebarOpen(true)} className="menu-btn">
            <Menu size={20} color="#243E36" />
          </button>
          <span style={s.topTitle}>{NAV.find(n => n.id === activePage)?.label}</span>
          <div style={s.topRight}>
            <button style={s.bellBtn} onClick={() => setShowSupportModal(true)} className="icon-btn" title="Message Admin">
              <Mail size={17} color="#243E36" />
            </button>
            <div style={{ position: "relative" }} ref={notifRef}>
              <button style={s.bellBtn} onClick={handleBellClick} className="icon-btn">
                <Bell size={17} color="#243E36" />
                {unreadNotifCount > 0 && <span style={s.bellDot}>{unreadNotifCount}</span>}
              </button>
              {notifOpen && (
                <div style={s.notifBox} className="notif-box">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e8f3ea" }}>
                    <p style={s.notifBoxTitle}>Notifications</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: "#7CA982", fontWeight: 600 }}>{unreadNotifCount} new</span>
                      {unreadNotifCount > 0 && (
                        <button onClick={handleMarkAllRead} style={{ background: "none", border: "none", fontSize: 11, color: "#9ab5a0", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>
                  {notifLoading ? (
                    <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}><Spinner size={16} /></div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: "24px 16px", textAlign: "center", color: "#9ab5a0", fontSize: 13 }}>No notifications yet</div>
                  ) : notifications.map((n, i) => {
                    const meta = NOTIF_META[n.type] ?? NOTIF_META.general;
                    return (
                      <div key={n.id} onClick={() => handleMarkRead(n.id)}
                        style={{ ...s.notifRow, borderTop: i > 0 ? "1px solid #f5faf5" : "none", background: !n.is_read ? "#f8fdf8" : "transparent", cursor: "pointer" }}
                        className="notif-item">
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: !n.is_read ? meta.color : "transparent", marginTop: 5, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 12 }}>{meta.icon}</span>
                            <p style={{ fontSize: 12, fontWeight: !n.is_read ? 700 : 500, color: "#243E36" }}>{n.title}</p>
                          </div>
                          <p style={{ fontSize: 12, color: "#5a7a6e", lineHeight: 1.5 }}>{n.message}</p>
                          <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 3 }}>{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          <div style={{ position: "relative" }}>
              <button
                onClick={() => setAvatarOpen(v => !v)}
                style={s.topbarAvatarBtn}
                className="avatar-trigger-btn"
              >
                <div style={{ ...s.topAvatar, background: stringToColor(initials) }}>{initials}</div>
                <ChevronDown size={13} color="#243E36" style={{ transition: "transform 0.2s", transform: avatarOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>

              {avatarOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setAvatarOpen(false)} />
                  <div style={s.avatarDropdown}>
                    <div style={s.avatarDropdownHeader}>
                      <div style={{ ...s.avatarDropdownAvatar, background: stringToColor(initials) }}>{initials}</div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{displayName}</p>
                        <p style={{ fontSize: 11, color: "#9ab5a0" }}>Teacher</p>
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
              firstName={firstName}
              statsCards={STATS_CARDS}
              statsLoading={loading.stats}
              submissions={submissions}
              submissionsLoading={loading.submissions}
              submissionsError={errors.submissions}
              onRetrySubmissions={fetchSubmissions}
              analytics={analytics}
              analyticsLoading={loading.analytics}
              analyticsError={errors.analytics}
              todayClasses={todayClasses}
              scheduleLoading={loading.schedule}
            />
          )}
          {activePage === "courses" && ( <TeacherCoursesPage onAssessmentChanged={fetchGradebook} />)}
          {activePage === "assignments"   && (
            <AssignmentsPage
              assignments={assignments}
              loading={loading.assignments}
              error={errors.assignments}
              onRefresh={() => {
                fetchAssignments();
                fetchStats();
                fetchSubmissions();
                fetchGradebook();
              }}
            />
          )}
          {activePage === "submissions"   && (
            <SubmissionsPage
              submissions={submissions}
              loading={loading.submissions}
              onRefresh={() => { fetchSubmissions(); fetchStats(); fetchGradebook(); fetchNotifications(); }}
            />
          )}
          {activePage === "gradebook"     && (
            <GradebookPage
              gradebook={gradebook}
              loading={loading.gradebook}
              error={errors.gradebook}
              onRefresh={fetchGradebook}
              teacherId={user?.id}
            />
          )}
          {activePage === "students"      && (
            <StudentsPage
              students={students}
              loading={loading.students}
              error={errors.students}
              onRefresh={fetchStudents}
              courses={analytics}
            />
          )}
          {activePage === "announcements" && (
            <AnnouncementsPage
              announcements={announcements}
              courses={courses}
              loading={loading.announcements}
              error={errors.announcements}
              onRefresh={fetchAnnouncementsData}
              teacherId={user?.id}
            />
          )}
          {activePage === "assessments" && (
            <AssessmentsOverviewPage
              courses={analytics}
              onGoToCourse={(courseId) => {
              setActivePage("courses");
          }}
          />
          )}
{activePage === "attendance" && (
  <AttendanceOverviewPage
    courses={analytics}
    onGoToCourse={() => setActivePage("courses")}
  />
)}
          {activePage === "schedule" && <SchedulePage todayClasses={todayClasses} />}
        </div>
      </div>
            {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {showSupportModal && (
        <SupportRequestModal
          userId={user?.id}
          userRole="teacher"
          onClose={() => setShowSupportModal(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: DASHBOARD HOME
// ─────────────────────────────────────────────
function DashboardHome({ setActivePage, firstName, statsCards, statsLoading, submissions, submissionsLoading, submissionsError, onRetrySubmissions, analytics, analyticsLoading, analyticsError, todayClasses, scheduleLoading }) {
  const today = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const analyticsScrollRef = useRef(null);
  const [analyticsPage, setAnalyticsPage] = useState(0);

  const handleAnalyticsScroll = () => {
    const el = analyticsScrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setAnalyticsPage(idx);
  };

  const goToAnalyticsPage = (idx) => {
    const el = analyticsScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    setAnalyticsPage(idx);
  };

  return (
    <div className="fade-up">
      <div style={s.welcomeRow}>
        <div>
          <h1 style={s.welcomeTitle}>
            Good day, {firstName}! <Sparkles size={22} color="#e0a052" style={{ display: "inline", verticalAlign: "middle", marginLeft: 4 }} />
          </h1>
          <p style={s.welcomeSub}>{today}</p>
        </div>
        <button style={s.primaryBtn} className="primary-btn" onClick={() => setActivePage("courses")}>
          <Plus size={15} /> My Courses
        </button>
      </div>

      <div style={s.statsGrid}>
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ ...s.statCard, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 110 }}>
              <Spinner />
            </div>
          ))
        ) : statsCards.map((st, i) => (
          <div key={i} style={s.statCard} className="stat-card">
            <div style={{ ...s.statIcon, background: st.color + "18", color: st.color }}>{st.icon}</div>
            <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#5a7a6e", marginTop: 8, lineHeight: 1.4 }}>{st.sub}</span>
            <p style={s.statVal}>{st.value}</p>
            <p style={s.statLabel}>{st.label}</p>
          </div>
        ))}
      </div>

      <div style={s.threeCol}>
        <div style={{ gridColumn: "span 2" }}>
          <SectionHead title="Pending Submissions" action="See all" onAction={() => setActivePage("submissions")} />
          {submissionsError && <ErrorBanner message={submissionsError} onRetry={onRetrySubmissions} />}
          <div style={s.card}>
            {submissionsLoading ? (
              <div style={{ padding: "32px", display: "flex", justifyContent: "center" }}><Spinner size={20} /></div>
            ) : submissions.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ab5a0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <PartyPopper size={15} color="#7CA982" /> No pending submissions right now
              </div>
            ) : submissions.slice(0, 5).map((sub, i) => (
              <div key={sub.id} style={{ ...s.subRow, borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                <div style={{ ...s.miniAvatar, background: stringToColor(sub.studentName) }}>{sub.studentInitials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.subName}>{sub.studentName}</p>
                  <p style={s.subDetail}>{sub.assignmentTitle} · <span style={{ color: "#7CA982" }}>{sub.courseName}</span></p>
                </div>
                <span style={s.subTime}>{sub.submittedAgo}</span>
                <button style={s.gradeBtn} className="grade-btn" onClick={() => setActivePage("courses")}>Go to Course</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <SectionHead title="Today's Classes" action="Schedule" onAction={() => setActivePage("schedule")} />
            <div style={s.card}>
              {scheduleLoading ? (
                <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}><Spinner /></div>
              ) : todayClasses.length === 0 ? (
                <div style={{ ...s.emptySmall, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <PartyPopper size={14} color="#7CA982" /> No classes today
                </div>
              ) : todayClasses.map((cls, i) => (
                <div key={i} style={{ ...s.schedRow, borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                  <div style={{ ...s.schedStripe, background: cls.cover_color }} />
                  <div>
                    <p style={s.schedTitle}>{cls.title}</p>
                    <p style={s.schedMeta}>{cls.schedule}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHead title="Quick Actions" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "My Courses",    page: "courses",       icon: <BookOpen size={14} />,      color: "#243E36" },
                { label: "Gradebook",     page: "gradebook",     icon: <Star size={14} />,          color: "#7CA982" },
                { label: "Announcements", page: "announcements", icon: <MessageSquare size={14} />, color: "#4a7c59" },
              ].map(q => (
                <button key={q.page} onClick={() => setActivePage(q.page)} style={{ ...s.quickLink, borderLeft: `3px solid ${q.color}` }} className="quick-link">
                  <span style={{ color: q.color, display: "flex" }}>{q.icon}</span>
                  {q.label}
                  <ChevronRight size={13} color="#c8ddc9" style={{ marginLeft: "auto" }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionHead title="Course Analytics" action="My Courses" onAction={() => setActivePage("courses")} />
        {analyticsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}><Spinner size={24} /></div>
        ) : analytics.length === 0 ? (
          <div style={{ ...s.card, padding: "32px", textAlign: "center", color: "#9ab5a0", fontSize: 14 }}>
            No courses yet. <button onClick={() => setActivePage("courses")} style={{ color: "#7CA982", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Create one →</button>
          </div>
        ) : (
          <>
            <div style={s.analyticsGrid} className="analytics-grid" ref={analyticsScrollRef} onScroll={handleAnalyticsScroll}>
              {analytics.map(c => (
                <div key={c.id} style={s.analyticsCard} className="stat-card analytics-card">
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ ...s.courseColorDot, background: c.cover_color }} />
                    <div>
                      <p style={s.analyticsTitle}>{c.title}</p>
                      <p style={s.analyticsSub}>{c.students} student{c.students !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div style={s.analyticsRow2}>
                    <div>
                      <p style={s.analyticsNum}>{c.avgGrade !== null ? `${c.avgGrade}%` : "—"}</p>
                      <p style={s.analyticsMeta}>Avg. Grade</p>
                    </div>
                    <div>
                      <p style={{ ...s.analyticsNum, color: c.pendingSubmissions > 0 ? "#e0a052" : "#7CA982" }}>{c.pendingSubmissions}</p>
                      <p style={s.analyticsMeta}>Pending</p>
                    </div>
                    <div>
                      <p style={s.analyticsNum}>{c.schedule ? c.schedule.split(" ")[0] : "—"}</p>
                      <p style={s.analyticsMeta}>Days</p>
                    </div>
                  </div>
                  <div style={s.gradeBarBg}>
                    <div style={{ ...s.gradeBarFill, width: `${c.avgGrade ?? 0}%`, background: c.cover_color }} />
                  </div>
                </div>
              ))}
            </div>
            {analytics.length > 1 && (
              <div className="analytics-pager">
                {analytics.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToAnalyticsPage(idx)}
                    className={`analytics-dot ${analyticsPage === idx ? "analytics-dot-active" : ""}`}
                    aria-label={`Go to course ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: CREATE STUDENT ACCOUNT (Dashboard)
// ─────────────────────────────────────────────
function CreateStudentAccountModal({ courses, onClose, onCreated }) {
  const [form, setForm]       = useState({ fullName: "", email: "", password: "", courseId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [success, setSuccess] = useState(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.fullName.trim())              { setError("Full name is required.");  return; }
    if (!form.email.trim())                 { setError("Email is required.");      return; }
    const emailError = validateStudentEmail(form.email);
    if (emailError)                         { setError(emailError);                return; }
    if (!form.password || form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!form.courseId)                     { setError("Please select a course."); return; }
    if (!consentConfirmed) { setError("Please confirm authorization before creating this account."); return; }

    setLoading(true); setError("");
    try {
      const student = await createStudentAccount({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        courseId: form.courseId,
        consentConfirmed: true,
      });
      setSuccess(student);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return createPortal(
      <div style={s.modalOverlay} onClick={onClose}>
        <div style={{ ...s.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={32} color="#7CA982" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Student account created!</p>
              <p style={{ fontSize: 14, color: "#5a7a6e" }}>{success.full_name} ({success.email}) can now log in.</p>
            </div>
            <button style={{ ...s.primaryBtn, justifyContent: "center", width: "100%" }} className="primary-btn" onClick={() => onCreated(success)}>
              Done
            </button>
          </div>
        </div>
      </div>
    , document.body);
  }

  if (courses.length === 0) {
    return createPortal(
      <div style={s.modalOverlay} onClick={onClose}>
        <div style={{ ...s.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
          <div style={s.modalHead}>
            <h2 style={s.modalTitle}>Create Student Account</h2>
            <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
          </div>
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, background: "#fff8e1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={26} color="#e0a052" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Create a course first</p>
              <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6 }}>
                Every student needs to be enrolled in at least one course. Create your first course, then come back here to add students.
              </p>
            </div>
            <button
              style={{ ...s.primaryBtn, width: "100%", justifyContent: "center" }}
              className="primary-btn"
              onClick={onClose}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    , document.body);
  }

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h2 style={s.modalTitle}>Create Student Account</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div style={{ background: "#fce8e8", border: "1px solid #e08080", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", display: "flex", gap: 8, alignItems: "center" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div style={s.fieldGroup}>
            <label style={s.label}>Course <span style={{ color: "#e05252" }}>*</span></label>
            <select value={form.courseId} onChange={e => set("courseId", e.target.value)} style={s.input} className="lms-input">
              <option value="">Select a course…</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Full Name <span style={{ color: "#e05252" }}>*</span></label>
            <input
              placeholder="e.g. Juan Dela Cruz"
              value={form.fullName}
              onChange={e => set("fullName", e.target.value)}
              style={s.input}
              className="lms-input"
              autoFocus
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Email <span style={{ color: "#e05252" }}>*</span></label>
            <input
              type="email"
              placeholder="student@example.com"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              style={s.input}
              className="lms-input"
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Password <span style={{ color: "#e05252" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                placeholder="At least 6 characters"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                style={{ ...s.input, paddingRight: 40 }}
                className="lms-input"
              />
              <button
                type="button"
                onClick={() => setShowPw(prev => !prev)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex" }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, background: consentConfirmed ? "#e8f3ea" : "#F1F7ED", border: `1.5px solid ${consentConfirmed ? "#c8ddc9" : "#e8f3ea"}`, transition: "all 0.15s" }}>
            <input
              type="checkbox"
              checked={consentConfirmed}
              onChange={e => setConsentConfirmed(e.target.checked)}
              style={{ marginTop: 2, accentColor: "#7CA982", width: 16, height: 16, flexShrink: 0, cursor: "pointer" }}
            />
            <span style={{ fontSize: 12, color: "#243E36", lineHeight: 1.5 }}>
              I confirm that I am authorized to create this student account and that any required parent/guardian consent has been obtained.
            </span>
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !consentConfirmed}
            style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", opacity: (loading || !consentConfirmed) ? 0.5 : 1, cursor: (loading || !consentConfirmed) ? "not-allowed" : "pointer" }}
            className="primary-btn"
          >
            {loading
              ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Creating…</>
              : <><UserPlus size={15} /> Create Account</>
            }
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// PAGE: ASSIGNMENTS
// ─────────────────────────────────────────────
function AssignmentsPage({ assignments, loading, error, onRefresh }) {
  const [filter,    setFilter]    = useState("all");
  const [viewingId, setViewingId] = useState(null);

  const filtered = filter === "all" ? assignments : assignments.filter(a => a.status === filter);
  const viewing  = viewingId ? assignments.find(a => a.id === viewingId) : null;

  if (viewing) {
    return (
      <AssignmentSubmissionsView
        assignment={viewing}
        onBack={() => setViewingId(null)}
        onGraded={onRefresh}
      />
    );
  }

  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>Assignments</h1>
          <p style={s.pageSub}>Track and grade assignments across all your courses.</p>
        </div>
      </div>

      <div style={s.filterRow}>
        {["all", "active", "closed"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ ...s.filterTab, ...(filter === f ? s.filterActive : {}) }}
            className="filter-tab">
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={onRefresh} />}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <div style={s.card}>
          <EmptyState icon={<FileText size={32} color="#c8ddc9" />} text="No assignments yet. Create one from My Courses." />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(a => {
            const submitRate   = a.totalStudents > 0 ? Math.round((a.submittedCount / a.totalStudents) * 100) : 0;
            const missingCount = Math.max(0, a.totalStudents - a.submittedCount);
            const isOverdue    = a.due_date && new Date(a.due_date) < new Date();
            const typeColor    = a.assignment_type === "link" ? "#7c3aed" :
                                 a.assignment_type === "project" ? "#e0a052" :
                                "#4a7c59";
            const typeLabel    = a.assignment_type === "link" ? "Link" : 
                                 a.assignment_type === "essay" ? "Essay" :
                                 a.assignment_type === "project" ? "Project" : 
                                 "Assignment";

            return (
              <div key={a.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 16, alignItems: "flex-start", borderLeft: `4px solid ${typeColor}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: typeColor + "18", color: typeColor }}>{typeLabel}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f3ea", color: "#1a5c30" }}>{a.status}</span>
                    {a.due_date && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: isOverdue ? "#fce8e8" : "#fff8e1", color: isOverdue ? "#8b2020" : "#7a5c00", display: "flex", alignItems: "center", gap: 3 }}>
                        <Clock size={9} /> {formatDue(a.due_date)}
                      </span>
                    )}
                    {missingCount > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#fce8e8", color: "#8b2020" }}>{missingCount} missing</span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36", marginBottom: 2 }}>{a.title}</p>
                  <p style={{ fontSize: 12, color: "#7CA982", marginBottom: 10 }}>{a.courseName}</p>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "#9ab5a0" }}><strong style={{ color: "#243E36" }}>{a.submittedCount}</strong> of {a.totalStudents} submitted</span>
                      <span style={{ fontSize: 11, color: "#9ab5a0" }}>{submitRate}%</span>
                    </div>
                    <div style={{ height: 5, background: "#e8f3ea", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${submitRate}%`, background: submitRate === 100 ? "#7CA982" : submitRate > 50 ? "#e0a052" : "#e05252", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#9ab5a0", display: "flex", alignItems: "center", gap: 4 }}><Users size={11} /> {a.submittedCount} submitted</span>
                    <span style={{ fontSize: 11, color: "#9ab5a0", display: "flex", alignItems: "center", gap: 4 }}><Star size={11} /> {a.gradedCount} graded</span>
                    {a.maxPoints && <span style={{ fontSize: 11, color: "#9ab5a0", display: "flex", alignItems: "center", gap: 4 }}><Award size={11} /> {a.maxPoints} pts</span>}
                  </div>
                </div>
                <button onClick={() => setViewingId(a.id)} style={{ ...s.primaryBtn, flexShrink: 0 }} className="primary-btn">
                  <Eye size={13} /> View Submissions
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ASSIGNMENT SUBMISSIONS VIEW
// ─────────────────────────────────────────────
function AssignmentSubmissionsView({ assignment: a, onBack, onGraded }) {
  const [submissions,   setSubmissions]   = useState([]);
  const [missing,       setMissing]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeSection, setActiveSection] = useState("submitted");
  const [grading,       setGrading]       = useState(null);
  const [gradeScore,    setGradeScore]    = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [saving,        setSaving]        = useState(false);
  const [expandedId,    setExpandedId]    = useState(null);

  const isEssay = a?.assignment_type === "essay";
  const isLink  = a?.assignment_type === "link";

  useEffect(() => {
const load = async () => {
  setLoading(true);
  try {
    const { data: subs, error: subError } = await supabase
      .from("submissions")
      .select(`
        id, status, grade, feedback, notes,
        essay_answer, file_url, demo_url,
        student_id, submitted_at
      `)
      .eq("assignment_id", a.id)
      .order("submitted_at", { ascending: false });

    if (subError) console.error("Submissions fetch error:", subError);

    // Fetch profiles separately
    const studentIds = (subs || []).map(s => s.student_id).filter(Boolean);
    let profileMap = {};

    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds);

      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }

    const mapped = (subs || []).map(s => ({
      id:           s.id,
      status:       s.status,
      grade:        s.grade,
      feedback:     s.feedback,
      notes:        s.notes,
      essay_answer: s.essay_answer,
      file_url:     s.file_url,
      demo_url:     s.demo_url,
      studentId:    s.student_id,
      submitted_at: s.submitted_at,
      studentName:  profileMap[s.student_id]?.full_name ?? "Unknown",
      studentEmail: profileMap[s.student_id]?.email ?? "",
    }));

    setSubmissions(mapped);

    const enrolled = await getCourseStudents(a.courseId);
    const submittedIds = new Set(mapped.map(s => s.studentId).filter(Boolean));
    setMissing(enrolled.filter(s => !submittedIds.has(s.id)));

  } catch (e) { 
    console.error("Load error:", e); 
  }
  finally { setLoading(false); }
};
    load();
  }, [a.id, a.courseId]);

  const handleGrade = async () => {
  if (gradeScore === "" || gradeScore === null) return;
  const finalScore = Number(gradeScore);
  if (isNaN(finalScore) || finalScore < 0) return;
  if (finalScore > a.maxPoints) {
    alert(`Score cannot exceed ${a.maxPoints} pts.`);
    return;
  }
  setSaving(true);
  try {
    await gradeSubmission({ submissionId: grading.id, grade: finalScore, feedback: gradeFeedback });
      setSubmissions(prev => prev.map(s => s.id === grading.id
        ? { ...s, grade: Number(gradeScore), feedback: gradeFeedback, status: "graded" }
        : s
      ));
      setGrading(null);
      onGraded();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const pendingGrade = submissions.filter(s => s.status !== "graded").length;
  const avgScore = submissions.filter(s => s.grade != null).length > 0
    ? Math.round(submissions.filter(s => s.grade != null).reduce((sum, s) => sum + (s.grade / (a.maxPoints || 100)) * 100, 0) / submissions.filter(s => s.grade != null).length)
    : null;

  const typeColor = isLink ? "#7c3aed" : "#4a7c59";
  const typeLabel = isLink ? "Link Submission" : isEssay ? "Essay" : "Assignment";

  return (
    <div className="fade-up">
      <button onClick={onBack}
        style={{ background: "none", border: "none", color: "#7CA982", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 4 }}
        className="back-btn">
        ← Back to Assignments
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: typeColor + "18", color: typeColor }}>{typeLabel}</span>
            <span style={{ fontSize: 11, color: "#9ab5a0" }}>{a.courseName}</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: "#243E36" }}>{a.title}</h1>
          <p style={{ fontSize: 13, color: "#9ab5a0", marginTop: 4 }}>{submissions.length} submitted · {missing.length} missing · {a.maxPoints} pts</p>
        </div>
        {avgScore !== null && (
          <div style={{ background: "#243E36", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "rgba(241,247,237,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Class Average</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#7CA982" }}>{avgScore}%</p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setActiveSection("submitted")}
          style={{ padding: "8px 20px", borderRadius: 9, border: "1.5px solid #e8f3ea", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s", ...(activeSection === "submitted" ? { background: "#243E36", borderColor: "#243E36", color: "#fff" } : { background: "#fff", color: "#5a7a6e" }) }}>
          <Users size={14} /> Submitted ({submissions.length})
          {pendingGrade > 0 && <span style={{ background: "#e0a052", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{pendingGrade} to grade</span>}
        </button>
        <button onClick={() => setActiveSection("missing")}
          style={{ padding: "8px 20px", borderRadius: 9, border: "1.5px solid #e8f3ea", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s", ...(activeSection === "missing" ? { background: "#e05252", borderColor: "#e05252", color: "#fff" } : { background: "#fff", color: "#5a7a6e" }) }}>
          <UserX size={14} /> Missing ({missing.length})
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : activeSection === "submitted" ? (
        submissions.length === 0 ? (
          <div style={s.card}><EmptyState icon={<FileText size={32} color="#c8ddc9" />} text="No submissions yet." /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {submissions.map(sub => {
              const pct      = sub.grade != null ? Math.round((sub.grade / (a.maxPoints || 100)) * 100) : null;
              const expanded = expandedId === sub.id;
              const platform = isLink ? getLinkPlatform(sub.file_url) : null;
              const wordCount = sub.essay_answer ? sub.essay_answer.trim().split(/\s+/).filter(Boolean).length : 0;

              return (
                <div key={sub.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
                    <div style={{ ...s.miniAvatar, background: stringToColor(sub.studentName) }}>{getInitials(sub.studentName)}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{sub.studentName}</p>
                      <p style={{ fontSize: 11, color: "#9ab5a0" }}>
                        {sub.studentEmail}
                        {isEssay && sub.essay_answer && <span style={{ marginLeft: 8, color: "#7CA982" }}>{wordCount} words</span>}
                        {isLink && sub.file_url && platform && <span style={{ marginLeft: 8, fontWeight: 600, color: platform.color }}>{platform.label}</span>}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {pct !== null ? (
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: pct >= 75 ? "#1a5c30" : "#8b2020" }}>{pct}%</p>
                          <p style={{ fontSize: 10, color: "#9ab5a0" }}>{sub.grade}/{a.maxPoints}</p>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: "#fff8e1", color: "#7a5c00" }}>Needs grading</span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: sub.status === "graded" ? "#e8f3ea" : "#fff8e1", color: sub.status === "graded" ? "#1a5c30" : "#7a5c00" }}>{sub.status}</span>
                      {((isEssay && sub.essay_answer) || (isLink && sub.file_url)) && (
                        <button style={{ background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#5a7a6e" }}
                          onClick={() => setExpandedId(expanded ? null : sub.id)} className="icon-action-btn">
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      <button style={s.primaryBtn} className="primary-btn"
                        onClick={() => { setGrading(sub); setGradeScore(sub.grade ?? ""); setGradeFeedback(sub.feedback ?? ""); }}>
                        <Star size={13} /> {sub.status === "graded" ? "Edit Grade" : "Grade"}
                      </button>
                    </div>
                  </div>

                  {isEssay && expanded && sub.essay_answer && (
                    <div style={{ borderTop: "1px solid #e8f3ea", padding: "16px 18px", background: "#fafcfa" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#7CA982", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Student's Essay · {wordCount} words</p>
                      <div style={{ fontSize: 14, color: "#243E36", lineHeight: 1.8, whiteSpace: "pre-wrap", background: "#fff", border: "1px solid #e8f3ea", borderRadius: 8, padding: "14px 16px" }}>{sub.essay_answer}</div>
                      {sub.feedback && (
                        <div style={{ marginTop: 12, padding: "10px 14px", background: "#e8f3ea", borderRadius: 8 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#4a7c59", marginBottom: 4 }}>Your Feedback</p>
                          <p style={{ fontSize: 13, color: "#243E36" }}>{sub.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {isLink && expanded && sub.file_url && platform && (
                    <div style={{ borderTop: "1px solid #e8f3ea", padding: "16px 18px", background: "#fafcfa" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Submitted Link</p>
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
                        <div style={{ background: "#F1F7ED", borderRadius: 8, padding: "10px 14px", marginBottom: sub.feedback ? 10 : 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#4a7c59", marginBottom: 4 }}>Student's Notes</p>
                          <p style={{ fontSize: 13, color: "#243E36", lineHeight: 1.6 }}>{sub.notes}</p>
                        </div>
                      )}
                      {sub.feedback && (
                        <div style={{ padding: "10px 14px", background: "#e8f3ea", borderRadius: 8 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#4a7c59", marginBottom: 4 }}>Your Feedback</p>
                          <p style={{ fontSize: 13, color: "#243E36" }}>{sub.feedback}</p>
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
          <div style={s.card}><EmptyState icon={<CheckCircle2 size={32} color="#7CA982" />} text="All students submitted! 🎉" /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <UserX size={16} color="#c0392b" />
              <p style={{ fontSize: 13, color: "#8b2020" }}>
                <strong>{missing.length} student{missing.length !== 1 ? "s" : ""}</strong> {missing.length !== 1 ? "have" : "has"} not submitted
                {a.due_date && new Date(a.due_date) < new Date() ? " — overdue" : ""}
              </p>
            </div>
            {missing.map(student => (
              <div key={student.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderLeft: "3px solid #e05252" }}>
                <div style={{ ...s.miniAvatar, background: stringToColor(student.full_name) }}>{getInitials(student.full_name)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{student.full_name}</p>
                  <p style={{ fontSize: 11, color: "#9ab5a0" }}>{student.email}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "#fce8e8", color: "#8b2020" }}>Not submitted</span>
              </div>
            ))}
          </div>
        )
      )}

      {grading && (
        <div style={s.modalOverlay} onClick={() => setGrading(null)}>
          <div style={{ ...s.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h2 style={s.modalTitle}>{isLink ? "Grade Link Submission" : "Grade Essay"}</h2>
              <button style={s.modalClose} onClick={() => setGrading(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
              <p style={s.modalSub}><strong>{grading.studentName}</strong> · {a.title}</p>

              {isEssay && grading.essay_answer && (
                <div style={{ background: "#F1F7ED", borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#7CA982", marginBottom: 8 }}>Essay · {grading.essay_answer.trim().split(/\s+/).filter(Boolean).length} words</p>
                  <div style={{ fontSize: 13, color: "#243E36", lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>{grading.essay_answer}</div>
                </div>
              )}

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
                        <p style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.label}</p>
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

              {a.description && (
                <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 8, padding: "10px 14px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9ab5a0", marginBottom: 4 }}>Prompt / Instructions</p>
                  <p style={{ fontSize: 12, color: "#5a7a6e", lineHeight: 1.6 }}>{a.description}</p>
                </div>
              )}

              <div style={s.fieldGroup}>
  <label style={s.label}>Score (out of {a.maxPoints})</label>
  <input
    type="number" min="0" max={a.maxPoints}
    placeholder={`0 – ${a.maxPoints}`}
    value={gradeScore}
    onChange={e => {
      const val = e.target.value;
      if (val === "") { setGradeScore(""); return; }
      const num = Number(val);
      if (!isNaN(num)) setGradeScore(Math.min(Math.max(0, num), a.maxPoints));
    }}
    style={{
      ...s.input,
      borderColor: gradeScore !== "" && Number(gradeScore) > a.maxPoints ? "#e05252" : "#c8ddc9",
    }}
    className="lms-input"
  />
  {gradeScore !== "" && Number(gradeScore) > a.maxPoints && (
    <p style={{ fontSize: 12, color: "#e05252", marginTop: 4 }}>
      ⚠ Score cannot exceed {a.maxPoints} pts
    </p>
  )}
  {gradeScore !== "" && Number(gradeScore) < 0 && (
    <p style={{ fontSize: 12, color: "#e05252", marginTop: 4 }}>
      ⚠ Score cannot be negative
    </p>
  )}
</div>
<div style={s.fieldGroup}>
  <label style={s.label}>Feedback for student</label>
                <textarea placeholder="Write constructive feedback…" value={gradeFeedback}
                  onChange={e => setGradeFeedback(e.target.value)} rows={4}
                  style={{ ...s.input, resize: "vertical" }} className="lms-input" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
  style={{
    ...s.primaryBtn, flex: 1, justifyContent: "center",
    opacity: (saving || gradeScore === "" || Number(gradeScore) > a.maxPoints) ? 0.5 : 1,
    cursor: (saving || gradeScore === "" || Number(gradeScore) > a.maxPoints) ? "not-allowed" : "pointer",
  }}
  className="primary-btn"
  onClick={handleGrade}
  disabled={saving || gradeScore === "" || Number(gradeScore) > a.maxPoints}>
  {saving ? <><Spinner size={14} /> Saving…</> : <><Send size={14} /> Submit Grade</>}
</button>
<button style={{ ...s.actionBtn, flex: 1, justifyContent: "center" }} className="action-btn"
  onClick={() => setGrading(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: SUBMISSIONS
// ─────────────────────────────────────────────
function SubmissionsPage({ submissions, loading, onRefresh }) {
  const [grading,   setGrading]   = useState(null);
  const [grade,     setGrade]     = useState("");
  const [feedback,  setFeedback]  = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleGrade = async () => {
    if (!grade || isNaN(Number(grade))) { setSaveError("Please enter a valid score."); return; }
    setSaving(true); setSaveError("");
    try {
      await gradeSubmission({ submissionId: grading.id, grade: Number(grade), feedback });
      setGrading(null);
      onRefresh();
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={s.pageTitle}>Pending Submissions</h1>
          <p style={s.pageSub}>Review and grade student work.</p>
        </div>
        <button onClick={onRefresh} style={{ ...s.primaryBtn, background: "#F1F7ED", color: "#243E36", border: "1px solid #e8f3ea" }} className="icon-btn">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={{ padding: "40px", display: "flex", justifyContent: "center" }}><Spinner size={24} /></div>
        ) : submissions.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={32} color="#c8ddc9" />} text="No pending submissions — all caught up!" />
        ) : submissions.map((sub, i) => (
          <div key={sub.id} style={{ ...s.subRowFull, borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
            <div style={{ ...s.miniAvatar, background: stringToColor(sub.studentName), width: 40, height: 40, fontSize: 13 }}>
              {sub.studentInitials}
            </div>
            <div style={{ flex: 1 }}>
              <p style={s.subName}>{sub.studentName}</p>
              <p style={s.subDetail}>{sub.assignmentTitle}</p>
              <p style={{ ...s.subDetail, color: "#7CA982" }}>{sub.courseName} · {sub.submittedAgo}</p>
            </div>
            <button style={s.primaryBtn} className="primary-btn"
              onClick={() => { setGrading(sub); setGrade(""); setFeedback(""); setSaveError(""); }}>
              <Star size={14} /> Grade
            </button>
          </div>
        ))}
      </div>

      {grading && (
        <div style={s.modalOverlay} onClick={() => setGrading(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h2 style={s.modalTitle}>Grade Submission</h2>
              <button style={s.modalClose} onClick={() => setGrading(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <p style={s.modalSub}><strong>{grading.studentName}</strong> · {grading.assignmentTitle}</p>
              {saveError && <ErrorBanner message={saveError} />}
              <div style={s.fieldGroup}>
                <label style={s.label}>Score</label>
                <input type="number" min="0" max="100" placeholder="e.g. 88" value={grade}
                  onChange={e => setGrade(e.target.value)} style={s.input} className="lms-input" />
              </div>
              <div style={{ ...s.fieldGroup, marginTop: 14 }}>
                <label style={s.label}>Feedback (optional)</label>
                <textarea placeholder="Write feedback for the student..." value={feedback}
                  onChange={e => setFeedback(e.target.value)} style={{ ...s.input, height: 90, resize: "vertical" }} className="lms-input" />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
  style={{
    ...s.primaryBtn, flex: 1, justifyContent: "center",
    opacity: (saving || !grade || isNaN(Number(grade)) || Number(grade) < 0) ? 0.5 : 1,
    cursor: (saving || !grade || isNaN(Number(grade)) || Number(grade) < 0) ? "not-allowed" : "pointer",
  }}
  className="primary-btn"
  onClick={handleGrade}
  disabled={saving || !grade || isNaN(Number(grade)) || Number(grade) < 0}>
  {saving ? <><Spinner size={14} /> Saving…</> : <><Send size={14} /> Submit Grade</>}
</button>
<button style={{ ...s.actionBtn, flex: 1, justifyContent: "center" }} className="action-btn"
  onClick={() => setGrading(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: GRADEBOOK
// ─────────────────────────────────────────────
function GradebookPage({ gradebook, loading, error, onRefresh, teacherId }) {
  const { courses = [], courseData = {} } = gradebook;
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");


  useEffect(() => {
    if (courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0].id);
    }
  }, [courses]);

  const current = selectedCourse ? courseData[selectedCourse] : null;

  const showSaved = (msg = "Saved!") => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(""), 3000);
  };


const handleExport = () => {
  if (!current) return;
  const {
    course, config, students,
    assignments, assessments,
    assignSubMap, assessSubMap, manualMap,
    terms = [],
  } = current;

  const quizIds           = config.quiz_assessment_ids       || [];
  const examIds           = config.exam_assessment_ids       || [];
  const activityAssessIds = config.activity_assessment_ids   || [];
  const assignmentIds3    = config.assignment_assignment_ids || [];
  const activityIds       = config.activity_assignment_ids   || [];


  const buildSheetData = (termId, termLabel) => {
    const termAssessments = termId ? assessments.filter(a => a.term_id === termId) : assessments;
    const termAssignments = termId ? assignments.filter(a => a.term_id === termId) : assignments;

    const quizItems           = termAssessments.filter(a => quizIds.includes(a.id));
    const examItems           = termAssessments.filter(a => examIds.includes(a.id));
    const activityAssessItems = termAssessments.filter(a => activityAssessIds.includes(a.id));
    const assignmentItems3    = termAssignments.filter(a => assignmentIds3.includes(a.id));
    const activityItems       = termAssignments.filter(a => activityIds.includes(a.id));
    const projectItems  = termAssignments.filter(a => a.assignment_type === "project");

    const headers = [
      "Student",
      ...quizItems.flatMap(q     => [`Quiz: ${q.title} (out of ${q.max_points ?? q.total_points ?? 100})`, "Date Taken"]),
      ...examItems.flatMap(e     => [`Exam: ${e.title} (out of ${e.max_points ?? e.total_points ?? 100})`, "Date Taken"]),
      ...assignmentItems3.flatMap(a => [`Assignment: ${a.title} (out of ${a.max_points})`, "Date Submitted"]),
      ...activityAssessItems.flatMap(a => [`Activity: ${a.title} (out of ${a.max_points ?? 100})`, "Date Taken"]),
      ...activityItems.flatMap(a => [`Activity: ${a.title} (out of ${a.max_points})`, "Date Submitted"]),
      ...projectItems.flatMap(p  => [`Project: ${p.title} (out of ${p.max_points})`, "Date Submitted"]),
      "Recitation",
    ];


    const cellWithDate = (value, dateStr) => {
      if (value == null) return "—";
      if (!dateStr) return value;
      const formatted = new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
      return `${value} (${formatted})`;
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return "—";
      return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    };

    const rows = students.map(st => {
      const quizPairs = quizItems.flatMap(q => {
        const sub = assessSubMap?.[q.id]?.[st.id];
        return [(!sub || sub.score == null) ? "—" : sub.score, formatDate(sub?.date)];
      });
      const examPairs = examItems.flatMap(e => {
        const sub = assessSubMap?.[e.id]?.[st.id];
        return [(!sub || sub.score == null) ? "—" : sub.score, formatDate(sub?.date)];
      });
      const assignmentPairs3 = assignmentItems3.flatMap(a => {
        const sub = assignSubMap?.[a.id]?.[st.id];
        return [(!sub || sub.grade == null) ? "—" : sub.grade, formatDate(sub?.date)];
      });
      const activityAssessPairs = activityAssessItems.flatMap(a => {
        const sub = assessSubMap?.[a.id]?.[st.id];
        return [(!sub || sub.score == null) ? "—" : sub.score, formatDate(sub?.date)];
      });
      const activityPairs = activityItems.flatMap(a => {
        const sub = assignSubMap?.[a.id]?.[st.id];
        return [(!sub || sub.grade == null) ? "—" : sub.grade, formatDate(sub?.date)];
      });
      const projectPairs = projectItems.flatMap(p => {
        const sub = assignSubMap?.[p.id]?.[st.id];
        return [(!sub || sub.grade == null) ? "—" : sub.grade, formatDate(sub?.date)];
      });

      return [
        st.name,
        ...quizPairs,
        ...examPairs,
        ...assignmentPairs3,
        ...activityAssessPairs,
        ...activityPairs,
        ...projectPairs,
        manualMap?.[st.id]?.recitation ?? "—",
      ];
    });

    return [headers, ...rows];
  };


  const safeSheetName = (label, fallback) => {
    const cleaned = (label || fallback).replace(/[:\\/?*[\]]/g, "").trim();
    return cleaned.slice(0, 31) || fallback;
  };

  const workbook = XLSX.utils.book_new();

  if (terms.length === 0) {

    const data = buildSheetData(null, "All");
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Gradebook");
  } else {

    terms.forEach((term, i) => {
      const data = buildSheetData(term.id, term.label);
      const sheet = XLSX.utils.aoa_to_sheet(data);
      const sheetName = safeSheetName(term.label, `Term ${i + 1}`);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });
  }

  XLSX.writeFile(workbook, `${course.title}_gradebook.xlsx`);
};

  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>Gradebook</h1>
          <p style={s.pageSub}>Configure and track scores per course. Export to CSV for Excel computation.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
          <button onClick={onRefresh} style={{ ...s.primaryBtn, background: "#F1F7ED", color: "#243E36", border: "1px solid #e8f3ea" }} className="icon-btn">
            <RefreshCw size={14} /> Refresh
          </button>
          {current && (
            <button onClick={handleExport} style={s.primaryBtn} className="primary-btn">
              ⬇ Export CSV
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={onRefresh} />}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : courses.length === 0 ? (
        <div style={s.card}><EmptyState icon={<Star size={32} color="#c8ddc9" />} text="No active courses found." /></div>
      ) : (
        <>
          {/* Course tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {courses.map(c => (
              <button key={c.id}
                onClick={() => setSelectedCourse(c.id)}
                style={{
                  padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                  border: selectedCourse === c.id ? `2px solid ${c.cover_color || "#243E36"}` : "1.5px solid #e8f3ea",
                  background: selectedCourse === c.id ? (c.cover_color || "#243E36") : "#fff",
                  color: selectedCourse === c.id ? "#fff" : "#5a7a6e",
                  display: "flex", alignItems: "center", gap: 7,
                }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: selectedCourse === c.id ? "rgba(255,255,255,0.6)" : (c.cover_color || "#243E36"), flexShrink: 0 }} />
                {c.title}
              </button>
            ))}
          </div>

          {current && (
          <CourseGradebook
          key={selectedCourse + JSON.stringify(current.config) + current.assessments.length + current.assignments.length}
          data={current}
          teacherId={teacherId}
          onSaved={showSaved}
          onRefresh={onRefresh}
  />
)}
        </>
      )}
    </div>
  );
}

function AssessmentsOverviewPage({ courses, onGoToCourse }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!courses.length) { setLoading(false); return; }
      const courseIds = courses.map(c => c.id);
      const { data } = await supabase
        .from("assessments")
        .select("id, title, type, status, due_date, max_points, course_id, courses(title, cover_color)")
        .in("course_id", courseIds)
        .order("due_date", { ascending: true });
      setAssessments(data || []);
      setLoading(false);
    };
    load();
  }, [courses]);

  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>Assessments</h1>
          <p style={s.pageSub}>All assessments across your courses.</p>
        </div>
      </div>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner size={24} /></div>
      ) : assessments.length === 0 ? (
        <div style={{ ...s.card, padding: "48px 20px", textAlign: "center" }}>
          <ClipboardList size={36} color="#c8ddc9" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: "#9ab5a0" }}>No assessments yet. Create them inside a course.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {assessments.map(a => {
            const color = a.courses?.cover_color || "#243E36";
            const isQuiz = a.type === "quiz";
            return (
              <div key={a.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "14px 20px", display: "flex", gap: 14, alignItems: "center", borderLeft: `4px solid ${isQuiz ? "#3b5bdb" : "#c0532a"}` }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: isQuiz ? "#e8eef9" : "#fff8f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ClipboardList size={16} color={isQuiz ? "#3b5bdb" : "#c0532a"} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{a.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: isQuiz ? "#e8eef9" : "#fff8f5", color: isQuiz ? "#3b5bdb" : "#c0532a", textTransform: "uppercase" }}>{a.type}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: a.status === "published" ? "#e8f3ea" : "#f5f5f5", color: a.status === "published" ? "#1a5c30" : "#9ab5a0" }}>{a.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>{a.courses?.title}</span>
                    <span style={{ fontSize: 11, color: "#9ab5a0" }}>{a.max_points} pts</span>
                    {a.due_date && <span style={{ fontSize: 11, color: "#9ab5a0" }}>Due {new Date(a.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AttendanceOverviewPage({ courses, onGoToCourse }) {
  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>Attendance</h1>
          <p style={s.pageSub}>Select a course to manage its attendance.</p>
        </div>
      </div>
      {courses.length === 0 ? (
        <div style={{ ...s.card, padding: "48px 20px", textAlign: "center" }}>
          <Calendar size={36} color="#c8ddc9" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: "#9ab5a0" }}>No active courses yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {courses.map(c => (
            <div key={c.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, overflow: "hidden", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
              className="stat-card"
              onClick={onGoToCourse}>
              <div style={{ background: c.cover_color || "#243E36", padding: "18px 20px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{c.subject}</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#fff" }}>{c.title}</p>
              </div>
              <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9ab5a0" }}>
                  <Users size={13} /> {c.students} students
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#7CA982", display: "flex", alignItems: "center", gap: 4 }}>
                  Go to Attendance <ChevronRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// COURSE GRADEBOOK
// ─────────────────────────────────────────────
function CourseGradebook({ data, teacherId, onSaved, onRefresh }) {
  const { course, config: initialConfig, students, assignments, assessments, assignSubMap, assessSubMap, manualMap: initialManualMap, terms = [] } = data;

  const [config, setConfig] = useState({
    quiz_assessment_ids:       initialConfig.quiz_assessment_ids       || [],
    exam_assessment_ids:       initialConfig.exam_assessment_ids       || [],
    activity_assessment_ids:   initialConfig.activity_assessment_ids   || [],
    assignment_assignment_ids: initialConfig.assignment_assignment_ids || [],
    activity_assignment_ids:   initialConfig.activity_assignment_ids   || [],
    show_quiz:        initialConfig.show_quiz        ?? true,
    show_exam:        initialConfig.show_exam        ?? true,
    show_activity:    initialConfig.show_activity    ?? true,
    show_project:     initialConfig.show_project     ?? true,
    show_recitation:  initialConfig.show_recitation  ?? false,
  });

  const [manualMap, setManualMap] = useState(initialManualMap || {});
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingManual, setSavingManual] = useState({});
  const [showConfig, setShowConfig] = useState(false);
  const [activeTerm, setActiveTerm] = useState(terms[0]?.id || null);
  const [showTermsManager, setShowTermsManager] = useState(false);
  const [termsDraft, setTermsDraft] = useState(terms.map(t => ({ ...t })));
  const [savingTerms, setSavingTerms] = useState(false);
  const [termsError, setTermsError] = useState("");

  useEffect(() => {
    if (terms.length > 0 && !terms.some(t => t.id === activeTerm)) {
      setActiveTerm(terms[0].id);
    }
  }, [terms]);

  useEffect(() => {
    setTermsDraft(terms.map(t => ({ ...t })));
  }, [terms]);

  const addTermRow = () => {
    setTermsDraft(prev => [...prev, { id: `term_${Date.now()}`, label: "", startDate: "", endDate: "" }]);
  };
  const removeTermRow = (id) => setTermsDraft(prev => prev.filter(t => t.id !== id));
  const updateTermRow = (id, field, val) =>
    setTermsDraft(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t));


  const termsWithContent = new Set([
    ...assignments.map(a => a.term_id).filter(Boolean),
    ...assessments.map(a => a.term_id).filter(Boolean),
  ]);

  const handleSaveTerms = async () => {
    if (termsDraft.length === 0) { setTermsError("Add at least one term."); return; }
    if (termsDraft.some(t => !t.label.trim())) { setTermsError("All terms need a label."); return; }
    setTermsError("");
    setSavingTerms(true);
    try {
      await updateCourseTerms(course.id, termsDraft);
      onSaved("✓ Terms saved successfully!");
      setShowTermsManager(false);
      onRefresh?.();
    } catch (e) {
      setTermsError(e.message);
    } finally {
      setSavingTerms(false);
    }
  };

  // Term-scoped source lists — everything below derives from these, not the raw course-wide lists
  const termAssessments = activeTerm ? assessments.filter(a => a.term_id === activeTerm) : assessments;
  const termAssignments = activeTerm ? assignments.filter(a => a.term_id === activeTerm) : assignments;

  // Derived lists
  const quizItems      = termAssessments.filter(a => config.quiz_assessment_ids.includes(a.id));
  const examItems      = termAssessments.filter(a => config.exam_assessment_ids.includes(a.id));
  const activityAssessmentItems = termAssessments.filter(a => config.activity_assessment_ids.includes(a.id));
  const assignmentItems = termAssignments.filter(a => config.assignment_assignment_ids.includes(a.id));
  const activityItems  = termAssignments.filter(a => config.activity_assignment_ids.includes(a.id));
  const projectItems   = termAssignments.filter(a => a.assignment_type === "project");

  // Available (not yet assigned) assessments/assignments for dropdowns
  const usedAssessmentIds = [...config.quiz_assessment_ids, ...config.exam_assessment_ids];
  const availableForQuiz  = termAssessments.filter(a => !config.exam_assessment_ids.includes(a.id));
  const availableForExam  = termAssessments.filter(a => !config.quiz_assessment_ids.includes(a.id));
  const availableForActivity = termAssignments.filter(a =>
    a.assignment_type !== "project" && !config.activity_assignment_ids.includes(a.id)
  );

  const ASSESSMENT_CATEGORY_KEYS = {
    quiz:     "quiz_assessment_ids",
    exam:     "exam_assessment_ids",
    activity: "activity_assessment_ids",
  };

  const toggleAssessment = (type, id) => {
    const key = ASSESSMENT_CATEGORY_KEYS[type];
    const otherKeys = Object.values(ASSESSMENT_CATEGORY_KEYS).filter(k => k !== key);
    setConfig(prev => {
      const current = prev[key] || [];
      const isIn = current.includes(id);
      const next = { ...prev, [key]: isIn ? current.filter(x => x !== id) : [...current, id] };
      if (!isIn) {
        otherKeys.forEach(k => { next[k] = (prev[k] || []).filter(x => x !== id); });
      }
      return next;
    });
  };

  const ASSIGNMENT_CATEGORY_KEYS = {
    assignment: "assignment_assignment_ids",
    activity:   "activity_assignment_ids",
  };

  const toggleAssignmentCategory = (type, id) => {
    const key = ASSIGNMENT_CATEGORY_KEYS[type];
    const otherKeys = Object.values(ASSIGNMENT_CATEGORY_KEYS).filter(k => k !== key);
    setConfig(prev => {
      const current = prev[key] || [];
      const isIn = current.includes(id);
      const next = { ...prev, [key]: isIn ? current.filter(x => x !== id) : [...current, id] };
      if (!isIn) {
        otherKeys.forEach(k => { next[k] = (prev[k] || []).filter(x => x !== id); });
      }
      return next;
    });
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await saveGradebookConfig(course.id, teacherId, config);
      onSaved("✓ Setup saved successfully!");
      
      onRefresh?.();
    } catch (e) {
      onSaved(`❌ Error: ${e.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleManualScore = async (studentId, field, value) => {
    // Optimistic update
    setManualMap(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [field]: value === "" ? null : Number(value) },
    }));
    setSavingManual(prev => ({ ...prev, [`${studentId}_${field}`]: true }));
    try {
      await saveManualScore(course.id, studentId, teacherId, field + "_score", value);
    } catch (e) { console.error(e); }
    finally { setSavingManual(prev => ({ ...prev, [`${studentId}_${field}`]: false })); }
  };

  const scoreCell = (score, maxScore, date = null) => {
  if (score == null) return <span style={{ color: "#c8ddc9", fontSize: 12 }}>—</span>;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const c = pct >= 75 ? "#1a5c30" : pct >= 50 ? "#7a5c00" : "#8b2020";
  const dateStr = date ? new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : null;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{score}/{maxScore}</div>
      <div style={{ fontSize: 10, color: "#9ab5a0" }}>{pct}%</div>
      {dateStr && <div style={{ fontSize: 9, color: "#c8ddc9", marginTop: 1 }}>{dateStr}</div>}
    </div>
  );
};

  const sectionHeader = (title, color, showKey, badge) => (
    <tr style={{ background: color + "12" }}>
      <td colSpan={100} style={{ padding: "10px 16px", borderTop: "2px solid " + color }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
          {badge && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "20", color }}>{badge}</span>}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#9ab5a0" }}>Visible to students</span>
            <button
              onClick={() => setConfig(prev => ({ ...prev, [showKey]: !prev[showKey] }))}
              style={{ width: 36, height: 20, borderRadius: 99, border: "none", cursor: "pointer", background: config[showKey] ? "#7CA982" : "#c8ddc9", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 2, left: config[showKey] ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      {/* Config panel toggle */}
      <div className="gradebook-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: course.cover_color || "#243E36", flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#243E36" }}>{course.title}</span>
          <span style={{ fontSize: 12, color: "#9ab5a0" }}>{students.length} students</span>
        </div>
        <div className="gradebook-header-actions" style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowTermsManager(v => !v)}
            style={{ ...s.primaryBtn, background: showTermsManager ? "#243E36" : "#F1F7ED", color: showTermsManager ? "#fff" : "#243E36", border: "1px solid #e8f3ea" }}
            className="icon-btn">
            📅 {showTermsManager ? "Hide Terms" : "Manage Terms"}
          </button>
          <button
            onClick={() => setShowConfig(v => !v)}
            style={{ ...s.primaryBtn, background: showConfig ? "#243E36" : "#F1F7ED", color: showConfig ? "#fff" : "#243E36", border: "1px solid #e8f3ea" }}
            className="icon-btn">
            ⚙ {showConfig ? "Hide Setup" : "Setup Gradebook"}
          </button>
        </div>
      </div>

      {showTermsManager && (
        <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Manage Terms — {course.title}</h3>
          <p style={{ fontSize: 12, color: "#9ab5a0", marginBottom: 16 }}>
            These terms (and their dates) are shared across Attendance, Assignments, Assessments, and Gradebook for this course.
          </p>

          {termsError && (
            <div style={{ background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", marginBottom: 14 }}>
              {termsError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {termsDraft.map((term, i) => {
              const originalTerm       = terms.find(t => t.id === term.id);
              const isExistingTerm     = !!originalTerm;
              const labelChanged       = isExistingTerm && originalTerm.label !== term.label;
              const hasLinkedContent   = termsWithContent.has(term.id);
              const showRenameWarning  = isExistingTerm && labelChanged && hasLinkedContent;

              return (
              <div key={term.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="term-row" style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "#fafcfa", border: "1px solid #e8f3ea", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e8f3ea", color: "#243E36", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 6 }}>
                  {i + 1}
                </div>
                <div className="term-field" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#9ab5a0" }}>Term Name</label>
                  <input
                    value={term.label}
                    onChange={e => updateTermRow(term.id, "label", e.target.value)}
                    placeholder="e.g. Prelim"
                    style={{ ...s.input, borderColor: showRenameWarning ? "#e0a052" : undefined }}
                    className="lms-input"
                  />
                </div>
                <div className="term-field" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#9ab5a0" }}>Start Date</label>
                  <input
                    type="date"
                    value={term.startDate || ""}
                    onChange={e => updateTermRow(term.id, "startDate", e.target.value)}
                    style={{ ...s.input, width: 150 }}
                    className="lms-input term-date-input"
                  />
                </div>
                <div className="term-field" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#9ab5a0" }}>End Date</label>
                  <input
                    type="date"
                    value={term.endDate || ""}
                    onChange={e => updateTermRow(term.id, "endDate", e.target.value)}
                    style={{ ...s.input, width: 150 }}
                    className="lms-input term-date-input"
                  />
                </div>
                {termsDraft.length > 1 && (
                  <button
                    onClick={() => removeTermRow(term.id)}
                    style={{ background: "none", border: "1px solid #f5c6c6", borderRadius: 7, padding: "9px 10px", cursor: "pointer", color: "#e05252", display: "flex", alignItems: "center", marginBottom: 1 }}
                    className="icon-action-btn term-delete-btn">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {showRenameWarning && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fff8e1", border: "1px solid #f0d894", borderRadius: 8, padding: "10px 14px", marginLeft: 34 }}>
                  <AlertCircle size={14} color="#e0a052" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: "#7a5c00", lineHeight: 1.5 }}>
                    Renaming this term will keep all existing grades and assessments linked to it — they'll now appear under the new name "{term.label || "..."}". If you want a completely fresh term, use "+ Add Term" instead.
                  </p>
                </div>
              )}
              </div>
              );
            })}
          </div>

          <button
            onClick={addTermRow}
            style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, background: "none", border: "1.5px dashed #c8ddc9", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#7CA982", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            <Plus size={14} /> Add Term
          </button>

          <button onClick={handleSaveTerms} disabled={savingTerms}
            style={{ ...s.primaryBtn, marginTop: 20, justifyContent: "center" }}
            className="primary-btn">
            {savingTerms ? <><Spinner size={14} /> Saving…</> : "💾 Save Terms"}
          </button>
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
            </button>
          ))}
        </div>
      )}

      {/* Config Panel */}
      {showConfig && (
        <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#243E36", marginBottom: 16 }}>Gradebook Setup — {course.title}</h3>

          <div className="gradebook-setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {/* Quizzes */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#3b5bdb", marginBottom: 8 }}>📝 Assessments → Quiz</p>
              <p style={{ fontSize: 11, color: "#9ab5a0", marginBottom: 10 }}>Select which assessments count as Quizzes (this term)</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {termAssessments.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#c8ddc9" }}>No assessments in this term yet</p>
                ) : termAssessments.map(a => {
                  const usedAsExam     = config.exam_assessment_ids.includes(a.id);
                  const usedAsActivity = config.activity_assessment_ids.includes(a.id);
                  return (
                  <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: config.quiz_assessment_ids.includes(a.id) ? "#e8eef9" : "#fafcfa", border: `1px solid ${config.quiz_assessment_ids.includes(a.id) ? "#3b5bdb40" : "#e8f3ea"}` }}>
                    <input type="checkbox"
                      checked={config.quiz_assessment_ids.includes(a.id)}
                      onChange={() => toggleAssessment("quiz", a.id)}
                      disabled={usedAsExam || usedAsActivity}
                      style={{ accentColor: "#3b5bdb" }}
                    />
                    <span style={{ fontSize: 13, color: "#243E36", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <span style={{ fontSize: 11, color: "#9ab5a0", marginLeft: "auto", flexShrink: 0 }}>{a.max_points ?? 100}pts</span>
                  </label>
                  );
                })}
              </div>
            </div>

            {/* Exams */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#c0532a", marginBottom: 8 }}>📋 Assessments → Exam</p>
              <p style={{ fontSize: 11, color: "#9ab5a0", marginBottom: 10 }}>Select which assessments count as Exams (this term)</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {termAssessments.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#c8ddc9" }}>No assessments in this term yet</p>
                ) : termAssessments.map(a => {
                  const usedAsQuiz     = config.quiz_assessment_ids.includes(a.id);
                  const usedAsActivity = config.activity_assessment_ids.includes(a.id);
                  return (
                  <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: config.exam_assessment_ids.includes(a.id) ? "#fff8f5" : "#fafcfa", border: `1px solid ${config.exam_assessment_ids.includes(a.id) ? "#c0532a40" : "#e8f3ea"}` }}>
                    <input type="checkbox"
                      checked={config.exam_assessment_ids.includes(a.id)}
                      onChange={() => toggleAssessment("exam", a.id)}
                      disabled={usedAsQuiz || usedAsActivity}
                      style={{ accentColor: "#c0532a" }}
                    />
                    <span style={{ fontSize: 13, color: "#243E36", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <span style={{ fontSize: 11, color: "#9ab5a0", marginLeft: "auto", flexShrink: 0 }}>{a.max_points ?? 100}pts</span>
                  </label>
                  );
                })}
              </div>
            </div>

            {/* NEW: Assessments → Activity */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#4a7c59", marginBottom: 8 }}>🗂 Assessments → Activity</p>
              <p style={{ fontSize: 11, color: "#9ab5a0", marginBottom: 10 }}>Select which assessments count as Activities (this term)</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {termAssessments.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#c8ddc9" }}>No assessments in this term yet</p>
                ) : termAssessments.map(a => {
                  const usedAsQuiz = config.quiz_assessment_ids.includes(a.id);
                  const usedAsExam = config.exam_assessment_ids.includes(a.id);
                  return (
                  <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: config.activity_assessment_ids.includes(a.id) ? "#e8f3ea" : "#fafcfa", border: `1px solid ${config.activity_assessment_ids.includes(a.id) ? "#4a7c5940" : "#e8f3ea"}` }}>
                    <input type="checkbox"
                      checked={config.activity_assessment_ids.includes(a.id)}
                      onChange={() => toggleAssessment("activity", a.id)}
                      disabled={usedAsQuiz || usedAsExam}
                      style={{ accentColor: "#4a7c59" }}
                    />
                    <span style={{ fontSize: 13, color: "#243E36", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <span style={{ fontSize: 11, color: "#9ab5a0", marginLeft: "auto", flexShrink: 0 }}>{a.max_points ?? 100}pts</span>
                  </label>
                  );
                })}
              </div>
            </div>

            {/* Assignments → Assignments (regular, non-Activity) */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#3b5bdb", marginBottom: 8 }}>📄 Assignments → Assignments</p>
              <p style={{ fontSize: 11, color: "#9ab5a0", marginBottom: 10 }}>Select which Essay/Link assignments count as regular Assignments</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {termAssignments.filter(a => a.assignment_type !== "project").length === 0 ? (
                  <p style={{ fontSize: 12, color: "#c8ddc9" }}>No Essay/Link assignments in this term yet</p>
                ) : termAssignments.filter(a => a.assignment_type !== "project").map(a => {
                  const usedAsActivity = config.activity_assignment_ids.includes(a.id);
                  return (
                  <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: config.assignment_assignment_ids.includes(a.id) ? "#e8eef9" : "#fafcfa", border: `1px solid ${config.assignment_assignment_ids.includes(a.id) ? "#3b5bdb40" : "#e8f3ea"}` }}>
                    <input type="checkbox"
                      checked={config.assignment_assignment_ids.includes(a.id)}
                      onChange={() => toggleAssignmentCategory("assignment", a.id)}
                      disabled={usedAsActivity}
                      style={{ accentColor: "#3b5bdb" }}
                    />
                    <span style={{ fontSize: 13, color: "#243E36", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <span style={{ fontSize: 11, color: "#9ab5a0", marginLeft: "auto", flexShrink: 0 }}>{a.max_points}pts</span>
                  </label>
                  );
                })}
              </div>
            </div>

            {/* Activities */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#4a7c59", marginBottom: 8 }}>✏ Assignments → Activity</p>
              <p style={{ fontSize: 11, color: "#9ab5a0", marginBottom: 10 }}>Select which Essay/Link assignments count as Activities</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {termAssignments.filter(a => a.assignment_type !== "project").length === 0 ? (
                  <p style={{ fontSize: 12, color: "#c8ddc9" }}>No Essay/Link assignments in this term yet</p>
                ) : termAssignments.filter(a => a.assignment_type !== "project").map(a => {
                  const usedAsAssignment = config.assignment_assignment_ids.includes(a.id);
                  return (
                  <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: config.activity_assignment_ids.includes(a.id) ? "#e8f3ea" : "#fafcfa", border: `1px solid ${config.activity_assignment_ids.includes(a.id) ? "#4a7c5940" : "#e8f3ea"}` }}>
                    <input type="checkbox"
                      checked={config.activity_assignment_ids.includes(a.id)}
                      onChange={() => toggleAssignmentCategory("activity", a.id)}
                      disabled={usedAsAssignment}
                      style={{ accentColor: "#4a7c59" }}
                    />
                    <span style={{ fontSize: 13, color: "#243E36", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <span style={{ fontSize: 11, color: "#9ab5a0", marginLeft: "auto", flexShrink: 0 }}>{a.max_points}pts</span>
                  </label>
                  );
                })}
              </div>
            </div>

            {/* Projects (auto) */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#c0532a", marginBottom: 8 }}>🏆 Projects (auto-detected)</p>
              <p style={{ fontSize: 11, color: "#9ab5a0", marginBottom: 10 }}>All Project-type assignments are auto-included</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {projectItems.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#c8ddc9" }}>No Project assignments in this course yet</p>
                ) : projectItems.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "#fff8f5", border: "1px solid #c0532a20" }}>
                    <span style={{ fontSize: 13, color: "#243E36" }}>{p.title}</span>
                    <span style={{ fontSize: 11, color: "#9ab5a0", marginLeft: "auto" }}>{p.max_points}pts</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#c0532a" }}>AUTO</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleSaveConfig} disabled={savingConfig}
            style={{ ...s.primaryBtn, marginTop: 20, justifyContent: "center" }}
            className="primary-btn">
            {savingConfig ? <><Spinner size={14} /> Saving…</> : "💾 Save Setup"}
          </button>
        </div>
      )}

      {/* Gradebook Table */}
      {students.length === 0 ? (
        <div style={s.card}><EmptyState icon={<Users size={32} color="#c8ddc9" />} text="No students enrolled in this course yet." /></div>
      ) : (
        <div style={{ ...s.card, overflowX: "auto" }}>
          <table style={{ ...s.table, minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ ...s.th, minWidth: 160, position: "sticky", left: 0, background: "#fafcfa", zIndex: 2 }}>Student</th>

                {/* Quiz headers */}
                {quizItems.map(q => (
                  <th key={q.id} style={{ ...s.th, minWidth: 100, maxWidth: 130, textAlign: "center", background: "#f0f4ff" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#3b5bdb", textTransform: "uppercase" }}>QUIZ</div>
                    <div title={q.title} style={{ fontSize: 11, color: "#243E36", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.title}</div>
                    <div style={{ fontSize: 9, color: "#9ab5a0" }}>/{q.max_points ?? 100}</div>
                  </th>
                ))}

                {/* Exam headers */}
                {examItems.map(e => (
                  <th key={e.id} style={{ ...s.th, minWidth: 100, maxWidth: 130, textAlign: "center", background: "#fff8f5" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#c0532a", textTransform: "uppercase" }}>EXAM</div>
                    <div title={e.title} style={{ fontSize: 11, color: "#243E36", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                    <div style={{ fontSize: 9, color: "#9ab5a0" }}>/{e.max_points ?? 100}</div>
                  </th>
                ))}

                {/* Assignment headers */}
                {assignmentItems.map(a => (
                  <th key={a.id} style={{ ...s.th, minWidth: 100, maxWidth: 130, textAlign: "center", background: "#f0f4ff" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#3b5bdb", textTransform: "uppercase" }}>ASSIGNMENT</div>
                    <div title={a.title} style={{ fontSize: 11, color: "#243E36", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                    <div style={{ fontSize: 9, color: "#9ab5a0" }}>/{a.max_points}</div>
                  </th>
                ))}

                {/* Activity headers (from Assignments) */}
                {activityItems.map(a => (
                  <th key={a.id} style={{ ...s.th, minWidth: 100, maxWidth: 130, textAlign: "center", background: "#f0faf2" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#4a7c59", textTransform: "uppercase" }}>ACTIVITY</div>
                    <div title={a.title} style={{ fontSize: 11, color: "#243E36", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                    <div style={{ fontSize: 9, color: "#9ab5a0" }}>/{a.max_points}</div>
                  </th>
                ))}

                {/* Activity headers (from Assessments) */}
                {activityAssessmentItems.map(a => (
                  <th key={a.id} style={{ ...s.th, minWidth: 100, maxWidth: 130, textAlign: "center", background: "#f0faf2" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#4a7c59", textTransform: "uppercase" }}>ACTIVITY</div>
                    <div title={a.title} style={{ fontSize: 11, color: "#243E36", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                    <div style={{ fontSize: 9, color: "#9ab5a0" }}>/{a.max_points ?? 100}</div>
                  </th>
                ))}

                {/* Project headers */}
                {projectItems.map(p => (
                  <th key={p.id} style={{ ...s.th, minWidth: 100, maxWidth: 130, textAlign: "center", background: "#fff8f5" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#c0532a", textTransform: "uppercase" }}>PROJECT</div>
                    <div title={p.title} style={{ fontSize: 11, color: "#243E36", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ fontSize: 9, color: "#9ab5a0" }}>/{p.max_points}</div>
                  </th>
                ))}

                {/* Recitation */}
                <th style={{ ...s.th, minWidth: 100, textAlign: "center", background: "#fdf8ff" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>RECITATION</div>
                  <div style={{ fontSize: 9, color: "#9ab5a0" }}>manual</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: 9, color: "#9ab5a0" }}>visible</span>
                    <button onClick={() => setConfig(prev => ({ ...prev, show_recitation: !prev.show_recitation }))}
                      style={{ width: 28, height: 16, borderRadius: 99, border: "none", cursor: "pointer", background: config.show_recitation ? "#7CA982" : "#c8ddc9", position: "relative", transition: "background 0.2s" }}>
                      <span style={{ position: "absolute", top: 2, left: config.show_recitation ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((st, i) => (
                <tr key={st.id} style={{ borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                  {/* Student name */}
                  <td style={{ ...s.td, position: "sticky", left: 0, background: "#fff", zIndex: 1, borderRight: "1px solid #e8f3ea" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...s.miniAvatar, background: stringToColor(st.initials) }}>{st.initials}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#243E36", whiteSpace: "nowrap" }}>{st.name}</span>
                    </div>
                  </td>

                  {/* Quiz scores */}
                  {quizItems.map(q => (
                    <td key={q.id} style={{ ...s.td, textAlign: "center", background: "#f8faff" }}>
                    {scoreCell(assessSubMap[q.id]?.[st.id]?.score, assessSubMap[q.id]?.[st.id]?.maxScore ?? q.max_points ?? 100, assessSubMap[q.id]?.[st.id]?.date)}
                    </td>
                    ))}

                  {/* Exam scores */}
                  {examItems.map(e => (
                  <td key={e.id} style={{ ...s.td, textAlign: "center", background: "#fffbf8" }}>
                  {scoreCell(assessSubMap[e.id]?.[st.id]?.score, assessSubMap[e.id]?.[st.id]?.maxScore ?? e.max_points ?? 100, assessSubMap[e.id]?.[st.id]?.date)}
                  </td>
                  ))}

                  {/* Assignment scores */}
                  {assignmentItems.map(a => (
                  <td key={a.id} style={{ ...s.td, textAlign: "center", background: "#f8faff" }}>
                  {scoreCell(assignSubMap[a.id]?.[st.id]?.grade, assignSubMap[a.id]?.[st.id]?.maxPoints ?? a.max_points, assignSubMap[a.id]?.[st.id]?.date)}
                  </td>
                  ))}

                  {/* Activity scores (from Assignments) */}
                  {activityItems.map(a => (
                  <td key={a.id} style={{ ...s.td, textAlign: "center", background: "#f8fdf9" }}>
                  {scoreCell(assignSubMap[a.id]?.[st.id]?.grade, assignSubMap[a.id]?.[st.id]?.maxPoints ?? a.max_points, assignSubMap[a.id]?.[st.id]?.date)}
                  </td>
                  ))}

                  {/* Activity scores (from Assessments) */}
                  {activityAssessmentItems.map(a => (
                  <td key={a.id} style={{ ...s.td, textAlign: "center", background: "#f8fdf9" }}>
                  {scoreCell(assessSubMap[a.id]?.[st.id]?.score, assessSubMap[a.id]?.[st.id]?.maxScore ?? a.max_points ?? 100, assessSubMap[a.id]?.[st.id]?.date)}
                  </td>
                  ))}

                  {/* Project scores */}
                  {projectItems.map(p => (
                  <td key={p.id} style={{ ...s.td, textAlign: "center", background: "#fffbf8" }}>
                  {scoreCell(assignSubMap[p.id]?.[st.id]?.grade, assignSubMap[p.id]?.[st.id]?.maxPoints ?? p.max_points, assignSubMap[p.id]?.[st.id]?.date)}
                  </td>
                    ))}

                  {/* Recitation — manual input */}
<td style={{ ...s.td, textAlign: "center", background: "#fdf9ff" }}>
  <input
    type="number" min="0"
    placeholder="—"
    value={manualMap[st.id]?.recitation ?? ""}
    onChange={e => {
      const val = e.target.value;
      if (val === "") {
        handleManualScore(st.id, "recitation", "");
        return;
      }
      const num = Number(val);
      if (!isNaN(num) && num >= 0) {
        handleManualScore(st.id, "recitation", num);
      }
    }}
    style={{
      width: 60, textAlign: "center", padding: "5px 8px", borderRadius: 7,
      border: `1.5px solid ${
        (manualMap[st.id]?.recitation ?? "") !== "" && Number(manualMap[st.id]?.recitation) < 0
          ? "#e05252" : "#c8ddc9"
      }`,
      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
      color: "#243E36", outline: "none",
    }}
    className="lms-input"
  />
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Save visibility toggles */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={handleSaveConfig} disabled={savingConfig}
          style={{ ...s.primaryBtn, background: "#7CA982" }}
          className="primary-btn">
          {savingConfig ? <><Spinner size={14} /> Saving…</> : "💾 Save Visibility Settings"}
        </button>
      </div>

      <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 8, textAlign: "right" }}>
        Manual scores (Recitation/Attendance) auto-save as you type. Use "Setup Gradebook" to assign Quizzes, Exams, and Activities.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: STUDENTS
// ─────────────────────────────────────────────
function StudentsPage({ students, loading, error, onRefresh, courses = [] }) {
  const [search, setSearch] = useState("");
  const [showCreateStudent, setShowCreateStudent] = useState(false);

  const handleStudentCreated = () => {
    setShowCreateStudent(false);
    onRefresh();
  };

  const filtered = students.filter(s =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>Students</h1>
          <p style={s.pageSub}>{loading ? "Loading…" : `${students.length} student${students.length !== 1 ? "s" : ""} enrolled.`}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowCreateStudent(true)} style={s.primaryBtn} className="primary-btn">
            <UserPlus size={14} /> Create Student
          </button>
          <button onClick={onRefresh} style={{ ...s.primaryBtn, background: "#F1F7ED", color: "#243E36", border: "1px solid #e8f3ea" }} className="icon-btn">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>
      {error && <ErrorBanner message={error} onRetry={onRefresh} />}
      <div style={{ position: "relative", maxWidth: 320, marginBottom: 16 }}>
        <Search size={14} color="#9ab5a0" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...s.input, paddingLeft: 36 }} className="lms-input" />
      </div>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <div style={s.card}><EmptyState icon={<Users size={32} color="#c8ddc9" />} text={search ? "No students match your search." : "No students enrolled yet."} /></div>
      ) : (
        <div style={s.card}>
          <div className="table-scroll-wrapper">
          <table style={{ ...s.table, minWidth: 640 }}>
            <thead>
              <tr>{["Student", "Enrolled In", "Avg. Grade", "Submissions", "Last Login", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((st, i) => (
                <tr key={st.studentId} style={{ borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...s.miniAvatar, background: stringToColor(st.initials) }}>{st.initials}</div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{st.fullName}</p>
                        <p style={{ fontSize: 11, color: "#9ab5a0" }}>{st.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {st.enrolledCourses.map(c => (
                        <span key={c.courseId} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: c.coverColor + "22", color: c.coverColor, border: `1px solid ${c.coverColor}44` }}>
                          {c.courseName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={s.td}>
                    {st.avgGrade !== null ? <span style={{ ...s.gradePill, ...gradeColor(st.avgGrade) }}>{st.avgGrade}%</span> : <span style={{ color: "#c8ddc9", fontSize: 12 }}>No grades</span>}
                  </td>
                  <td style={{ ...s.td, color: "#5a7a6e" }}>{st.submissionCount}</td>
                  <td style={{ ...s.td, color: "#9ab5a0", fontSize: 12 }}>{st.lastActiveAt ? timeAgo(st.lastActiveAt) : "Never logged in"}</td>
                  <td style={s.td}>
                    <span style={{ ...s.statusPill, background: st.avgGrade !== null && st.avgGrade < 75 ? "#fce8e8" : "#e8f3ea", color: st.avgGrade !== null && st.avgGrade < 75 ? "#8b2020" : "#1a5c30" }}>
                      {st.avgGrade !== null && st.avgGrade < 75 ? "At Risk" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showCreateStudent && (
        <CreateStudentAccountModal
          courses={courses}
          onClose={() => setShowCreateStudent(false)}
          onCreated={handleStudentCreated}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: ANNOUNCEMENTS
// ─────────────────────────────────────────────
function AnnouncementsPage({ announcements, courses, loading, error, onRefresh, teacherId }) {
  const [showModal, setShowModal] = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({ title: "", content: "", courseId: "", isGlobal: false });

  const handlePost = async () => {
    if (!form.title.trim() || !form.content.trim()) { setSaveError("Title and message are required."); return; }
    if (!form.isGlobal && !form.courseId) { setSaveError("Please select a course or mark as school-wide."); return; }
    setSaving(true); setSaveError("");
    try {
      await postAnnouncement({ authorId: teacherId, title: form.title.trim(), content: form.content.trim(), courseId: form.isGlobal ? null : form.courseId, isGlobal: form.isGlobal });
      setShowModal(false);
      setForm({ title: "", content: "", courseId: "", isGlobal: false });
      onRefresh();
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await deleteAnnouncement(id); onRefresh(); }
    catch (_) {}
    finally { setDeleting(null); }
  };

  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>Announcements</h1>
          <p style={s.pageSub}>Post notices to your courses or all students.</p>
        </div>
        <button style={s.primaryBtn} className="primary-btn" onClick={() => setShowModal(true)}>
          <Plus size={15} /> New Announcement
        </button>
      </div>
      {error && <ErrorBanner message={error} onRetry={onRefresh} />}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : announcements.length === 0 ? (
        <div style={s.card}><EmptyState icon={<MessageSquare size={32} color="#c8ddc9" />} text="No announcements yet." action="Post Announcement" onAction={() => setShowModal(true)} /></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {announcements.map(a => (
            <div key={a.id} style={{ ...s.card, padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start", borderLeft: "4px solid #7CA982" }}>
              <div style={{ width: 42, height: 42, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MessageSquare size={18} color="#7CA982" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>{a.title}</p>
                <p style={{ fontSize: 12, color: "#7CA982", marginBottom: 6 }}>{a.is_global ? "School-wide" : a.courseName ?? "Course announcement"}</p>
                <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6, marginBottom: 6 }}>{a.content}</p>
                <p style={{ fontSize: 12, color: "#9ab5a0" }}>Posted {timeAgo(a.created_at)}</p>
              </div>
              <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                style={{ ...s.actionBtn, color: "#e05252", flexShrink: 0 }} className="action-btn">
                {deleting === a.id ? <Spinner size={12} /> : <Trash2 size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && createPortal(
        <div style={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h2 style={s.modalTitle}>New Announcement</h2>
              <button style={s.modalClose} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {saveError && <ErrorBanner message={saveError} />}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: form.isGlobal ? "#e8f3ea" : "#F1F7ED", borderRadius: 9, border: `1px solid ${form.isGlobal ? "#c8ddc9" : "#e8f3ea"}`, cursor: "pointer" }}
                onClick={() => setForm(f => ({ ...f, isGlobal: !f.isGlobal, courseId: "" }))}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: form.isGlobal ? "#7CA982" : "#fff", border: `2px solid ${form.isGlobal ? "#7CA982" : "#c8ddc9"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {form.isGlobal && <CheckCircle2 size={12} color="#fff" />}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>Post to all students (School-wide)</p>
                  <p style={{ fontSize: 11, color: "#9ab5a0" }}>Visible to every student in EduSpace</p>
                </div>
              </div>
              {!form.isGlobal && (
                <div style={s.fieldGroup}>
                  <label style={s.label}>Course *</label>
                  <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} style={s.input} className="lms-input">
                    <option value="">Select a course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              )}
              <div style={s.fieldGroup}>
                <label style={s.label}>Title *</label>
                <input placeholder="Announcement title" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={s.input} className="lms-input" />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Message *</label>
                <textarea rows={4} placeholder="Write your announcement..." value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))} style={{ ...s.input, resize: "vertical" }} className="lms-input" />
              </div>
              <button style={{ ...s.primaryBtn, justifyContent: "center", width: "100%" }} className="primary-btn"
                onClick={handlePost} disabled={saving}>
                {saving ? <><Spinner size={14} /> Posting…</> : <><Send size={14} /> Post Announcement</>}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: SCHEDULE
// ─────────────────────────────────────────────
function SchedulePage({ todayClasses }) {
  return (
    <div className="fade-up">
      <h1 style={s.pageTitle}>Schedule</h1>
      <p style={s.pageSub}>Your classes based on course schedules.</p>
      <div style={{ marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36", marginBottom: 12 }}>Today's Classes</p>
        <div style={s.card}>
          {todayClasses.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ab5a0", fontSize: 13 }}>No classes scheduled for today 🎉</div>
          ) : todayClasses.map((cls, i) => (
            <div key={i} style={{ ...s.schedRow, borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
              <div style={{ ...s.schedStripe, background: cls.cover_color }} />
              <div>
                <p style={s.schedTitle}>{cls.title}</p>
                <p style={s.schedMeta}>{cls.schedule}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// HELPER COMPONENT
// ─────────────────────────────────────────────
function SectionHead({ title, action, onAction }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#243E36" }}>{title}</h2>
      {action && (
        <button onClick={onAction} style={{ background: "none", border: "none", color: "#7CA982", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontFamily: "'DM Sans', sans-serif" }}>
          {action} <ChevronRight size={13} />
        </button>
      )}
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
    if (!currentPassword)        { setError("Please enter your current password."); return; }
    if (newPassword.length < 6)  { setError("New password must be at least 6 characters."); return; }
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

  const eyeToggleStyle = { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" };

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: "#e8f3ea", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Eye size={18} color="#7CA982" />
            </div>
            <div>
              <h2 style={s.modalTitle}>Change Password</h2>
              <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 1 }}>Update your account password</p>
            </div>
          </div>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {success ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "16px 0 8px" }}>
              <div style={{ width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={32} color="#7CA982" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>Password updated!</p>
                <p style={{ fontSize: 14, color: "#5a7a6e" }}>Your password has been changed successfully.</p>
              </div>
              <button style={{ ...s.primaryBtn, justifyContent: "center", width: "100%" }} className="primary-btn" onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {error && (
                <div style={{ background: "#fce8e8", border: "1px solid #e08080", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Current Password */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Current Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showCurrent ? "text" : "password"} placeholder="Enter current password"
                    value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    style={{ ...s.input, paddingRight: 44 }} className="lms-input" />
                  <button type="button" onClick={() => setShowCurrent(v => !v)} style={eyeToggleStyle}>
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={s.fieldGroup}>
                <label style={s.label}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showNew ? "text" : "password"} placeholder="At least 6 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    style={{ ...s.input, paddingRight: 44 }} className="lms-input" />
                  <button type="button" onClick={() => setShowNew(v => !v)} style={eyeToggleStyle}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Confirm New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showConfirm ? "text" : "password"} placeholder="Re-enter new password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={{ ...s.input, paddingRight: 44, borderColor: confirmPassword && confirmPassword !== newPassword ? "#e05252" : undefined }}
                    className="lms-input" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={eyeToggleStyle}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p style={{ fontSize: 12, color: "#e05252", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={12} /> Passwords do not match
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                  onClick={onClose} className="cancel-btn">Cancel</button>
                <button style={{ ...s.primaryBtn, flex: 2, justifyContent: "center", opacity: loading ? 0.7 : 1 }}
                  onClick={handleSubmit} disabled={loading} className="primary-btn">
                  {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Updating…</> : "Update Password"}
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
  root:           { display: "flex", minHeight: "100vh", background: "#F1F7ED", fontFamily: "'DM Sans', sans-serif", position: "relative" },
  sidebar:        { width: 240, flexShrink: 0, background: "#243E36", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto", zIndex: 40, transition: "transform 0.25s ease" },
  sidebarTop:     { borderBottom: "1px solid rgba(124,169,130,0.15)" },
  logoWrap:       { display: "flex", alignItems: "center", gap: 10, padding: "24px 20px 16px" },
  logoIcon:       { width: 34, height: 34, background: "rgba(124,169,130,0.15)", border: "1px solid rgba(124,169,130,0.25)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logoText:       { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15, color: "#F1F7ED", letterSpacing: "0.03em", lineHeight: 1.2 },
  logoSubtext:    { fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 9, color: "rgba(124,169,130,0.8)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 1 },
  closeBtn:       { background: "none", border: "none", cursor: "pointer", padding: 4, display: "none" },
  teacherPill:    { display: "flex", alignItems: "center", gap: 10, padding: "12px 20px 16px" },
  avatar:         { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 },
  teacherName:    { fontSize: 13, fontWeight: 600, color: "#F1F7ED" },
  teacherRole:    { fontSize: 11, color: "rgba(241,247,237,0.45)", marginTop: 1 },
  nav:            { padding: "16px 12px", flex: 1 },
  navLabel:       { fontSize: 10, fontWeight: 700, color: "rgba(241,247,237,0.3)", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 8 },
  navItem:        { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: "transparent", border: "none", color: "rgba(241,247,237,0.55)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", marginBottom: 2, transition: "all 0.15s", position: "relative" },
  navActive:      { background: "#7CA982", color: "#fff" },
  badge:          { marginLeft: "auto", background: "#e05252", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 },
  logoutBtn:          { display: "none" },
  topbarAvatarBtn:    { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 99, transition: "background 0.15s", fontFamily: "'DM Sans', sans-serif" },
  avatarDropdown:     { position: "absolute", top: "calc(100% + 10px)", right: 0, width: 220, background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, boxShadow: "0 8px 32px rgba(36,62,54,0.14)", zIndex: 50, overflow: "hidden" },
  avatarDropdownHeader: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" },
  avatarDropdownAvatar: { width: 34, height: 34, color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  avatarDropdownDivider: { height: 1, background: "#e8f3ea" },
  avatarDropdownItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", fontSize: 13, fontWeight: 500, color: "#243E36", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "background 0.15s" },
  sidebarOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 35 },
  main:           { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar:         { height: 60, background: "#fff", borderBottom: "1px solid #e8f3ea", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, position: "sticky", top: 0, zIndex: 30 },
  menuBtn:        { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "none" },
  topTitle:       { flex: 1, fontSize: 15, fontWeight: 600, color: "#243E36" },
  topRight:       { display: "flex", alignItems: "center", gap: 12 },
  bellBtn:        { position: "relative", background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  bellDot:        { position: "absolute", top: -4, right: -4, background: "#e05252", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" },
  notifBox:       { position: "absolute", top: "calc(100% + 10px)", right: 0, width: 340, background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, boxShadow: "0 8px 32px rgba(36,62,54,0.12)", overflow: "hidden", zIndex: 50, maxHeight: 420, overflowY: "auto" },
  notifBoxTitle:  { fontSize: 13, fontWeight: 700, color: "#243E36" },
  notifRow:       { display: "flex", gap: 10, padding: "12px 16px", alignItems: "flex-start", transition: "background 0.15s" },
  topAvatar:      { width: 34, height: 34, color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  content:        { padding: "28px", flex: 1, overflowY: "auto" },
  welcomeRow:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  welcomeTitle:   { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#243E36", marginBottom: 4 },
  welcomeSub:     { fontSize: 13, color: "#9ab5a0" },
  statsGrid:      { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 },
  statCard:       { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "18px 20px", transition: "transform 0.2s, box-shadow 0.2s" },
  statIcon:       { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  statVal:        { fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, color: "#243E36", margin: "10px 0 4px" },
  statLabel:      { fontSize: 12, color: "#9ab5a0", fontWeight: 500 },
  threeCol:       { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 },
  card:           { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, overflow: "hidden" },
  subRow:         { display: "flex", alignItems: "center", gap: 12, padding: "13px 18px" },
  subRowFull:     { display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" },
  miniAvatar:     { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 },
  subName:        { fontSize: 13, fontWeight: 600, color: "#243E36", marginBottom: 2 },
  subDetail:      { fontSize: 11, color: "#9ab5a0" },
  subTime:        { fontSize: 11, color: "#9ab5a0", whiteSpace: "nowrap" },
  gradeBtn:       { background: "#243E36", color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" },
  schedRow:       { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px" },
  schedStripe:    { width: 4, height: 36, borderRadius: 99, flexShrink: 0 },
  schedTitle:     { fontSize: 13, fontWeight: 600, color: "#243E36" },
  schedMeta:      { fontSize: 11, color: "#9ab5a0", marginTop: 2 },
  emptySmall:     { padding: "24px 16px", fontSize: 13, color: "#9ab5a0", textAlign: "center" },
  quickLink:      { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "#fff", border: "1px solid #e8f3ea", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#243E36", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  analyticsGrid:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 },
  analyticsCard:  { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "18px 20px" },
  courseColorDot: { width: 12, height: 12, borderRadius: "50%", marginTop: 3, flexShrink: 0 },
  analyticsTitle: { fontSize: 13, fontWeight: 700, color: "#243E36" },
  analyticsSub:   { fontSize: 11, color: "#9ab5a0", marginTop: 1 },
  analyticsRow2:  { display: "flex", justifyContent: "space-between", marginBottom: 12 },
  analyticsNum:   { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" },
  analyticsMeta:  { fontSize: 10, color: "#9ab5a0", marginTop: 2 },
  gradeBarBg:     { height: 5, background: "#e8f3ea", borderRadius: 99, overflow: "hidden" },
  gradeBarFill:   { height: "100%", borderRadius: 99, transition: "width 0.5s ease" },
  pageHead:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  pageTitle:      { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#243E36", marginBottom: 4 },
  pageSub:        { fontSize: 14, color: "#9ab5a0" },
  primaryBtn:     { background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "background 0.2s" },
  filterRow:      { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  filterTab:      { padding: "7px 18px", borderRadius: 8, border: "1px solid #e8f3ea", background: "#fff", color: "#5a7a6e", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  filterActive:   { background: "#243E36", color: "#fff", border: "1px solid #243E36" },
  table:          { width: "100%", borderCollapse: "collapse" },
  th:             { textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e8f3ea", background: "#fafcfa", whiteSpace: "nowrap" },
  td:             { padding: "12px 16px", fontSize: 13, color: "#243E36", verticalAlign: "middle" },
  assignName:     { fontWeight: 600, color: "#243E36" },
  fraction:       { fontWeight: 700, color: "#243E36", fontSize: 13 },
  fractionTotal:  { fontWeight: 400, color: "#9ab5a0" },
  statusPill:     { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, textTransform: "capitalize" },
  gradePill:      { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "inline-block" },
  modalOverlay:   { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:          { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" },
  modalHead:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e8f3ea", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  modalTitle:     { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" },
  modalClose:     { background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" },
  modalSub:       { fontSize: 13, color: "#5a7a6e", marginBottom: 16 },
  fieldGroup:     { display: "flex", flexDirection: "column", gap: 6 },
  label:          { fontSize: 13, fontWeight: 600, color: "#243E36" },
  input:          { width: "100%", padding: "11px 14px", borderRadius: 9, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
  actionBtn:      { display: "flex", alignItems: "center", gap: 5, background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#5a7a6e", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  smallBtn:       { background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#5a7a6e" },

  termTabs:      { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  termTab:       { padding: "8px 20px", borderRadius: 9, border: "1.5px solid #e8f3ea", background: "#fff", color: "#5a7a6e", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  termTabActive: { background: "#243E36", borderColor: "#243E36", color: "#fff" },
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
  .stat-card:hover    { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(36,62,54,0.08); }
  .nav-item:hover     { background: rgba(124,169,130,0.1) !important; color: rgba(241,247,237,0.85) !important; }
  .logout-btn:hover   { color: rgba(241,247,237,0.75) !important; }
  .primary-btn:hover  { background: #1a2e28 !important; }
  .grade-btn:hover    { background: #1a2e28 !important; }
  .action-btn:hover   { background: #e8f3ea !important; border-color: #c8ddc9 !important; }
  .filter-tab:hover   { background: #e8f3ea !important; }
  .icon-btn:hover     { background: #e8f3ea !important; }
  .quick-link:hover   { background: #e8f3ea !important; border-color: #c8ddc9 !important; }
  .avatar-trigger-btn:hover       { background: #e8f3ea !important; }
  .avatar-dropdown-item:hover     { background: #f5faf5 !important; }
  .avatar-dropdown-item-danger:hover { background: #fce8e8 !important; }
  .cancel-btn:hover               { background: #e8f3ea !important; }
  .lms-input:focus    { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
  .small-btn:hover    { background: #e8f3ea !important; }
  .notif-item:hover   { background: #f5faf5 !important; }
  .back-btn:hover     { color: #243E36 !important; }
  .icon-action-btn:hover { background: #e8f3ea !important; }
  .term-tab:hover        { background: #e8f3ea !important; }
  @media (max-width: 1100px) {
    div[style*="repeat(4, 1fr)"][style*="gap: 14"] { grid-template-columns: repeat(2,1fr) !important; }
    div[style*="grid-template-columns: 1fr 1fr 1fr"] { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 900px) {
    .sidebar { position: fixed !important; top:0; left:0; bottom:0; transform: translateX(-100%); z-index:40; }
    .close-btn { display: flex !important; }
    .menu-btn  { display: flex !important; }
    div[style*="grid-template-columns: 1fr 1fr 1fr"] { grid-template-columns: 1fr !important; }
    div[style*="padding: 28px"] { padding: 16px !important; }
  }
  @media (max-width: 640px) {
    .gradebook-header-actions { width: 100%; }
    .gradebook-header-actions button { flex: 1; justify-content: center; }
    .table-scroll-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .term-row .term-field { width: 100%; }
    .term-row .term-date-input { width: 100% !important; }
    .term-delete-btn { width: 100%; justify-content: center; margin-bottom: 0 !important; }
    .gradebook-setup-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 600px) {
    div[style*="repeat(4, 1fr)"][style*="gap: 14"] { grid-template-columns: repeat(2,1fr) !important; }
  }
  .analytics-pager { display: none; }
  .analytics-dot { width: 8px; height: 8px; border-radius: 50%; border: none; background: #d4e6d5; cursor: pointer; padding: 0; transition: background 0.2s, width 0.2s; }
  .analytics-dot-active { background: #7CA982; width: 20px; border-radius: 99px; }
  @media (max-width: 720px) {
    .analytics-grid {
      display: flex !important;
      grid-template-columns: none !important;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 4px;
    }
    .analytics-grid::-webkit-scrollbar { display: none; }
    .analytics-grid .analytics-card {
      flex: 0 0 100%;
      scroll-snap-align: start;
    }
    .analytics-pager {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin-top: 12px;
    }
  }
  @media (max-width: 480px) {
    /* notification dropdown: don't anchor to the bell button with a
       fixed width (it overflows off-screen); pin it to the viewport
       with side margins instead */
    .notif-box {
      position: fixed !important;
      top: 64px !important;
      left: 12px !important;
      right: 12px !important;
      width: auto !important;
      max-width: none !important;
    }
  }
`;
