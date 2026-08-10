// src/pages/student/StudentCoursePage.jsx

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, BookOpen, Users, FileText, Star, Calendar, MessageSquare, Clock, ChevronRight, CheckCircle2, AlertCircle, Loader2, RefreshCw, TrendingUp, Award, ClipboardList, Play, CheckSquare, GraduationCap, BookMarked, Edit3, Link, ExternalLink, Globe, } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../services/supabase";
import { getStudentAssessments } from "../../services/assessmentService";
import StudentAssessmentTaker from "./StudentAssessmentTaker";
import { notifyTeacherOnSubmission } from "../../services/teacherService";
import { getStudentAttendance, getCourseTerms } from "../../services/courseService";
import { getLectures } from "../../services/lectureService";

// ─────────────────────────────────────────────
// SUBJECT ILLUSTRATION 
// ─────────────────────────────────────────────
function getSubjectStamps(subject) {
  const s = (subject || "").toLowerCase();
  if (s.includes("math") || s.includes("algebra") || s.includes("calculus") || s.includes("stat")) {
    return [
      { type: "plus", x: 8, y: 18, size: 1.4, rot: 0, op: 0.13 },
      { type: "equals", x: 72, y: 8, size: 1.0, rot: 15, op: 0.11 },
      { type: "calc", x: 180, y: 22, size: 0.8, rot: -10, op: 0.10 },
      { type: "pi", x: 310, y: 15, size: 1.2, rot: 5, op: 0.12 },
      { type: "plus", x: 260, y: 120, size: 0.8, rot: 30, op: 0.09 },
      { type: "equals", x: 40, y: 140, size: 1.1, rot: -20, op: 0.10 },
      { type: "pi", x: 130, y: 110, size: 0.9, rot: 10, op: 0.11 },
      { type: "calc", x: 340, y: 80, size: 0.7, rot: 20, op: 0.09 },
      { type: "plus", x: 420, y: 30, size: 1.0, rot: -15, op: 0.10 },
      { type: "equals", x: 500, y: 130, size: 0.9, rot: 5, op: 0.11 },
      { type: "pi", x: 580, y: 20, size: 1.1, rot: -8, op: 0.10 },
      { type: "plus", x: 650, y: 100, size: 0.8, rot: 25, op: 0.09 },
      { type: "equals", x: 720, y: 50, size: 1.0, rot: 12, op: 0.11 },
      { type: "calc", x: 780, y: 140, size: 0.7, rot: -5, op: 0.09 },
      { type: "pi", x: 860, y: 80, size: 0.9, rot: 18, op: 0.10 },
      { type: "plus", x: 920, y: 20, size: 1.2, rot: -12, op: 0.11 },
    ];
  }
  if (s.includes("sci") || s.includes("bio") || s.includes("chem") || s.includes("phys")) {
    return [
      { type: "atom", x: 30, y: 20, size: 1.2, rot: 0, op: 0.12 },
      { type: "flask", x: 160, y: 10, size: 0.9, rot: 15, op: 0.11 },
      { type: "atom", x: 300, y: 100, size: 0.8, rot: 30, op: 0.10 },
      { type: "flask", x: 420, y: 20, size: 1.0, rot: -10, op: 0.11 },
      { type: "atom", x: 550, y: 80, size: 1.1, rot: 20, op: 0.12 },
      { type: "flask", x: 680, y: 130, size: 0.8, rot: 5, op: 0.10 },
      { type: "atom", x: 800, y: 30, size: 0.9, rot: -15, op: 0.11 },
      { type: "flask", x: 900, y: 100, size: 1.0, rot: 10, op: 0.10 },
      { type: "atom", x: 80, y: 130, size: 0.7, rot: -20, op: 0.09 },
      { type: "flask", x: 230, y: 110, size: 0.8, rot: 25, op: 0.10 },
      { type: "atom", x: 460, y: 140, size: 0.9, rot: -5, op: 0.11 },
      { type: "flask", x: 750, y: 60, size: 1.1, rot: 12, op: 0.12 },
    ];
  }
  if (s.includes("eng") || s.includes("lit") || s.includes("read") || s.includes("writ")) {
    return [
      { type: "book", x: 20, y: 15, size: 1.0, rot: -10, op: 0.12 },
      { type: "pen", x: 140, y: 5, size: 1.1, rot: 30, op: 0.11 },
      { type: "book", x: 280, y: 90, size: 0.8, rot: 15, op: 0.10 },
      { type: "pen", x: 400, y: 30, size: 0.9, rot: -20, op: 0.11 },
      { type: "book", x: 530, y: 120, size: 1.1, rot: 5, op: 0.12 },
      { type: "pen", x: 660, y: 10, size: 0.8, rot: 40, op: 0.10 },
      { type: "book", x: 780, y: 80, size: 0.9, rot: -8, op: 0.11 },
      { type: "pen", x: 890, y: 140, size: 1.0, rot: 20, op: 0.10 },
      { type: "book", x: 90, y: 140, size: 0.8, rot: 12, op: 0.09 },
      { type: "pen", x: 350, y: 150, size: 0.7, rot: -15, op: 0.10 },
      { type: "book", x: 620, y: 60, size: 1.0, rot: 8, op: 0.11 },
      { type: "pen", x: 850, y: 30, size: 0.9, rot: -25, op: 0.10 },
    ];
  }
  if (s.includes("fil") || s.includes("lang") || s.includes("speech")) {
    return [
      { type: "bubble", x: 15, y: 10, size: 1.0, rot: 0, op: 0.12 },
      { type: "pen", x: 160, y: 20, size: 1.1, rot: 25, op: 0.11 },
      { type: "bubble", x: 300, y: 100, size: 0.8, rot: -10, op: 0.10 },
      { type: "pen", x: 430, y: 15, size: 0.9, rot: 40, op: 0.11 },
      { type: "bubble", x: 560, y: 80, size: 1.1, rot: 5, op: 0.12 },
      { type: "pen", x: 700, y: 130, size: 0.8, rot: -20, op: 0.10 },
      { type: "bubble", x: 820, y: 25, size: 0.9, rot: 15, op: 0.11 },
      { type: "pen", x: 920, y: 90, size: 1.0, rot: 30, op: 0.10 },
      { type: "bubble", x: 80, y: 140, size: 0.8, rot: -5, op: 0.09 },
      { type: "pen", x: 250, y: 130, size: 0.7, rot: 18, op: 0.10 },
    ];
  }
  if (s.includes("hist") || s.includes("social") || s.includes("geo") || s.includes("araling")) {
    return [
      { type: "scroll", x: 10, y: 10, size: 0.9, rot: -5, op: 0.12 },
      { type: "hourglass", x: 150, y: 20, size: 1.1, rot: 10, op: 0.11 },
      { type: "scroll", x: 290, y: 90, size: 0.8, rot: 20, op: 0.10 },
      { type: "hourglass", x: 420, y: 15, size: 0.9, rot: -15, op: 0.11 },
      { type: "scroll", x: 550, y: 110, size: 1.0, rot: 5, op: 0.12 },
      { type: "hourglass", x: 680, y: 30, size: 0.8, rot: 25, op: 0.10 },
      { type: "scroll", x: 800, y: 80, size: 1.1, rot: -10, op: 0.11 },
      { type: "hourglass", x: 910, y: 140, size: 0.9, rot: 8, op: 0.10 },
      { type: "scroll", x: 80, y: 150, size: 0.7, rot: 15, op: 0.09 },
      { type: "hourglass", x: 350, y: 140, size: 0.8, rot: -20, op: 0.10 },
    ];
  }
  if (s.includes("pe") || s.includes("sport") || s.includes("health") || s.includes("mapeh")) {
    return [
      { type: "star", x: 20, y: 15, size: 1.0, rot: 0, op: 0.12 },
      { type: "trophy", x: 150, y: 10, size: 0.9, rot: 5, op: 0.11 },
      { type: "star", x: 290, y: 100, size: 0.8, rot: 20, op: 0.10 },
      { type: "trophy", x: 420, y: 20, size: 1.1, rot: -10, op: 0.11 },
      { type: "star", x: 560, y: 80, size: 0.9, rot: 30, op: 0.12 },
      { type: "trophy", x: 690, y: 130, size: 0.8, rot: -5, op: 0.10 },
      { type: "star", x: 810, y: 25, size: 1.0, rot: 15, op: 0.11 },
      { type: "trophy", x: 920, y: 90, size: 0.9, rot: -20, op: 0.10 },
      { type: "star", x: 90, y: 145, size: 0.7, rot: 10, op: 0.09 },
      { type: "trophy", x: 480, y: 150, size: 0.8, rot: 25, op: 0.10 },
      { type: "star", x: 730, y: 60, size: 1.1, rot: -8, op: 0.11 },
    ];
  }
  return [
    { type: "gradcap", x: 20, y: 10, size: 1.1, rot: -8, op: 0.12 },
    { type: "pencil", x: 140, y: 20, size: 0.9, rot: 20, op: 0.11 },
    { type: "book", x: 270, y: 80, size: 1.0, rot: -15, op: 0.10 },
    { type: "gradcap", x: 400, y: 15, size: 0.8, rot: 10, op: 0.11 },
    { type: "pencil", x: 530, y: 110, size: 1.1, rot: -25, op: 0.12 },
    { type: "book", x: 660, y: 30, size: 0.9, rot: 5, op: 0.10 },
    { type: "gradcap", x: 790, y: 90, size: 1.0, rot: 15, op: 0.11 },
    { type: "pencil", x: 900, y: 140, size: 0.8, rot: -10, op: 0.10 },
    { type: "book", x: 75, y: 140, size: 0.9, rot: 25, op: 0.09 },
    { type: "gradcap", x: 210, y: 130, size: 0.7, rot: -20, op: 0.10 },
    { type: "pencil", x: 460, y: 150, size: 0.8, rot: 12, op: 0.10 },
    { type: "book", x: 840, y: 20, size: 1.0, rot: -5, op: 0.11 },
  ];
}

function IconStamp({ type, x, y, size = 1, rot = 0, op = 0.12 }) {
  const t = `translate(${x}, ${y}) rotate(${rot}) scale(${size})`;
  if (type === "plus") return (<g transform={t} opacity={op}><rect x="-4" y="-18" width="8" height="36" rx="4" fill="white" /><rect x="-18" y="-4" width="36" height="8" rx="4" fill="white" /></g>);
  if (type === "equals") return (<g transform={t} opacity={op}><rect x="-18" y="-8" width="36" height="7" rx="3" fill="white" /><rect x="-18" y="5" width="36" height="7" rx="3" fill="white" /></g>);
  if (type === "pi") return (<g transform={t} opacity={op}><rect x="-20" y="-18" width="40" height="7" rx="3" fill="white" /><rect x="-14" y="-11" width="7" height="28" rx="3" fill="white" /><rect x="7" y="-11" width="7" height="28" rx="3" fill="white" /></g>);
  if (type === "calc") return (<g transform={t} opacity={op}><rect x="-18" y="-26" width="36" height="52" rx="6" fill="white" /><rect x="-13" y="-22" width="26" height="14" rx="3" fill="white" opacity="0.5" />{[-1,0,1].map(col => [-1,0,1].map(row => (<rect key={`${col}${row}`} x={-9 + col * 10} y={0 + row * 10} width="7" height="7" rx="2" fill="white" opacity="0.4" />)))}</g>);
  if (type === "atom") return (<g transform={t} opacity={op}><circle cx="0" cy="0" r="6" fill="white" /><ellipse cx="0" cy="0" rx="22" ry="9" stroke="white" strokeWidth="3" fill="none" /><ellipse cx="0" cy="0" rx="22" ry="9" stroke="white" strokeWidth="3" fill="none" transform="rotate(60)" /><ellipse cx="0" cy="0" rx="22" ry="9" stroke="white" strokeWidth="3" fill="none" transform="rotate(120)" /></g>);
  if (type === "flask") return (<g transform={t} opacity={op}><path d="M-8,-22 L-8,2 L-22,26 Q-26,32 -18,34 L18,34 Q26,32 22,26 L8,2 L8,-22 Z" fill="white" /><rect x="-10" y="-28" width="20" height="8" rx="3" fill="white" /><circle cx="-12" cy="22" r="4" fill="white" opacity="0.5" /><circle cx="4" cy="28" r="3" fill="white" opacity="0.5" /></g>);
  if (type === "book") return (<g transform={t} opacity={op}><path d="M0,-22 Q0,-26 4,-26 L28,-22 Q32,-22 32,-18 L32,22 Q32,26 28,26 L4,22 Q0,22 0,18 Z" fill="white" /><path d="M0,-22 Q0,-26 -4,-26 L-28,-22 Q-32,-22 -32,-18 L-32,22 Q-32,26 -28,26 L-4,22 Q0,22 0,18 Z" fill="white" opacity="0.6" />{[-3,-1,1,3].map((i,idx) => (<rect key={idx} x="-28" y={i*6-1} width="22" height="3" rx="1" fill="white" opacity="0.3" />))}{[-3,-1,1,3].map((i,idx) => (<rect key={`r${idx}`} x="6" y={i*6-1} width="22" height="3" rx="1" fill="white" opacity="0.3" />))}</g>);
  if (type === "pen") return (<g transform={t} opacity={op}><path d="M-5,-28 L5,-28 L8,20 L0,32 L-8,20 Z" fill="white" /><rect x="-6" y="-32" width="12" height="8" rx="3" fill="white" opacity="0.6" /><rect x="-5" y="16" width="10" height="8" fill="white" opacity="0.5" /></g>);
  if (type === "pencil") return (<g transform={t} opacity={op}><rect x="-6" y="-28" width="12" height="44" rx="3" fill="white" /><polygon points="-6,16 6,16 0,30" fill="white" opacity="0.7" /><rect x="-6" y="-28" width="12" height="10" rx="3" fill="white" opacity="0.5" /><rect x="-5" y="10" width="10" height="8" fill="white" opacity="0.4" /></g>);
  if (type === "bubble") return (<g transform={t} opacity={op}><rect x="-28" y="-22" width="56" height="36" rx="10" fill="white" /><polygon points="-18,14 -4,14 -18,30" fill="white" />{[-1,0,1].map((i, idx) => (<rect key={idx} x="-20" y={i*10-2} width={36 - idx*8} height="5" rx="2" fill="white" opacity="0.4" />))}</g>);
  if (type === "scroll") return (<g transform={t} opacity={op}><rect x="-20" y="-28" width="40" height="56" rx="4" fill="white" opacity="0.8" /><ellipse cx="-20" cy="0" rx="7" ry="28" fill="white" /><ellipse cx="20" cy="0" rx="7" ry="28" fill="white" />{[-3,-1,1,3].map((i, idx) => (<rect key={idx} x="-14" y={i*9-2} width="28" height="4" rx="2" fill="white" opacity="0.35" />))}</g>);
  if (type === "hourglass") return (<g transform={t} opacity={op}><path d="M-20,-28 L20,-28 L4,0 L20,28 L-20,28 L-4,0 Z" fill="white" opacity="0.8" /><rect x="-22" y="-32" width="44" height="8" rx="4" fill="white" /><rect x="-22" y="24" width="44" height="8" rx="4" fill="white" /><circle cx="0" cy="5" r="4" fill="white" opacity="0.5" /></g>);
  if (type === "star") return (<g transform={t} opacity={op}><polygon points="0,-26 6,-8 26,-8 10,4 16,22 0,12 -16,22 -10,4 -26,-8 -6,-8" fill="white" /></g>);
  if (type === "trophy") return (<g transform={t} opacity={op}><path d="M-18,-24 L18,-24 L14,16 Q10,28 0,32 Q-10,28 -14,16 Z" fill="white" opacity="0.8" /><rect x="-8" y="28" width="16" height="6" rx="3" fill="white" /><rect x="-14" y="34" width="28" height="6" rx="3" fill="white" /><path d="M-18,-18 Q-30,-18 -30,-4 Q-30,12 -18,14" stroke="white" strokeWidth="5" fill="none" /><path d="M18,-18 Q30,-18 30,-4 Q30,12 18,14" stroke="white" strokeWidth="5" fill="none" /></g>);
  if (type === "gradcap") return (<g transform={t} opacity={op}><polygon points="0,-16 32,0 0,16 -32,0" fill="white" /><path d="M-16,6 L-16,24 Q-16,32 0,36 Q16,32 16,24 L16,6" fill="white" opacity="0.7" /><rect x="28" y="0" width="6" height="22" rx="3" fill="white" /><ellipse cx="31" cy="24" rx="7" ry="4" fill="white" /></g>);
  return null;
}

function SubjectIllustration({ subject }) {
  const stamps = getSubjectStamps(subject);
  return (
    <svg viewBox="0 0 960 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {stamps.map((st, i) => <IconStamp key={i} {...st} />)}
    </svg>
  );
}

// ─────────────────────────────────────────────
// LINK PLATFORM DETECTOR 
// ─────────────────────────────────────────────
function getLinkPlatform(url = "") {
  if (!url) return { label: "Link", color: "#7c3aed" };
  const u = url.toLowerCase();
  if (u.includes("github.com"))      return { label: "GitHub",       color: "#24292e" };
  if (u.includes("vercel.app"))      return { label: "Vercel",       color: "#000" };
  if (u.includes("netlify.app"))     return { label: "Netlify",      color: "#00ad9f" };
  if (u.includes("drive.google"))    return { label: "Google Drive", color: "#1a73e8" };
  if (u.includes("docs.google"))     return { label: "Google Docs",  color: "#1a73e8" };
  if (u.includes("figma.com"))       return { label: "Figma",        color: "#f24e1e" };
  if (u.includes("youtube.com") || u.includes("youtu.be")) return { label: "YouTube",  color: "#ff0000" };
  if (u.includes("onedrive") || u.includes("1drv"))        return { label: "OneDrive", color: "#0078d4" };
  return { label: "Link", color: "#7c3aed" };
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
const TABS = [
  { id: "overview",    label: "Overview",    icon: <BookOpen size={15} />       },
  { id: "stream",      label: "Stream",      icon: <MessageSquare size={15} />  },
  { id: "assignments", label: "Assignments", icon: <FileText size={15} />       },
  { id: "assessments", label: "Assessments", icon: <ClipboardList size={15} />  },
  { id: "lectures",    label: "Lectures",    icon: <Link size={15} />           },
  { id: "grades",      label: "Grades",      icon: <Star size={15} />           },
  { id: "schedule",    label: "Schedule",    icon: <Calendar size={15} />       },
  { id: "attendance",  label: "Attendance",  icon: <Calendar size={15} />       },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatDueDate(dateStr) {
  if (!dateStr) return "No due date";
  const due = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diff < 0)   return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return due.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
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
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function Spinner({ size = 20 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 0" }}>
      <Loader2 size={size} color="#7CA982" style={{ animation: "spin 1s linear infinite" }} />
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

function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 20px", textAlign: "center" }}>
      {icon}
      <p style={{ fontSize: 15, fontWeight: 600, color: "#5a7a6e" }}>{title}</p>
      {subtitle && <p style={{ fontSize: 13, color: "#9ab5a0" }}>{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT: StudentCoursePage
// ─────────────────────────────────────────────
export default function StudentCoursePage({ course, onBack }) {
  const { user } = useAuthStore();
  const [activeTab,        setActiveTab]        = useState("overview");
  const [takingAssessment, setTakingAssessment] = useState(null);
  const [essayAssignment,  setEssayAssignment]  = useState(null);
  const [linkAssignment,   setLinkAssignment]   = useState(null);
  const [projectAssignment, setProjectAssignment] = useState(null); // ← NEW

  const [announcements, setAnnouncements] = useState([]);
  const [assignments,   setAssignments]   = useState([]);
  const [assessments,   setAssessments]   = useState([]);
  const [lectures,      setLectures]      = useState([]);
  const [grades, setGrades] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [courseStats,   setCourseStats]   = useState(null);
  const [terms, setTerms] = useState([]);

  const [loading, setLoading] = useState({
  announcements: true, assignments: true, assessments: true, grades: true, stats: true, attendance: true, lectures: true,
});
  const [errors, setErrors] = useState({ attendance: null });

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));
  const setErr  = (key, val) => setErrors(prev  => ({ ...prev, [key]: val }));

  const fetchAnnouncements = useCallback(async () => {
    setLoad("announcements", true); setErr("announcements", null);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select(`id, title, content, created_at, is_global, profiles!announcements_author_id_fkey ( full_name )`)
        .eq("course_id", course.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      setAnnouncements(data || []);
    } catch (e) { setErr("announcements", e.message); }
    finally { setLoad("announcements", false); }
  }, [course.id]);

  const fetchAssignments = useCallback(async () => {
    if (!user?.id) return;
    setLoad("assignments", true); setErr("assignments", null);
    try {
      const { data: assignData, error: assignErr } = await supabase
        .from("assignments")
        .select("id, title, description, due_date, max_points, status, assignment_type, rubric_criteria, term_id")
        .eq("course_id", course.id)
        .eq("status", "active")
        .order("due_date", { ascending: true });
      if (assignErr) throw new Error(assignErr.message);

      const ids = (assignData || []).map(a => a.id);
      let submissionMap = {};
      if (ids.length > 0) {
        const { data: subs } = await supabase
          .from("submissions")
          .select("assignment_id, status, grade, feedback, essay_answer, file_url, notes, demo_url")
          .eq("student_id", user.id)
          .in("assignment_id", ids);
        (subs || []).forEach(s => { submissionMap[s.assignment_id] = s; });
      }

      setAssignments((assignData || []).map(a => ({
        ...a,
        maxPoints:  a.max_points,
        submission: submissionMap[a.id] ?? null,
      })));
    } catch (e) { setErr("assignments", e.message); }
    finally { setLoad("assignments", false); }
  }, [course.id, user?.id]);

  const fetchAssessments = useCallback(async () => {
    if (!user?.id) return;
    setLoad("assessments", true); setErr("assessments", null);
    try {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, title, description, type, status, due_date, time_limit, max_points, created_at, term_id")
        .eq("course_id", course.id)
        .eq("status", "published")
        .order("due_date", { ascending: true });
      if (error) throw new Error(error.message);

      const ids = (data || []).map(a => a.id);
      let subMap = {};
      if (ids.length > 0) {
        const { data: subs } = await supabase
          .from("assessment_submissions")
          .select("assessment_id, score, max_score, status")
          .eq("student_id", user.id)
          .in("assessment_id", ids);
        (subs || []).forEach(s => { subMap[s.assessment_id] = s; });
      }

      setAssessments((data || []).map(a => ({
        ...a, courseName: course.title, submission: subMap[a.id] ?? null,
      })));
    } catch (e) { setErr("assessments", e.message); }
    finally { setLoad("assessments", false); }
  }, [course.id, course.title, user?.id]);

  const fetchLectures = useCallback(async () => {
    setLoad("lectures", true); setErr("lectures", null);
    try {
      const data = await getLectures(course.id);
      setLectures(data);
    } catch (e) { setErr("lectures", e.message); }
    finally { setLoad("lectures", false); }
  }, [course.id]);

const fetchGrades = useCallback(async () => {
  if (!user?.id) return;
  setLoad("grades", true); setErr("grades", null);
  try {
    const { data: configRow } = await supabase
      .from("gradebook_config")
      .select("*")
      .eq("course_id", course.id)
      .maybeSingle();

    const config = configRow || {
      quiz_assessment_ids: [], exam_assessment_ids: [], activity_assessment_ids: [],
      assignment_assignment_ids: [], activity_assignment_ids: [],
      show_quiz: true, show_exam: true, show_activity: true, show_project: true,
      show_recitation: false, show_attendance: false,
    };

    const { data: assessmentsData, error: assessErr } = await supabase
      .from("assessments")
      .select("id, title, max_points, type, term_id")
      .eq("course_id", course.id);
    if (assessErr) throw new Error(assessErr.message);

    const quizIds = config.quiz_assessment_ids || [];
    const examIds = config.exam_assessment_ids || [];
    const activityAssessIds = config.activity_assessment_ids || [];
    const quizAssessments = (assessmentsData || []).filter(a => quizIds.includes(a.id));
    const examAssessments = (assessmentsData || []).filter(a => examIds.includes(a.id));
    const activityAssessments = (assessmentsData || []).filter(a => activityAssessIds.includes(a.id));

    const assessmentIds = (assessmentsData || []).map(a => a.id);
    let assessSubs = [];
    if (assessmentIds.length > 0) {
      const { data: aSubs } = await supabase
        .from("assessment_submissions")
        .select("assessment_id, score, max_score, status, submitted_at")
        .eq("student_id", user.id)
        .in("assessment_id", assessmentIds);
      assessSubs = aSubs || [];
    }
    const assessSubMap = {};
    assessSubs.forEach(s => { assessSubMap[s.assessment_id] = s; });

    const { data: assignmentsData, error: assignErr } = await supabase
      .from("assignments")
      .select("id, title, max_points, assignment_type, term_id")
      .eq("course_id", course.id)
      .eq("status", "active");
    if (assignErr) throw new Error(assignErr.message);

    const assignmentIds2 = config.assignment_assignment_ids || [];
    const regularAssignments  = (assignmentsData || []).filter(a => assignmentIds2.includes(a.id));
    const activityIds = config.activity_assignment_ids || [];
    const activityAssignments = (assignmentsData || []).filter(a => activityIds.includes(a.id));
    const projectAssignments  = (assignmentsData || []).filter(a => a.assignment_type === "project");

    const assignmentIds = (assignmentsData || []).map(a => a.id);
    let assignSubs = [];
    if (assignmentIds.length > 0) {
      const { data: subs } = await supabase
        .from("submissions")
        .select("assignment_id, grade, status, submitted_at")
        .eq("student_id", user.id)
        .in("assignment_id", assignmentIds);
      assignSubs = subs || [];
    }
    const assignSubMap = {};
    assignSubs.forEach(s => { assignSubMap[s.assignment_id] = s; });

    const { data: manualRow } = await supabase
      .from("gradebook_manual_scores")
      .select("recitation_score, attendance_score")
      .eq("course_id", course.id)
      .eq("student_id", user.id)
      .maybeSingle();

    setGrades({
      config,
      quizzes: quizAssessments.map(a => ({ id: a.id, title: a.title, maxPoints: a.max_points, term_id: a.term_id, sub: assessSubMap[a.id] ?? null })),
      exams:   examAssessments.map(a => ({ id: a.id, title: a.title, maxPoints: a.max_points, term_id: a.term_id, sub: assessSubMap[a.id] ?? null })),
      assignments: regularAssignments.map(a => ({ id: a.id, title: a.title, maxPoints: a.max_points, type: a.assignment_type, term_id: a.term_id, sub: assignSubMap[a.id] ?? null })),
      activities: [
        ...activityAssignments.map(a => ({
          id: a.id, title: a.title, maxPoints: a.max_points, type: a.assignment_type, term_id: a.term_id,
          sub: assignSubMap[a.id] ?? null,
        })),
        ...activityAssessments.map(a => ({
          id: a.id, title: a.title, maxPoints: a.max_points, type: a.type, term_id: a.term_id,
          sub: assessSubMap[a.id] ? { grade: assessSubMap[a.id].score, submitted_at: assessSubMap[a.id].submitted_at, status: assessSubMap[a.id].status } : null,
        })),
      ],
      projects:   projectAssignments.map(a => ({ id: a.id, title: a.title, maxPoints: a.max_points, term_id: a.term_id, sub: assignSubMap[a.id] ?? null })),
      recitation: manualRow?.recitation_score ?? null,
      attendance: manualRow?.attendance_score ?? null,
    });
  } catch (e) { setErr("grades", e.message); }
  finally { setLoad("grades", false); }
}, [course.id, user?.id]);

  const fetchAttendance = useCallback(async () => {
  if (!user?.id) return;
  setLoad("attendance", true); setErr("attendance", null);
  try {
    const data = await getStudentAttendance(course.id, user.id);
    setAttendance(data);
  } catch (e) { setErr("attendance", e.message); }
  finally { setLoad("attendance", false); }
}, [course.id, user?.id]);

  const fetchStats = useCallback(async () => {
    setLoad("stats", true);
    try {
      const { data: studentCount } = await supabase
        .rpc("get_course_enrollment_count", { p_course_id: course.id });
      const { count: assignmentCount } = await supabase
        .from("assignments").select("id", { count: "exact", head: true })
        .eq("course_id", course.id).eq("status", "active");
      const { count: assessmentCount } = await supabase
        .from("assessments").select("id", { count: "exact", head: true })
        .eq("course_id", course.id).eq("status", "published");
      setCourseStats({ students: studentCount ?? 0, assignments: assignmentCount ?? 0, assessments: assessmentCount ?? 0 });
    } catch (_) {}
    finally { setLoad("stats", false); }
  }, [course.id]);

  useEffect(() => {
    fetchAnnouncements();
    fetchAssignments();
    fetchAssessments();
    fetchGrades();
    fetchStats();
    fetchAttendance();
    fetchLectures();
    getCourseTerms(course.id).then(setTerms).catch(() => {});
  }, [fetchAnnouncements, fetchAssignments, fetchAssessments, fetchGrades, fetchStats]);

  if (projectAssignment) {
    return (
      <ProjectSubmitModal
        assignment={projectAssignment}
        studentId={user?.id}
        onClose={() => setProjectAssignment(null)}
        onSubmitted={() => {
          setProjectAssignment(null);
          fetchAssignments();
          fetchGrades();
        }}
      />
    );
  }

  
  if (linkAssignment) {
    return (
      <LinkSubmitModal
        assignment={linkAssignment}
        studentId={user?.id}
        onClose={() => setLinkAssignment(null)}
        onSubmitted={() => {
          setLinkAssignment(null);
          fetchAssignments();
          fetchGrades();
        }}
      />
    );
  }

  
  if (essayAssignment) {
    return (
      <EssaySubmitModal
        assignment={essayAssignment}
        studentId={user?.id}
        onClose={() => setEssayAssignment(null)}
        onSubmitted={() => {
          setEssayAssignment(null);
          fetchAssignments();
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
          fetchGrades();
          setActiveTab("assignments");
        }}
      />
    );
  }

  const color         = course.cover_color || "#243E36";
  const pendingAssign = assignments.filter(a => !a.submission).length;
  const pendingAssess = assessments.filter(a => !a.submission).length;
  const avgGrade = (() => {
  const { quizzes = [], exams = [], assignments = [], activities = [], projects = [] } = grades || {};
  const percents = [
    ...quizzes.filter(q => q.sub?.score != null && (q.sub.max_score ?? q.maxPoints) > 0)
      .map(q => Math.min(100, (q.sub.score / (q.sub.max_score ?? q.maxPoints)) * 100)),
    ...exams.filter(e => e.sub?.score != null && (e.sub.max_score ?? e.maxPoints) > 0)
      .map(e => Math.min(100, (e.sub.score / (e.sub.max_score ?? e.maxPoints)) * 100)),
    ...assignments.filter(a => a.sub?.grade != null && a.maxPoints > 0)
      .map(a => Math.min(100, (a.sub.grade / a.maxPoints) * 100)),
    ...activities.filter(a => a.sub?.grade != null && a.maxPoints > 0)
      .map(a => Math.min(100, (a.sub.grade / a.maxPoints) * 100)),
    ...projects.filter(p => p.sub?.grade != null && p.maxPoints > 0)
      .map(p => Math.min(100, (p.sub.grade / p.maxPoints) * 100)),
  ];
  return percents.length > 0 ? Math.round(percents.reduce((s, v) => s + v, 0) / percents.length) : null;
})();

  return (
    <div style={s.root} className="course-root">
      <style>{css}</style>

      <div style={{ ...s.hero, background: color, position: "relative", overflow: "hidden" }}>
        <SubjectIllustration subject={course.subject} />
        <button style={s.backBtn} onClick={onBack} className="back-btn">
          <ArrowLeft size={16} /> Back to Courses
        </button>
        <div style={s.heroContent}>
          <span style={s.subjectBadge}>{course.subject ?? "Course"}</span>
          <h1 style={s.heroTitle}>{course.title}</h1>
          <p style={s.heroTeacher}>👨‍🏫 {course.teacherName}</p>
          {course.schedule && <p style={s.heroSchedule}>🗓 {course.schedule}</p>}
        </div>
        <div style={s.heroStats}>
          <div style={s.heroStat}><p style={s.heroStatNum}>{courseStats?.students ?? "…"}</p><p style={s.heroStatLabel}>Students</p></div>
          <div style={s.heroStatDivider} />
          <div style={s.heroStat}><p style={s.heroStatNum}>{courseStats?.assignments ?? "…"}</p><p style={s.heroStatLabel}>Assignments</p></div>
          <div style={s.heroStatDivider} />
          <div style={s.heroStat}><p style={s.heroStatNum}>{avgGrade !== null ? `${avgGrade}%` : "—"}</p><p style={s.heroStatLabel}>Your Avg.</p></div>
        </div>
      </div>

      <div style={s.tabBar} className="tab-bar">
        {TABS.map(tab => ( <button key={tab.id} onClick={() => { setActiveTab(tab.id);
        if (tab.id === "assessments") fetchAssessments();
        if (tab.id === "lectures") fetchLectures();
        if (tab.id === "grades") fetchGrades();
        if (tab.id === "attendance") fetchAttendance();
        if (tab.id === "stream") fetchAnnouncements();
        if (tab.id === "overview") fetchStats();
        if (tab.id === "assignments") fetchAssignments();
  }}

  style={{
    ...s.tab,
    ...(activeTab === tab.id ? {
      ...s.tabActive,
      borderBottomColor: color   
    } : {})
  }}
  className="tab-btn">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {tab.icon} {tab.label}
              {tab.id === "assignments" && pendingAssign > 0 && (
  <span style={s.tabBadge}>{pendingAssign}</span>
)}
{tab.id === "assessments" && pendingAssess > 0 && (
  <span style={s.tabBadge}>{pendingAssess}</span>
)}
            </span>
          </button>
        ))}
      </div>

      <div style={s.content}>
        {activeTab === "overview"    && <OverviewTab course={course} courseStats={courseStats} announcements={announcements} assignments={assignments} assessments={assessments} avgGrade={avgGrade} loading={loading} setActiveTab={setActiveTab} onTake={setTakingAssessment} onSubmitEssay={setEssayAssignment} onSubmitLink={setLinkAssignment} onSubmitProject={setProjectAssignment} color={color} />}
        {activeTab === "stream"      && <StreamTab announcements={announcements} loading={loading.announcements} error={errors.announcements} onRetry={fetchAnnouncements} color={color} />}
        {activeTab === "assignments" && (<AssignmentsTab assignments={assignments} loading={loading} errors={errors} onRetry={{ fetchAssignments }} onSubmitEssay={setEssayAssignment} onSubmitLink={setLinkAssignment} onSubmitProject={setProjectAssignment} color={color} terms={terms} /> )}
        {activeTab === "assessments" && (<AssessmentsTab assessments={assessments} loading={loading.assessments} errors={errors} onRetry={fetchAssessments} onTake={setTakingAssessment} color={color} terms={terms} /> )}
        {activeTab === "lectures"    && (<LecturesTab lectures={lectures} loading={loading.lectures} error={errors.lectures} onRetry={fetchLectures} color={color} /> )}
        {activeTab === "grades"      && <GradesTab grades={grades} loading={loading.grades} error={errors.grades} onRetry={fetchGrades} avgGrade={avgGrade} color={color} terms={terms} />}
        {activeTab === "attendance" && (<AttendanceTab attendance={attendance} loading={loading.attendance} error={errors.attendance} onRetry={fetchAttendance} color={color} /> )}
        {activeTab === "schedule"    && <ScheduleTab course={course} assignments={assignments} assessments={assessments} loading={loading} color={color} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: OVERVIEW
// ─────────────────────────────────────────────
function OverviewTab({ course, courseStats, announcements, assignments, assessments, avgGrade, loading, setActiveTab, onTake, onSubmitEssay, onSubmitLink, onSubmitProject, color }) {
  const pendingAssign  = assignments.filter(a => !a.submission);
  const pendingAssess  = assessments.filter(a => !a.submission);
  const recentAnnounce = announcements.slice(0, 3);

  return (
    <div className="fade-up">
      <div style={s.statsRow}>
        {[
          { label: "Classmates",      value: courseStats?.students   ?? "…", icon: <Users size={18} />,        color: "#243E36" },
          { label: "Assignments",     value: courseStats?.assignments ?? "…", icon: <FileText size={18} />,     color: "#7CA982" },
          { label: "Assessments",     value: courseStats?.assessments ?? "…", icon: <ClipboardList size={18} />,color: "#4a7c59" },
          { label: "Your Avg. Grade", value: avgGrade !== null ? `${avgGrade}%` : "—", icon: <TrendingUp size={18} />, color: "#e0a052" },
        ].map((st, i) => (
          <div key={i} style={s.statCard} className="stat-card">
            <div style={{ ...s.statIcon, background: st.color + "18", color: st.color }}>{st.icon}</div>
            <p style={s.statVal}>{st.value}</p>
            <p style={s.statLabel}>{st.label}</p>
          </div>
        ))}
      </div>

      <div style={s.twoCol}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <h2 style={s.sectionTitle}>About this Course</h2>
            <div style={s.infoCard}>
              {course.description
                ? <p style={{ fontSize: 14, color: "#5a7a6e", lineHeight: 1.7 }}>{course.description}</p>
                : <p style={{ fontSize: 14, color: "#9ab5a0", fontStyle: "italic" }}>No description provided.</p>
              }
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={s.infoRow}><GraduationCap size={14} color="#7CA982" /><span style={s.infoLabel}>Teacher</span><span style={s.infoValue}>{course.teacherName}</span></div>
                {course.subject && <div style={s.infoRow}><BookMarked size={14} color="#7CA982" /><span style={s.infoLabel}>Subject</span><span style={s.infoValue}>{course.subject}</span></div>}
                {course.schedule && <div style={s.infoRow}><Calendar size={14} color="#7CA982" /><span style={s.infoLabel}>Schedule</span><span style={s.infoValue}>{course.schedule}</span></div>}
              </div>
            </div>
          </div>

          {pendingAssess.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h2 style={s.sectionTitle}>Pending Assessments</h2>
                <button style={s.seeAll} onClick={() => setActiveTab("assignments")}>See all <ChevronRight size={13} /></button>
              </div>
              <div style={s.listCard}>
                {pendingAssess.slice(0, 3).map((a, i, arr) => (
                  <div key={a.id} style={{ ...s.listRow, borderBottom: i < arr.length - 1 ? "1px solid #e8f3ea" : "none", cursor: "pointer" }} onClick={() => onTake(a)}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e8eef9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ClipboardList size={14} color="#3a6fd8" /></div>
                    <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{a.title}</p><p style={{ fontSize: 11, color: "#9ab5a0" }}>Due {formatDueDate(a.due_date)}</p></div>
                    <span style={{ ...s.urgentBadge, ...(isUrgent(a.due_date) ? s.urgentBadgeRed : {}) }}>{formatDueDate(a.due_date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h2 style={s.sectionTitle}>Upcoming Assignments</h2>
              <button style={s.seeAll} onClick={() => setActiveTab("assignments")}>See all <ChevronRight size={13} /></button>
            </div>
            {loading.assignments ? <Spinner /> : pendingAssign.length === 0 ? (
              <div style={{ ...s.listCard, padding: "20px", textAlign: "center", color: "#9ab5a0", fontSize: 13 }}>All caught up! 🎉</div>
            ) : (
              <div style={s.listCard}>
                {pendingAssign.slice(0, 4).map((a, i, arr) => {
                  const isEssay   = a.assignment_type === "essay";
                  const isLink    = a.assignment_type === "link";
                  const isProject = a.assignment_type === "project";
                  return (
                    <div key={a.id} style={{ ...s.listRow, borderBottom: i < arr.length - 1 ? "1px solid #e8f3ea" : "none", cursor: (isEssay || isLink || isProject) ? "pointer" : "default" }}
                      onClick={() => {
                        if (isEssay) onSubmitEssay(a);
                        else if (isLink) onSubmitLink(a);
                        else if (isProject) onSubmitProject(a);
                      }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: isEssay ? "#4a7c5918" : isLink ? "#7c3aed18" : isProject ? "#c0532a18" : "#F1F7ED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isEssay ? <Edit3 size={14} color="#4a7c59" /> : isLink ? <Link size={14} color="#7c3aed" /> : isProject ? <Globe size={14} color="#c0532a" /> : <FileText size={14} color="#7CA982" />}
                      </div>
                      <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{a.title}</p><p style={{ fontSize: 11, color: "#9ab5a0" }}>{a.maxPoints} pts</p></div>
                      <span style={{ ...s.urgentBadge, ...(isUrgent(a.due_date) ? s.urgentBadgeRed : {}) }}>{formatDueDate(a.due_date)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h2 style={s.sectionTitle}>Recent Announcements</h2>
              <button style={s.seeAll} onClick={() => setActiveTab("stream")}>See all <ChevronRight size={13} /></button>
            </div>
            {loading.announcements ? <Spinner /> : recentAnnounce.length === 0 ? (
              <div style={{ ...s.listCard, padding: "20px", textAlign: "center", color: "#9ab5a0", fontSize: 13 }}>No announcements yet.</div>
            ) : (
              <div style={s.listCard}>
                {recentAnnounce.map((a, i) => (
                  <div key={a.id} style={{ ...s.listRow, borderBottom: i < recentAnnounce.length - 1 ? "1px solid #e8f3ea" : "none", alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e8f3ea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}><MessageSquare size={14} color="#7CA982" /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#243E36", marginBottom: 2 }}>{a.title}</p>
                      <p style={{ fontSize: 11, color: "#9ab5a0" }}>{a.profiles?.full_name ?? "Teacher"} · {timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: STREAM
// ─────────────────────────────────────────────
function StreamTab({ announcements, loading, error, onRetry, color }) {
  if (loading) return <Spinner />;
  return (
    <div className="fade-up">
      <h2 style={s.pageTitle}>Course Stream</h2>
      <p style={{ fontSize: 14, color: "#9ab5a0", marginBottom: 20 }}>Announcements and updates from your teacher.</p>
      {error && <ErrorBanner message={error} onRetry={onRetry} />}
      {announcements.length === 0 ? (
        <EmptyState icon={<MessageSquare size={40} color="#c8ddc9" />} title="No announcements yet" subtitle="Your teacher hasn't posted anything for this course yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {announcements.map(a => (
            <div key={a.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 14, overflow: "hidden", borderLeft: `4px solid ${color}` }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8f3ea", display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MessageSquare size={18} color={color} /></div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#243E36" }}>{a.title}</p>
                  <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 2 }}>{a.profiles?.full_name ?? "Teacher"} · {timeAgo(a.created_at)}</p>
                </div>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <p style={{ fontSize: 14, color: "#5a7a6e", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: ASSIGNMENTS
// ─────────────────────────────────────────────
function AssignmentsTab({ assignments = [], loading, errors = {}, onRetry = {}, onSubmitEssay, onSubmitLink, onSubmitProject, color, terms = [] }) {
  const [activeTerm, setActiveTerm] = useState(null);

  useEffect(() => {
    if (terms.length > 0 && !terms.some(t => t.id === activeTerm)) {
      setActiveTerm(terms[0].id);
    }
  }, [terms]);

  const getAssignStatus = (a) => {
    if (!a.submission) return "pending";
    if (a.submission.status === "graded") return "graded";
    return "submitted";
  };

  const filteredAssignments = activeTerm ? assignments.filter(a => a.term_id === activeTerm) : assignments;

  return (
    <div className="fade-up">
      <h2 style={s.pageTitle}>Assignments</h2>
      <p style={{ fontSize: 14, color: "#9ab5a0", marginBottom: 20 }}>All assignments for this course.</p>

      {terms.length > 0 && (
        <div style={s.termTabs}>
          {terms.map(term => (
            <button
              key={term.id}
              onClick={() => setActiveTerm(term.id)}
              style={{ ...s.termTab, ...(activeTerm === term.id ? { ...s.termTabActive, background: color, borderColor: color } : {}) }}
              className="term-tab"
            >
              {term.label}
            </button>
          ))}
        </div>
      )}

      {errors.assignments && <ErrorBanner message={errors.assignments} onRetry={onRetry.fetchAssignments} />}
      {loading.assignments ? <Spinner /> : filteredAssignments.length === 0 ? (
        <EmptyState icon={<FileText size={40} color="#c8ddc9" />} title="No assignments yet" subtitle="Your teacher hasn't posted any assignments for this term." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAssignments.map(a => {
            const status    = getAssignStatus(a);
            const urgent    = status === "pending" && isUrgent(a.due_date);
            const isEssay   = a.assignment_type === "essay";
            const isLink    = a.assignment_type === "link";
            const isProject = a.assignment_type === "project";
            const platform  = isLink && a.submission?.file_url ? getLinkPlatform(a.submission.file_url) : null;

            const accentColor = status === "graded" ? "#7CA982"
              : status === "submitted" ? "#e0a052"
              : urgent ? "#e05252"
              : isEssay ? "#4a7c59"
              : isLink  ? "#7c3aed"
              : isProject ? "#c0532a"
              : "#e8f3ea";

            return (
              <div key={a.id} className="assignment-card" style={{
                background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12,
                padding: "18px 20px", display: "flex", gap: 16, alignItems: "center",
                borderLeft: `4px solid ${accentColor}`,
              }}>
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: isEssay ? "#4a7c5918" : isLink ? "#7c3aed18" : isProject ? "#c0532a18" : "#F1F7ED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isEssay ? <Edit3 size={18} color="#4a7c59" /> : isLink ? <Link size={18} color="#7c3aed" /> : isProject ? <Globe size={18} color="#c0532a" /> : <FileText size={18} color="#7CA982" />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36" }}>{a.title}</p>
                    {isEssay   && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#4a7c5918", color: "#4a7c59" }}>Essay</span>}
                    {isLink    && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#7c3aed18", color: "#7c3aed" }}>Link</span>}
                    {isProject && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#c0532a18", color: "#c0532a" }}>Project</span>}
                  </div>
                  {a.description && <p style={{ fontSize: 13, color: "#5a7a6e", marginBottom: 6, lineHeight: 1.5 }}>{a.description.length > 80 ? a.description.slice(0, 80) + "…" : a.description}</p>}
                  <div className="assignment-meta" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#9ab5a0", display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} /> Due {formatDueDate(a.due_date)}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ab5a0" }}>{a.maxPoints} pts</span>
                    {status === "graded" && a.submission?.grade != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1a5c30" }}>Grade: {a.submission.grade}/{a.maxPoints}</span>
                    )}
                    {status === "graded" && a.submission?.feedback && (
                      <span style={{ fontSize: 11, color: "#7CA982" }}>"{a.submission.feedback}"</span>
                    )}
                    {isEssay && status === "submitted" && a.submission?.essay_answer && (
                      <span style={{ fontSize: 11, color: "#4a7c59", fontWeight: 600 }}>
                        ✓ Essay submitted · {a.submission.essay_answer.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    )}
                    {isLink && status !== "pending" && platform && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: platform.color }}>🔗 {platform.label} submitted</span>
                    )}
                    {isProject && status !== "pending" && a.submission?.demo_url && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#c0532a" }}>🌐 Live Demo submitted</span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="assignment-action" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 99, textTransform: "capitalize",
                    background: status === "graded" ? "#e8f3ea" : status === "submitted" ? "#fff8e1" : "#fce8e8",
                    color: status === "graded" ? "#1a5c30" : status === "submitted" ? "#7a5c00" : "#8b2020" }}>
                    {status}
                  </span>

                  {isEssay && status !== "graded" && (
                    <button onClick={() => onSubmitEssay(a)} className="action-btn"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      <Edit3 size={12} /> {status === "submitted" ? "Edit Essay" : "Write Essay"}
                    </button>
                  )}
                  {isEssay && status === "graded" && (
                    <button onClick={() => onSubmitEssay(a)} className="action-btn"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#e8f3ea", color: "#1a5c30", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      <FileText size={12} /> View & Feedback
                    </button>
                  )}

                  {isLink && status !== "graded" && (
                    <button onClick={() => onSubmitLink(a)} className="action-btn"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      <Link size={12} /> {status === "submitted" ? "Edit Link" : "Submit Link"}
                    </button>
                  )}
                  {isLink && status === "graded" && (
                    <button onClick={() => onSubmitLink(a)} className="action-btn"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#f3eefb", color: "#7c3aed", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      <ExternalLink size={12} /> View & Feedback
                    </button>
                  )}

                  {isProject && status !== "graded" && (
                    <button onClick={() => onSubmitProject(a)} className="action-btn"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#c0532a", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      <Globe size={12} /> {status === "submitted" ? "Edit Project" : "Submit Project"}
                    </button>
                  )}
                  {isProject && status === "graded" && (
                    <button onClick={() => onSubmitProject(a)} className="action-btn"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: "#fdf0ea", color: "#c0532a", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                      <ExternalLink size={12} /> View & Feedback
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssessmentsTab({ assessments, loading, errors, onRetry, onTake, color, terms = [] }) {
  const [activeTerm, setActiveTerm] = useState(null);

  useEffect(() => {
    if (terms.length > 0 && !terms.some(t => t.id === activeTerm)) {
      setActiveTerm(terms[0].id);
    }
  }, [terms]);

  const filteredAssessments = activeTerm ? assessments.filter(a => a.term_id === activeTerm) : assessments;

  return (
    <div className="fade-up">
      <h2 style={s.pageTitle}>Assessments</h2>
      <p style={{ fontSize: 14, color: "#9ab5a0", marginBottom: 20 }}>Quizzes and written assessments for this course.</p>

      {terms.length > 0 && (
        <div style={s.termTabs}>
          {terms.map(term => (
            <button
              key={term.id}
              onClick={() => setActiveTerm(term.id)}
              style={{ ...s.termTab, ...(activeTerm === term.id ? { ...s.termTabActive, background: color, borderColor: color } : {}) }}
              className="term-tab"
            >
              {term.label}
            </button>
          ))}
        </div>
      )}

      {errors.assessments && <ErrorBanner message={errors.assessments} onRetry={onRetry} />}
      {loading.assessments ? <Spinner /> : filteredAssessments.length === 0 ? (
        <EmptyState icon={<ClipboardList size={40} color="#c8ddc9" />} title="No assessments yet" subtitle="Your teacher hasn't published any assessments for this term." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAssessments.map(a => {
            const done     = !!a.submission;
            const isGraded = a.submission?.status === "graded";
            const score    = a.submission?.score;
            const maxScore = a.submission?.max_score ?? a.max_points;
            const pct      = maxScore > 0 && score != null ? Math.round((score / maxScore) * 100) : null;
            const isQuiz   = a.type === "quiz";
            return (
              <div key={a.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "18px 20px", display: "flex", gap: 16, alignItems: "center", borderLeft: `4px solid ${done ? "#7CA982" : isUrgent(a.due_date) ? "#e05252" : color}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: done ? "#e8f3ea" : isQuiz ? "#e8eef9" : "#f3eefb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done ? <CheckSquare size={18} color="#7CA982" /> : isQuiz ? <ClipboardList size={18} color="#3a6fd8" /> : <FileText size={18} color="#8b6ce0" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36" }}>{a.title}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: isQuiz ? "#e8eef9" : "#f3eefb", color: isQuiz ? "#3a6fd8" : "#8b6ce0", textTransform: "uppercase" }}>
                      {isQuiz ? "Quiz" : "Written"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#9ab5a0", display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> Due {formatDueDate(a.due_date)}</span>
                    <span style={{ fontSize: 11, color: "#9ab5a0" }}>{a.max_points} pts</span>
                    {done && isGraded && pct !== null && <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 75 ? "#1a5c30" : "#8b2020" }}>Score: {score}/{maxScore} ({pct}%)</span>}
                    {done && !isGraded && <span style={{ fontSize: 11, color: "#e0a052", fontWeight: 600 }}>Pending review</span>}
                  </div>
                </div>
                {done ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#e8f3ea", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#1a5c30", flexShrink: 0 }}>
                    <CheckCircle2 size={13} /> Done
                  </div>
                ) : (
                  <button onClick={() => onTake(a)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: color, color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }} className="take-btn">
                    <Play size={13} /> Take
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: LECTURES
// ─────────────────────────────────────────────
function LecturesTab({ lectures, loading, error, onRetry, color }) {
  return (
    <div className="fade-up">
      <h2 style={s.pageTitle}>Lectures</h2>
      <p style={{ fontSize: 14, color: "#9ab5a0", marginBottom: 20 }}>Lecture materials shared by your teacher.</p>
      {error && <ErrorBanner message={error} onRetry={onRetry} />}
      {loading ? <Spinner /> : lectures.length === 0 ? (
        <EmptyState icon={<Link size={40} color="#c8ddc9" />} title="No lectures yet" subtitle="Your teacher hasn't posted any lecture materials for this course." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {lectures.map(lec => {
            const platform = getLinkPlatform(lec.link_url);
            return (
              <div key={lec.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "18px 20px", display: "flex", gap: 16, alignItems: "center", borderLeft: `4px solid ${platform.color}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: platform.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Link size={18} color={platform.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36", marginBottom: 4 }}>{lec.title}</p>
                  {lec.description && <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.5 }}>{lec.description}</p>}
                  <span style={{ fontSize: 11, fontWeight: 600, color: platform.color, marginTop: 4, display: "inline-block" }}>{platform.label}</span>
                </div>
                <a href={lec.link_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: color, color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}
                  className="take-btn">
                  <ExternalLink size={13} /> Open
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: GRADES
// ─────────────────────────────────────────────
function GradesTab({ grades, loading, error, onRetry, avgGrade, color, terms = [] }) {
  const [activeTerm, setActiveTerm] = useState(null);

  useEffect(() => {
    if (terms.length > 0 && !terms.some(t => t.id === activeTerm)) {
      setActiveTerm(terms[0].id);
    }
  }, [terms]);

  if (loading) return <Spinner />;

  const {
    config = {},
    quizzes: allQuizzes = [], exams: allExams = [],
    assignments: allAssignmentsCat = [],
    activities: allActivities = [], projects: allProjects = [],
    recitation = null, attendance = null,
  } = grades || {};

  const quizzes     = activeTerm ? allQuizzes.filter(q => q.term_id === activeTerm)         : allQuizzes;
  const exams       = activeTerm ? allExams.filter(e => e.term_id === activeTerm)           : allExams;
  const assignmentsCat = activeTerm ? allAssignmentsCat.filter(a => a.term_id === activeTerm) : allAssignmentsCat;
  const activities  = activeTerm ? allActivities.filter(a => a.term_id === activeTerm)      : allActivities;
  const projects    = activeTerm ? allProjects.filter(p => p.term_id === activeTerm)        : allProjects;

  const catAvg = (items, scoreOf, maxOf) => {
    const graded = items.filter(it => scoreOf(it) != null);
    if (graded.length === 0) return null;
    const total = graded.reduce((sum, it) => sum + (scoreOf(it) / maxOf(it)) * 100, 0);
    return Math.round(total / graded.length);
  };

  const quizAvg       = catAvg(quizzes, q => q.sub?.score, q => q.sub?.max_score ?? q.maxPoints);
  const examAvg       = catAvg(exams, e => e.sub?.score, e => e.sub?.max_score ?? e.maxPoints);
  const assignmentAvg = catAvg(assignmentsCat, a => a.sub?.grade, a => a.maxPoints);
  const activityAvg   = catAvg(activities, a => a.sub?.grade, a => a.maxPoints);
  const projectAvg    = catAvg(projects, p => p.sub?.grade, p => p.maxPoints);

  const itemPercents = [
    ...quizzes.filter(q => q.sub?.score != null).map(q => q.sub.score / (q.sub.max_score ?? q.maxPoints) * 100),
    ...exams.filter(e => e.sub?.score != null).map(e => e.sub.score / (e.sub.max_score ?? e.maxPoints) * 100),
    ...assignmentsCat.filter(a => a.sub?.grade != null).map(a => a.sub.grade / a.maxPoints * 100),
    ...activities.filter(a => a.sub?.grade != null).map(a => a.sub.grade / a.maxPoints * 100),
    ...projects.filter(p => p.sub?.grade != null).map(p => p.sub.grade / p.maxPoints * 100),
  ];
  const computedAvg = itemPercents.length > 0 ? Math.round(itemPercents.reduce((s, v) => s + v, 0) / itemPercents.length) : null;
  const hasAnyData = quizzes.length + exams.length + assignmentsCat.length + activities.length + projects.length > 0;

  const CATS = [
    { label: "Quizzes",     icon: <ClipboardList size={18} />, color: "#3b5bdb", items: quizzes,       avg: quizAvg },
    { label: "Exams",       icon: <FileText size={18} />,      color: "#c0532a", items: exams,         avg: examAvg },
    { label: "Assignments", icon: <FileText size={18} />,      color: "#3b5bdb", items: assignmentsCat, avg: assignmentAvg },
    { label: "Activities",  icon: <Edit3 size={18} />,         color: "#4a7c59", items: activities,    avg: activityAvg },
    { label: "Projects",    icon: <Globe size={18} />,         color: "#c0532a", items: projects,      avg: projectAvg },
  ];

  const allItems = [
    ...quizzes.map(q => ({ title: q.title, cat: "Quiz", color: "#3b5bdb", icon: <ClipboardList size={16} />, score: q.sub?.score, max: q.sub?.max_score ?? q.maxPoints, date: q.sub?.submitted_at })),
    ...exams.map(e => ({ title: e.title, cat: "Exam", color: "#c0532a", icon: <FileText size={16} />, score: e.sub?.score, max: e.sub?.max_score ?? e.maxPoints, date: e.sub?.submitted_at })),
    ...assignmentsCat.map(a => ({ title: a.title, sub: a.type, cat: "Assignment", color: "#3b5bdb", icon: <FileText size={16} />, score: a.sub?.grade, max: a.maxPoints, date: a.sub?.submitted_at ?? a.date })),
    ...activities.map(a => ({ title: a.title, sub: a.type, cat: "Activity", color: "#4a7c59", icon: <Edit3 size={16} />, score: a.sub?.grade, max: a.maxPoints, date: a.sub?.submitted_at ?? a.date })),
    ...projects.map(p => ({ title: p.title, cat: "Project", color: "#c0532a", icon: <Globe size={16} />, score: p.sub?.grade, max: p.maxPoints, date: p.sub?.submitted_at ?? p.date })),
  ].sort((a, b) => {
    if (a.score != null && b.score == null) return -1;
    if (a.score == null && b.score != null) return 1;
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <div className="fade-up">
      <h2 style={s.pageTitle}>Your Grades</h2>
      <p style={{ fontSize: 14, color: "#9ab5a0", marginBottom: 20 }}>Your performance in this course.</p>

      {terms.length > 0 && (
        <div style={s.termTabs}>
          {terms.map(term => (
            <button
              key={term.id}
              onClick={() => setActiveTerm(term.id)}
              style={{ ...s.termTab, ...(activeTerm === term.id ? { ...s.termTabActive, background: color, borderColor: color } : {}) }}
              className="term-tab"
            >
              {term.label}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={onRetry} />}

      {computedAvg !== null && (
        <div style={{ ...s.avgBanner, background: color, marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Course Average</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{computedAvg}%</p>
          </div>
          <div style={{ width: 64, height: 64, background: "rgba(255,255,255,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Award size={32} color="#fff" />
          </div>
        </div>
      )}

      {!hasAnyData && recitation == null && attendance == null ? (
        <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "48px 20px", textAlign: "center" }}>
          <Star size={40} color="#c8ddc9" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#5a7a6e" }}>No grades yet</p>
          <p style={{ fontSize: 13, color: "#9ab5a0", marginTop: 4 }}>Your teacher hasn't set up the gradebook yet.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
            {CATS.map(cat => (
              <div key={cat.label} style={s.statCard}>
                <div style={{ ...s.statIcon, background: cat.color + "18", color: cat.color }}>{cat.icon}</div>
                <p style={s.statVal}>{cat.avg !== null ? `${cat.avg}%` : "—"}</p>
                <p style={s.statLabel}>{cat.label} · {cat.items.length} item{cat.items.length !== 1 ? "s" : ""}</p>
              </div>
            ))}
            {config.show_recitation && (
              <div style={s.statCard}>
                <div style={{ ...s.statIcon, background: "#7c3aed18", color: "#7c3aed" }}><MessageSquare size={18} /></div>
                <p style={s.statVal}>{recitation ?? "—"}</p>
                <p style={s.statLabel}>Recitation</p>
              </div>
            )}
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#243E36", marginBottom: 10 }}>All Graded Work</h3>
          {allItems.length === 0 ? (
            <div style={{ ...s.listCard, padding: "20px", textAlign: "center", color: "#9ab5a0", fontSize: 13 }}>Nothing assigned yet.</div>
          ) : (
            <div style={s.listCard}>
              {allItems.map((it, i) => {
                const pct = it.score != null && it.max > 0 ? Math.round((it.score / it.max) * 100) : null;
                const dateStr = it.date ? new Date(it.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : null;
                return (
                  <div key={i} style={{ ...s.listRow, borderBottom: i < allItems.length - 1 ? "1px solid #e8f3ea" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: it.color + "18", color: it.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{it.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{it.title}{it.sub && <span style={{ fontSize: 11, color: "#9ab5a0", fontWeight: 400 }}> ({it.sub})</span>}</p>
                      <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 2 }}>
                        <span style={{ color: it.color, fontWeight: 600 }}>{it.cat}</span>{dateStr ? ` · ${dateStr}` : ""}
                      </p>
                    </div>
                    {pct !== null ? (
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: pct >= 75 ? "#1a5c30" : pct >= 50 ? "#7a5c00" : "#8b2020" }}>{it.score}/{it.max}</p>
                        <p style={{ fontSize: 11, color: "#9ab5a0" }}>{pct}%</p>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, background: "#fff8e1", color: "#7a5c00", whiteSpace: "nowrap" }}>Pending</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AttendanceTab({ attendance, loading, error, onRetry, color }) {
  const [activeTerm, setActiveTerm] = useState(null);

  useEffect(() => {
    if (attendance?.terms?.length > 0 && !activeTerm) {
      setActiveTerm(attendance.terms[0].id);
    }
  }, [attendance]);

  if (loading) return <Spinner />;

  if (!attendance?.configured || attendance.terms.length === 0) {
    return (
      <div className="fade-up">
        <h2 style={s.pageTitle}>Attendance</h2>
        <p style={{ fontSize: 14, color: "#9ab5a0", marginBottom: 20 }}>
          Your attendance record per term.
        </p>
        {error && <ErrorBanner message={error} onRetry={onRetry} />}
        <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "48px 20px", textAlign: "center" }}>
          <Calendar size={40} color="#c8ddc9" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#5a7a6e" }}>
            No attendance set up yet
          </p>
          <p style={{ fontSize: 13, color: "#9ab5a0", marginTop: 4 }}>
            Your teacher hasn't configured attendance for this course yet.
          </p>
        </div>
      </div>
    );
  }

  const { terms, legend } = attendance;
  const currentTerm = terms.find(t => t.id === activeTerm) || terms[0];

  return (
    <div className="fade-up">
      <h2 style={s.pageTitle}>Attendance</h2>
      <p style={{ fontSize: 14, color: "#9ab5a0", marginBottom: 20 }}>
        Your attendance record per term.
      </p>
      {error && <ErrorBanner message={error} onRetry={onRetry} />}

      {/* ── Summary cards ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${terms.length}, 1fr)`,
        gap: 14, marginBottom: 24,
      }}>
        {terms.map(term => (
          <div
            key={term.id}
            onClick={() => setActiveTerm(term.id)}
            style={{
              background: "#fff",
              border: `1.5px solid ${activeTerm === term.id ? color : "#e8f3ea"}`,
              borderTop: `3px solid ${activeTerm === term.id ? color : "#e8f3ea"}`,
              borderRadius: 12, padding: "18px 20px",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <p style={{
              fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.07em", marginBottom: 8,
              color: activeTerm === term.id ? color : "#9ab5a0",
            }}>
              {term.label}
            </p>
            {!term.configured ? (
              <p style={{ fontSize: 13, color: "#c8ddc9" }}>Not set up</p>
            ) : term.grade === null ? (
              <p style={{ fontSize: 13, color: "#9ab5a0" }}>No records yet</p>
            ) : (
              <>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 28, fontWeight: 800, marginBottom: 4,
                  color: term.grade >= 75 ? "#1a5c30"
                       : term.grade >= 50 ? "#7a5c00"
                       : "#8b2020",
                }}>
                  {term.grade}%
                </p>
                <p style={{ fontSize: 12, color: "#9ab5a0" }}>
                  {term.marked} / {term.total} sessions
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Term tabs ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {terms.map(term => (
          <button
            key={term.id}
            onClick={() => setActiveTerm(term.id)}
            style={{
              padding: "8px 20px", borderRadius: 9, fontSize: 13,
              fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
              border: `1.5px solid ${activeTerm === term.id ? color : "#e8f3ea"}`,
              background: activeTerm === term.id ? color : "#fff",
              color: activeTerm === term.id ? "#fff" : "#5a7a6e",
            }}
          >
            {term.label}
          </button>
        ))}
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
      </div>

      {}
      {currentTerm && (
        !currentTerm.configured ? (
          <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "32px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#9ab5a0" }}>
              {currentTerm.label} hasn't been set up by your teacher yet.
            </p>
          </div>
        ) : currentTerm.sessions.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "32px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#9ab5a0" }}>
              No sessions recorded yet for {currentTerm.label}.
            </p>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#243E36", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
              {currentTerm.label} Sessions
            </h3>
            <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, overflow: "hidden" }}>
              {currentTerm.sessions.map((sess, i) => {
                const hasRecord = sess.markId !== null;
                const dateStr = sess.date
                  ? new Date(sess.date + "T00:00:00").toLocaleDateString("en-PH", {
                      weekday: "short", month: "short", day: "numeric", year: "numeric",
                    })
                  : `Session ${i + 1}`;

                return (
                  <div
                    key={sess.sessionId}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 16px",
                      borderTop: i > 0 ? "1px solid #e8f3ea" : "none",
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: hasRecord ? sess.color : "#c8ddc9",
                    }} />
                    <p style={{ flex: 1, fontSize: 13, color: "#243E36" }}>
                      {dateStr}
                    </p>
                    {hasRecord ? (
                      <>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 12px",
                          borderRadius: 99,
                          background: sess.color + "20",
                          color: sess.color,
                          border: `1px solid ${sess.color}40`,
                        }}>
                          {sess.markId} — {sess.label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sess.color, minWidth: 24, textAlign: "right" }}>
                          {sess.value}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "#c8ddc9", fontStyle: "italic" }}>
                        Not marked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
// ─────────────────────────────────────────────
// TAB: SCHEDULE
// ─────────────────────────────────────────────
function ScheduleTab({ course, assignments, assessments, loading, color }) {
  const allDeadlines = [
    ...assignments.filter(a => a.due_date && !a.submission).map(a => ({ id: `assign-${a.id}`, title: a.title, due: a.due_date, type: "assignment", points: a.maxPoints })),
    ...assessments.filter(a => a.due_date && !a.submission).map(a => ({ id: `assess-${a.id}`, title: a.title, due: a.due_date, type: "assessment", points: a.max_points })),
  ].sort((a, b) => new Date(a.due) - new Date(b.due));

  const completed = [
    ...assignments.filter(a => a.submission).map(a => ({ id: `assign-${a.id}`, title: a.title, type: "assignment" })),
    ...assessments.filter(a => a.submission).map(a => ({ id: `assess-${a.id}`, title: a.title, type: "assessment" })),
  ];

  return (
    <div className="fade-up">
      <h2 style={s.pageTitle}>Schedule & Calendar</h2>
      <p style={{ fontSize: 14, color: "#9ab5a0", marginBottom: 24 }}>Upcoming deadlines and course schedule.</p>
      <div style={{ background: color, borderRadius: 14, padding: "20px 24px", marginBottom: 24, display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ width: 48, height: 48, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Calendar size={22} color="#fff" /></div>
        <div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Regular Schedule</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{course.schedule ?? "No schedule set"}</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{course.title}</p>
        </div>
      </div>
      <div style={s.twoCol}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#243E36", marginBottom: 12 }}>
            Upcoming Deadlines {allDeadlines.length > 0 && <span style={{ marginLeft: 8, background: "#e05252", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{allDeadlines.length}</span>}
          </h3>
          {allDeadlines.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "32px 20px", textAlign: "center", color: "#9ab5a0", fontSize: 13 }}>No upcoming deadlines 🎉</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {allDeadlines.map(d => (
                <div key={d.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", borderLeft: `3px solid ${isUrgent(d.due) ? "#e05252" : color}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: d.type === "assessment" ? "#e8eef9" : "#F1F7ED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {d.type === "assessment" ? <ClipboardList size={15} color="#3a6fd8" /> : <FileText size={15} color="#7CA982" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#243E36", marginBottom: 2 }}>{d.title}</p>
                    <p style={{ fontSize: 11, color: "#9ab5a0" }}>{d.type === "assessment" ? "Assessment" : "Assignment"} · {d.points} pts</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: isUrgent(d.due) ? "#fce8e8" : "#e8f3ea", color: isUrgent(d.due) ? "#8b2020" : "#1a5c30", whiteSpace: "nowrap" }}>
                    {formatDueDate(d.due)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#243E36", marginBottom: 12 }}>
            Completed <span style={{ marginLeft: 8, background: "#e8f3ea", color: "#1a5c30", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{completed.length}</span>
          </h3>
          {completed.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "32px 20px", textAlign: "center", color: "#9ab5a0", fontSize: 13 }}>Nothing completed yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {completed.slice(0, 6).map(d => (
                <div key={d.id} style={{ background: "#fff", border: "1px solid #e8f3ea", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", opacity: 0.75 }}>
                  <CheckCircle2 size={18} color="#7CA982" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{d.title}</p>
                    <p style={{ fontSize: 11, color: "#9ab5a0" }}>{d.type === "assessment" ? "Assessment" : "Assignment"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LINK SUBMIT MODAL
// ─────────────────────────────────────────────
function LinkSubmitModal({ assignment, studentId, onClose, onSubmitted }) {
  const [url,      setUrl]      = useState("");
  const [notes,    setNotes]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error,    setError]    = useState("");
  const [existing, setExisting] = useState(null);

  const platform = url ? getLinkPlatform(url) : null;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (!studentId || !assignment?.id) return;
    setFetching(true);
    supabase
      .from("submissions")
      .select("id, file_url, notes, status, grade, feedback")
      .eq("assignment_id", assignment.id)
      .eq("student_id", studentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExisting(data);
          setUrl(data.file_url ?? "");
          setNotes(data.notes ?? "");
        }
      })
      .finally(() => setFetching(false));
  }, [assignment?.id, studentId]);

  const isValidUrl = (val) => {
    try { new URL(val); return true; } catch { return false; }
  };

  const handleSubmit = async () => {
    if (!url.trim())         { setError("Please paste a URL before submitting."); return; }
    if (!isValidUrl(url.trim())) { setError("Please enter a valid URL (include https://)."); return; }
    setLoading(true); setError("");
    try {
      if (existing) {
        const { error: err } = await supabase
          .from("submissions")
          .update({ file_url: url.trim(), notes: notes.trim(), status: "submitted" })
          .eq("id", existing.id);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase
          .from("submissions")
          .insert({ assignment_id: assignment.id, student_id: studentId, file_url: url.trim(), notes: notes.trim(), status: "submitted" });
        if (err) throw new Error(err.message);
        await notifyTeacherOnSubmission({ assignmentId: assignment.id, studentId, assignmentType: "link" });
      }
      onSubmitted();
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const isGraded = existing?.status === "graded";

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .link-input:focus{border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,0.15)!important}
        .submit-link-btn:hover:not(:disabled){background:#6d28d9!important}
        .cancel-link-btn:hover{background:#e8f3ea!important}
      `}</style>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e8f3ea", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#7c3aed18", color: "#7c3aed" }}>🔗 Link Submission</span>
              {isGraded && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f3ea", color: "#1a5c30" }}>Graded: {existing.grade}/{assignment.max_points}</span>}
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" }}>{assignment.title}</h2>
            {assignment.due_date && <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 3 }}>Due {new Date(assignment.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", padding: 4, fontSize: 18 }}>✕</button>
        </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {fetching ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "48px 0" }}>
              <Loader2 size={24} color="#7c3aed" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (<>
          {/* Instructions */}
          {assignment.description && (
            <div style={{ background: "#F1F7ED", borderRadius: 10, padding: "14px 16px", borderLeft: "3px solid #7c3aed" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Instructions</p>
              <p style={{ fontSize: 14, color: "#243E36", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{assignment.description}</p>
            </div>
          )}

          {/* Teacher feedback if graded */}
          {isGraded && existing.feedback && (
            <div style={{ background: "#e8f3ea", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1a5c30", marginBottom: 6 }}>Teacher's Feedback</p>
              <p style={{ fontSize: 13, color: "#243E36", lineHeight: 1.6 }}>{existing.feedback}</p>
            </div>
          )}

          {/* URL input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>
              Submission URL {!isGraded && <span style={{ color: "#e05252" }}>*</span>}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="url"
                placeholder="https://github.com/username/repo"
                value={url}
                onChange={e => { setUrl(e.target.value); setError(""); }}
                disabled={isGraded}
                style={{
                  width: "100%", padding: "11px 14px 11px 42px",
                  borderRadius: 10, border: `1.5px solid ${error ? "#e05252" : "#c8ddc9"}`,
                  background: isGraded ? "#fafcfa" : "#fff",
                  fontSize: 14, color: "#243E36", outline: "none",
                  fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                className="link-input"
              />
              <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: platform ? platform.color : "#9ab5a0" }}>
                <Link size={16} />
              </div>
            </div>

            {/* Platform detector */}
            {url && isValidUrl(url) && platform && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: platform.color + "10", borderRadius: 8, border: `1px solid ${platform.color}20` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: platform.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: platform.color }}>{platform.label} detected</span>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: platform.color, textDecoration: "none", fontWeight: 600 }}>
                  Preview <ExternalLink size={11} />
                </a>
              </div>
            )}
            {error && <p style={{ fontSize: 12, color: "#e05252" }}>⚠ {error}</p>}
          </div>

          {/* Notes (optional) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>
              Notes <span style={{ fontWeight: 400, color: "#9ab5a0" }}>(optional)</span>
            </label>
            <textarea
              placeholder="Add any notes for your teacher, e.g. 'The main feature is on the dev branch'…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={isGraded}
              rows={3}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10,
                border: "1.5px solid #c8ddc9", background: isGraded ? "#fafcfa" : "#fff",
                fontSize: 14, color: "#243E36", outline: "none",
                fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
                resize: "vertical", boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              className="link-input"
            />
            {!isGraded && <p style={{ fontSize: 11, color: "#9ab5a0" }}>{existing ? "You can update your link until the teacher grades it." : "Make sure your link is accessible (public repo, shared drive, etc.)."}</p>}
          </div>
          </>)}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e8f3ea", display: "flex", gap: 10 }}>
          {!fetching && (
          <button onClick={onClose}
            style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            className="cancel-link-btn">
            {isGraded ? "Close" : "Cancel"}
          </button>
          )}
          {!fetching && !isGraded && (
            <button onClick={handleSubmit} disabled={loading || !url.trim()}
              style={{ flex: 2, padding: "11px 0", border: "none", borderRadius: 9, background: "#7c3aed", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading || !url.trim() ? 0.6 : 1, transition: "background 0.2s" }}
              className="submit-link-btn">
              {loading
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
                : existing ? <><Link size={15} /> Update Submission</> : <><Link size={15} /> Submit Link</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROJECT SUBMIT MODAL 
// ─────────────────────────────────────────────
function ProjectSubmitModal({ assignment, studentId, onClose, onSubmitted }) {
  const [demoUrl,  setDemoUrl]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [fetching,  setFetching]  = useState(true);
  const [error,    setError]    = useState("");
  const [existing, setExisting] = useState(null);

  const rubricCriteria = (() => {
    try { return Array.isArray(assignment?.rubric_criteria) ? assignment.rubric_criteria : JSON.parse(assignment?.rubric_criteria || "[]"); }
    catch { return []; }
  })();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (!studentId || !assignment?.id) return;
    setFetching(true);
    supabase
      .from("submissions")
      .select("id, demo_url, status, grade, feedback")
      .eq("assignment_id", assignment.id)
      .eq("student_id", studentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setExisting(data); setDemoUrl(data.demo_url ?? ""); }
      })
      .finally(() => setFetching(false)); 
  }, [assignment?.id, studentId]);

  const isValidUrl = (val) => { try { new URL(val); return true; } catch { return false; } };

  const handleSubmit = async () => {
    if (!demoUrl.trim()) { setError("Please paste your Live Demo URL before submitting."); return; }
    if (!isValidUrl(demoUrl.trim())) { setError("Please enter a valid URL (include https://)."); return; }
    setLoading(true); setError("");
    try {
      if (existing) {
        const { error: err } = await supabase
          .from("submissions")
          .update({ demo_url: demoUrl.trim(), status: "submitted" })
          .eq("id", existing.id);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase
          .from("submissions")
          .insert({ assignment_id: assignment.id, student_id: studentId, demo_url: demoUrl.trim(), status: "submitted" });
        if (err) throw new Error(err.message);
        await notifyTeacherOnSubmission({ assignmentId: assignment.id, studentId, assignmentType: "project" });
      }
      onSubmitted();
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const isGraded = existing?.status === "graded";

  let rubricBreakdown = [];
  let extraFeedback = existing?.feedback ?? "";
  if (isGraded && existing?.feedback && rubricCriteria.length > 0) {
    const lines = existing.feedback.split("\n");
    if (lines[0].includes("/") && lines[0].includes(":")) {
      rubricBreakdown = lines[0].split(" | ");
      extraFeedback = lines.slice(1).join("\n").trim();
    }
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .demo-input:focus{border-color:#c0532a!important;box-shadow:0 0 0 3px rgba(192,83,42,0.15)!important}
        .submit-project-btn:hover:not(:disabled){background:#a3461f!important}
        .cancel-project-btn:hover{background:#e8f3ea!important}
      `}</style>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e8f3ea", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#c0532a18", color: "#c0532a" }}>🌐 Project</span>
              {isGraded && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f3ea", color: "#1a5c30" }}>Graded: {existing.grade}/{assignment.max_points}</span>}
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" }}>{assignment.title}</h2>
            {assignment.due_date && <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 3 }}>Due {new Date(assignment.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", padding: 4, fontSize: 18 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* ── Loading state ── */}
          {fetching ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "48px 0" }}>
              <Loader2 size={24} color="#c0532a" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (<>

          {/* Instructions */}
          {assignment.description && (
            <div style={{ background: "#F1F7ED", borderRadius: 10, padding: "14px 16px", borderLeft: "3px solid #c0532a" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#c0532a", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Project Instructions</p>
              <p style={{ fontSize: 14, color: "#243E36", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{assignment.description}</p>
            </div>
          )}

          {/* Rubric preview */}
          {rubricCriteria.length > 0 && (
            <div style={{ background: "#fdf0ea", border: "1px solid #f5d4bf", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#c0532a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Grading Rubric · {assignment.max_points} pts total
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rubricCriteria.map(c => {
                  const breakdownLine = rubricBreakdown.find(line => line.startsWith(c.label + ":"));
                  return (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span style={{ color: "#243E36" }}>{c.label}</span>
                      <span style={{ fontWeight: 700, color: breakdownLine ? "#1a5c30" : "#9ab5a0" }}>
                        {breakdownLine ? breakdownLine.split(":")[1].trim() : `— / ${c.max_score}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Teacher feedback if graded */}
          {isGraded && extraFeedback && (
            <div style={{ background: "#e8f3ea", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1a5c30", marginBottom: 6 }}>Teacher's Feedback</p>
              <p style={{ fontSize: 13, color: "#243E36", lineHeight: 1.6 }}>{extraFeedback}</p>
            </div>
          )}

          {/* Live Demo URL input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>
              Live Demo URL {!isGraded && <span style={{ color: "#e05252" }}>*</span>}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="url"
                placeholder="https://your-project.vercel.app"
                value={demoUrl}
                onChange={e => { setDemoUrl(e.target.value); setError(""); }}
                disabled={isGraded}
                style={{
                  width: "100%", padding: "11px 14px 11px 42px",
                  borderRadius: 10, border: `1.5px solid ${error ? "#e05252" : "#c8ddc9"}`,
                  background: isGraded ? "#fafcfa" : "#fff",
                  fontSize: 14, color: "#243E36", outline: "none",
                  fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                className="demo-input"
              />
              <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#c0532a" }}>
                <Globe size={16} />
              </div>
            </div>
            {demoUrl && isValidUrl(demoUrl) && !isGraded && (
              <a href={demoUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#c0532a", textDecoration: "none", fontWeight: 600, marginTop: 2 }}>
                Preview <ExternalLink size={11} />
              </a>
            )}
            {isGraded && demoUrl && (
              <a href={demoUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#c0532a", textDecoration: "none", fontWeight: 600, marginTop: 2 }}>
                Open Live Demo <ExternalLink size={12} />
              </a>
            )}
            {error && <p style={{ fontSize: 12, color: "#e05252" }}>⚠ {error}</p>}
            {!isGraded && <p style={{ fontSize: 11, color: "#9ab5a0" }}>{existing ? "You can update your link until the teacher grades it." : "Make sure your demo is deployed and accessible."}</p>}
          </div>
          </>)}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e8f3ea", display: "flex", gap: 10 }}>
          {!fetching && (
          <button onClick={onClose}
            style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            className="cancel-project-btn">
            {isGraded ? "Close" : "Cancel"}
          </button>
          )}
           {!fetching && !isGraded && (
            <button onClick={handleSubmit} disabled={loading || !demoUrl.trim()}
              style={{ flex: 2, padding: "11px 0", border: "none", borderRadius: 9, background: "#c0532a", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading || !demoUrl.trim() ? 0.6 : 1, transition: "background 0.2s" }}
              className="submit-project-btn">
              {loading
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
                : existing ? <><Globe size={15} /> Update Submission</> : <><Globe size={15} /> Submit Project</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ESSAY SUBMIT MODAL
// ─────────────────────────────────────────────
function EssaySubmitModal({ assignment, studentId, onClose, onSubmitted }) {
  const [answer,   setAnswer]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error,    setError]    = useState("");
  const [existing, setExisting] = useState(null);

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    if (!studentId || !assignment?.id) return;
    setFetching(true);
    supabase
      .from("submissions")
      .select("id, essay_answer, status, grade, feedback")
      .eq("assignment_id", assignment.id)
      .eq("student_id", studentId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setExisting(data); setAnswer(data.essay_answer ?? ""); }
      })
      .finally(() => setFetching(false));
  }, [assignment?.id, studentId]);

  const handleSubmit = async () => {
    if (!answer.trim()) { setError("Please write your essay before submitting."); return; }
    if (wordCount < 5)  { setError("Your essay is too short. Please write more."); return; }
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
    .insert({ assignment_id: assignment.id, student_id: studentId, essay_answer: answer.trim(), status: "submitted" });
  if (err) throw new Error(err.message);
  
  await notifyTeacherOnSubmission({ assignmentId: assignment.id, studentId, assignmentType: "essay" });
}
onSubmitted();
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const isGraded = existing?.status === "graded";

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .essay-input:focus{border-color:#7CA982!important;box-shadow:0 0 0 3px rgba(124,169,130,0.15)} .submit-essay-btn:hover:not(:disabled){background:#3a6448!important} .cancel-essay-btn:hover{background:#e8f3ea!important}`}</style>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 680, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e8f3ea", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#4a7c5918", color: "#4a7c59" }}>✏ Essay Assignment</span>
              {isGraded && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f3ea", color: "#1a5c30" }}>Graded: {existing.grade}/{assignment.max_points}</span>}
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" }}>{assignment.title}</h2>
            {assignment.due_date && <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 3 }}>Due {new Date(assignment.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", padding: 4 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {fetching ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "48px 0" }}>
              <Loader2 size={24} color="#4a7c59" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (<>
          {assignment.description && (
            <div style={{ background: "#F1F7ED", borderRadius: 10, padding: "14px 16px", borderLeft: "3px solid #7CA982" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#7CA982", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Prompt / Instructions</p>
              <p style={{ fontSize: 14, color: "#243E36", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{assignment.description}</p>
            </div>
          )}
          {isGraded && existing.feedback && (
            <div style={{ background: "#e8f3ea", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1a5c30", marginBottom: 6 }}>Teacher's Feedback</p>
              <p style={{ fontSize: 13, color: "#243E36", lineHeight: 1.6 }}>{existing.feedback}</p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>Your Essay {!isGraded && <span style={{ color: "#e05252" }}>*</span>}</label>
              <span style={{ fontSize: 11, color: wordCount >= 10 ? "#7CA982" : "#9ab5a0", fontWeight: 600 }}>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
            </div>
            <textarea placeholder="Write your essay here…" value={answer} onChange={e => { setAnswer(e.target.value); setError(""); }} disabled={isGraded} rows={12}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${error ? "#e05252" : "#c8ddc9"}`, background: isGraded ? "#fafcfa" : "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8, resize: "vertical", boxSizing: "border-box", transition: "border-color 0.2s" }}
              className="essay-input" />
            {error && <p style={{ fontSize: 12, color: "#e05252" }}>⚠ {error}</p>}
            {!isGraded && <p style={{ fontSize: 11, color: "#9ab5a0" }}>{existing ? "You can edit and resubmit until the teacher grades it." : "Review your answer before submitting."}</p>}
            </div>
          </>)}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e8f3ea", display: "flex", gap: 10 }}>
          {!fetching && (
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }} className="cancel-essay-btn">
            {isGraded ? "Close" : "Cancel"}
          </button>
          )}
          {!fetching && !isGraded && (
            <button onClick={handleSubmit} disabled={loading || !answer.trim()}
              style={{ flex: 2, padding: "11px 0", border: "none", borderRadius: 9, background: "#4a7c59", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1 }}
              className="submit-essay-btn">
              {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</> : existing ? "✓ Update Submission" : "✓ Submit Essay"}
            </button>
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
  root:       { minHeight: "100vh", background: "#F1F7ED", fontFamily: "'DM Sans', sans-serif" },
  hero:       { padding: "28px 32px 24px", position: "relative" },
  backBtn:    { display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 20, transition: "background 0.15s" },
  heroContent:{ marginBottom: 20 },
  subjectBadge: { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(255,255,255,0.15)", padding: "3px 10px", borderRadius: 99, display: "inline-block", marginBottom: 10 },
  heroTitle:  { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 8, lineHeight: 1.2 },
  heroTeacher:{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginBottom: 4 },
  heroSchedule:{ fontSize: 13, color: "rgba(255,255,255,0.6)" },
  heroStats:  { display: "flex", gap: 0, background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "14px 0", maxWidth: 400 },
  heroStat:   { flex: 1, textAlign: "center" },
  heroStatNum:{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#fff" },
  heroStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  heroStatDivider: { width: 1, background: "rgba(255,255,255,0.2)" },
  tabBar:     { background: "#fff", borderBottom: "1px solid #e8f3ea", padding: "0 32px", display: "flex", gap: 0, position: "sticky", top: 0, zIndex: 20 },
  tab: { display: "flex", alignItems: "center", padding: "14px 18px", background: "none", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: "transparent", color: "#9ab5a0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" },
  tabActive:  { color: "#243E36", fontWeight: 700, borderBottomWidth: 2, borderBottomStyle: "solid" },
  tabBadge:   { background: "#e05252", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 },
  content:    { padding: "28px 32px", maxWidth: 1100, margin: "0 auto" },
  statsRow:   { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 },
  statCard:   { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "16px 18px", transition: "transform 0.2s, box-shadow 0.2s" },
  statIcon:   { width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statVal:    { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: "#243E36", marginBottom: 2 },
  statLabel:  { fontSize: 11, color: "#9ab5a0", fontWeight: 500 },
  twoCol:     { display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#243E36", marginBottom: 10 },
  pageTitle:  { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#243E36", marginBottom: 4 },
  seeAll:     { background: "none", border: "none", color: "#7CA982", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontFamily: "'DM Sans', sans-serif" },
  infoCard:   { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "18px 20px" },
  infoRow:    { display: "flex", alignItems: "center", gap: 10 },
  infoLabel:  { fontSize: 12, color: "#9ab5a0", minWidth: 70 },
  infoValue:  { fontSize: 13, fontWeight: 600, color: "#243E36" },
  listCard:   { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, overflow: "hidden" },
  listRow:    { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" },
  urgentBadge:    { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "#e8f3ea", color: "#1a5c30", whiteSpace: "nowrap", flexShrink: 0 },
  urgentBadgeRed: { background: "#fce8e8", color: "#8b2020" },
  avgBanner:  { borderRadius: 14, padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  termTabs:      { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  termTab:       { padding: "8px 20px", borderRadius: 9, border: "1.5px solid #e8f3ea", background: "#fff", color: "#5a7a6e", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  termTabActive: { color: "#fff" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .fade-up    { animation: fadeUp 0.4s ease both; }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(36,62,54,0.07); }
  .back-btn:hover  { background: rgba(255,255,255,0.25) !important; }
  .tab-btn:hover   { color: #243E36 !important; background: #f8fbf8; }
  .take-btn:hover  { opacity: 0.85 !important; }
  .term-tab:hover  { background: #e8f3ea !important; }
  .action-btn:hover { opacity: 0.85 !important; }
  @media (max-width: 900px) {
    div[style*="grid-template-columns: 1.1fr"] { grid-template-columns: 1fr !important; }
    div[style*="repeat(4, 1fr)"]               { grid-template-columns: repeat(2, 1fr) !important; }
    div[style*="padding: 28px 32px"]           { padding: 16px !important; }
    div[style*="padding: 0 32px"]              { padding: 0 8px !important; }
    div[style*="padding: 28px 32px 24px"]      { padding: 20px 16px !important; }

    /* lock the whole page from swiping sideways */
    .course-root {
      overflow-x: hidden;
    }

    /* only the tab row itself scrolls horizontally */
    .tab-bar {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .tab-bar::-webkit-scrollbar {
      display: none;
    }

    /* assignment cards: let content wrap, push the action row below */
    .assignment-card {
      flex-wrap: wrap;
      align-items: flex-start !important;
    }
    .assignment-action {
      flex-basis: 100% !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e8f3ea;
    }
    .assignment-meta {
      gap: 10px !important;
      row-gap: 6px !important;
    }
  }
`;
