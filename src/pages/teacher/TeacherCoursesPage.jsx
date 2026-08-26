// src/pages/teacher/TeacherCoursesPage.jsx

import { useState, useEffect, useCallback } from "react";
import {
  Plus, LayoutGrid, List, Copy, Check, X, ChevronLeft,
  Users, BookOpen, Calendar, Hash, Edit2, Trash2,
  Archive, Search, UserPlus, AlertCircle, Loader2,
  RefreshCw, Share2, GraduationCap, ClipboardList,
  TrendingUp, MoreVertical, Eye, EyeOff, FileText,
  Link, CheckCircle2,
  Calculator, FlaskConical, Languages, Landmark,
  Dumbbell, Palette, Music2, Cpu, HeartHandshake,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getTeacherCourses, createCourse, updateCourse, deleteCourse, archiveCourse, getArchivedCourses, unarchiveCourse, getCourseStudents, getAllStudents, enrollStudent, unenrollStudent, createStudentAccount, } from "../../services/courseService";
import CourseAssessmentsTab from "./CourseAssessmentsTab";
import CourseAssignmentsTab from "./CourseAssignmentsTab";
import { supabase } from "../../services/supabase";
import CourseAttendanceTab from "./CourseAttendanceTab";
import { createPortal } from "react-dom";
import CourseLecturesTab from "./CourseLecturesTab";
import { getStudentAttendance, getCourseTerms } from "../../services/courseService";
import { getLectures } from "../../services/lectureService";


// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const COVER_COLORS = [
  "#FF80C7", "#EC6530", "#9FA1FF", "#24B1B1",
  "#F4AE52", "#306D29", "#744577", "#67C090",
  "#D8D365", "#454040", "#FFC81E", "#FFDBFD",
];

const SUBJECTS = [
  "Math", "Science", "English", "Filipino",
  "History", "PE", "Arts", "Music",
  "Technology", "Values Education", "Other",
];

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

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  return `${weeks}w ago`;
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

function CopyButton({ text, style = {} }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: copied ? "#7CA982" : "#9ab5a0", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", padding: "4px 8px", borderRadius: 6, transition: "all 0.2s", ...style }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────
export default function TeacherCoursesPage({ onAssessmentChanged }) {
  const { user } = useAuthStore();
  const [view, setView]               = useState("grid");
  const [courses, setCourses]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState("");
  const [showCreate, setShowCreate]   = useState(false);
  const [activeCourse, setActiveCourse] = useState(null);
  const [openMenuId, setOpenMenuId]     = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedCourses, setArchivedCourses] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const fetchCourses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError(null);
    try {
      const data = await getTeacherCourses(user.id);
      setCourses(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const fetchArchivedCourses = useCallback(async () => {
    if (!user?.id) return;
    setArchivedLoading(true);
    try {
      const data = await getArchivedCourses(user.id);
      setArchivedCourses(data);
    } catch (e) { alert(e.message); }
    finally { setArchivedLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    if (showArchived) fetchArchivedCourses();
  }, [showArchived, fetchArchivedCourses]);

  const handleCourseCreated = (newCourse) => {
  setCourses(prev => [{ ...newCourse, students: 0, pendingSubmissions: 0 }, ...prev]);
  setShowCreate(false);
  };

  const handleArchive = async (courseId) => {
    try {
      await archiveCourse(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (e) { alert(e.message); }
  };

  const handleUnarchive = async (courseId) => {
    try {
      await unarchiveCourse(courseId);
      setArchivedCourses(prev => prev.filter(c => c.id !== courseId));
      fetchCourses();
    } catch (e) { alert(e.message); }
  };

  const [confirmModal, setConfirmModal] = useState(null);

  const [deleteCourseTarget, setDeleteCourseTarget] = useState(null);

  const handleDelete = (courseId) => {
    setDeleteCourseTarget(courseId);
  };

  const confirmDeleteCourse = async () => {
    try {
      await deleteCourse(deleteCourseTarget);
      setCourses(prev => prev.filter(c => c.id !== deleteCourseTarget));
      setDeleteCourseTarget(null);
    } catch (e) { alert(e.message); }
  };

if (activeCourse) {
  return (
    <CourseDetailPage
  course={activeCourse}
  onBack={() => {
    setActiveCourse(null);
    fetchCourses();
  }}
  onCourseUpdated={(updated) => {
    setCourses(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    setActiveCourse(prev => ({ ...prev, ...updated }));
  }}
  teacherId={user?.id}
  onAssessmentChanged={onAssessmentChanged}
/>
  );
}

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.subject?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-up">
      <style>{pageCss}</style>

      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>My Courses</h1>
          <p style={s.pageSub}>
            {loading ? "Loading…" : `${courses.filter(c => c.status === "active").length} active course${courses.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={s.viewToggle}>
            <button onClick={() => setView("grid")} style={{ ...s.viewBtn, ...(view === "grid" ? s.viewBtnActive : {}) }} title="Card view">
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView("list")} style={{ ...s.viewBtn, ...(view === "list" ? s.viewBtnActive : {}) }} title="List view">
              <List size={16} />
            </button>
          </div>
          <button style={s.secondaryBtn} onClick={() => setShowArchived(true)} className="secondary-btn">
            <Archive size={15} /> Archived
          </button>
          <button style={s.primaryBtn} onClick={() => setShowCreate(true)} className="primary-btn">
            <Plus size={15} /> New Course
          </button>
        </div>
      </div>

      <div style={s.searchWrap}>
        <Search size={15} color="#9ab5a0" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
        <input
          placeholder="Search courses or subjects…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={s.searchInput}
          className="lms-input"
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchCourses} />}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><BookOpen size={32} color="#c8ddc9" /></div>
          <p style={s.emptyTitle}>{search ? "No courses match your search" : "No courses yet"}</p>
          <p style={s.emptySub}>{search ? "Try a different keyword" : "Create your first course to get started"}</p>
          {!search && (
            <button style={s.primaryBtn} onClick={() => setShowCreate(true)} className="primary-btn">
              <Plus size={15} /> Create Course
            </button>
          )}
        </div>
      ) : view === "grid" ? (
        <div style={s.cardGrid}>
          {filtered.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => setActiveCourse(course)}
              onArchive={() => handleArchive(course.id)}
              onDelete={() => handleDelete(course.id)}
              menuOpen={openMenuId === course.id}
              onToggleMenu={() => setOpenMenuId(prev => prev === course.id ? null : course.id)}
            />
          ))}
        </div>
      ) : (
        <CourseListView
          courses={filtered}
          onSelect={setActiveCourse}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}

      {showCreate && (
        <CreateCourseModal
          teacherId={user?.id}
          onClose={() => setShowCreate(false)}
          onCreated={handleCourseCreated}
        />
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

      {deleteCourseTarget && (
        <DeleteCourseModal
          onConfirm={confirmDeleteCourse}
          onClose={() => setDeleteCourseTarget(null)}
        />
      )}

      {showArchived && (
        <ArchivedCoursesModal
          courses={archivedCourses}
          loading={archivedLoading}
          onClose={() => setShowArchived(false)}
          onUnarchive={handleUnarchive}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// COURSE CARD
// ─────────────────────────────────────────────
function CourseCard({ course, onClick, onArchive, onDelete, menuOpen, onToggleMenu }) {
  const color = course.cover_color || "#243E36";
  const SubjectIcon = getSubjectIcon(course.subject);

  return (
    <div style={s.card} className="course-card">
      <div style={{ ...s.cardHeader, background: color }} onClick={onClick}>
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
        <div style={s.cardSubject}>{course.subject || "Course"}</div>
        <h3 style={s.cardTitle}>{course.title}</h3>
        {course.schedule && (
          <div style={s.cardSchedule}>
            <Calendar size={11} style={{ opacity: 0.7 }} />
            <span>{course.schedule}</span>
          </div>
        )}
        {course.join_code && (
          <div style={s.joinCodeBadge}>
            <Hash size={10} />
            <span>{course.join_code}</span>
          </div>
        )}
      </div>

      <div style={s.cardBody}>
        <div style={s.cardStats}>
          <div style={s.cardStat}>
            <Users size={13} color="#9ab5a0" />
            <span>{course.students} students</span>
          </div>
          {course.pendingSubmissions > 0 && (
            <div style={{ ...s.cardStat, color: "#e0a052" }}>
              <ClipboardList size={13} color="#e0a052" />
              <span>{course.pendingSubmissions} pending</span>
            </div>
          )}
        </div>

        <div style={s.cardFooter}>
          <button style={s.viewBtn2} onClick={onClick} className="view-course-btn">
            View Course
          </button>
          <div style={{ position: "relative" }}>
            <button
              style={s.menuBtn}
              onClick={e => { e.stopPropagation(); onToggleMenu(); }}
              className="icon-action-btn"
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div style={s.menuDropdown} className="menu-dropdown">
                <button style={s.menuItem} onClick={() => { onArchive(); onToggleMenu(); }} className="menu-item">
                  <Archive size={13} /> Archive
                </button>
                <button style={{ ...s.menuItem, color: "#e05252" }} onClick={() => { onDelete(); onToggleMenu(); }} className="menu-item-danger">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COURSE LIST VIEW
// ─────────────────────────────────────────────
function CourseListView({ courses, onSelect, onArchive, onDelete }) {
  return (
    <div style={s.listCard}>
      <table style={s.table}>
        <thead>
          <tr>
            {["Course", "Subject", "Students", "Pending", "Schedule", "Join Code", ""].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courses.map((c, i) => (
            <tr
              key={c.id}
              style={{ borderTop: i > 0 ? "1px solid #e8f3ea" : "none", cursor: "pointer" }}
              className="table-row"
              onClick={() => onSelect(c)}
            >
              <td style={s.td}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.cover_color || "#243E36", flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: "#243E36", fontSize: 13 }}>{c.title}</span>
                </div>
              </td>
              <td style={s.td}><span style={s.subjectPill}>{c.subject || "—"}</span></td>
              <td style={{ ...s.td, color: "#5a7a6e" }}>{c.students}</td>
              <td style={s.td}>
                {c.pendingSubmissions > 0
                  ? <span style={{ ...s.gradePill, background: "#fff8e1", color: "#7a5c00" }}>{c.pendingSubmissions}</span>
                  : <span style={{ color: "#c8ddc9", fontSize: 12 }}>0</span>
                }
              </td>
              <td style={{ ...s.td, color: "#9ab5a0", fontSize: 12 }}>{c.schedule || "—"}</td>
              <td style={s.td}>
                {c.join_code && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={s.joinCodeInline}>{c.join_code}</span>
                    <CopyButton text={c.join_code} />
                  </div>
                )}
              </td>
              <td style={s.td} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={s.iconActionBtn} className="icon-action-btn" title="Archive" onClick={() => onArchive(c.id)}><Archive size={13} /></button>
                  <button style={{ ...s.iconActionBtn, color: "#e05252" }} className="icon-action-btn" title="Delete" onClick={() => onDelete(c.id)}><Trash2 size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// COURSE DETAIL PAGE 
// ─────────────────────────────────────────────
function CourseDetailPage({ course, onBack, onCourseUpdated, teacherId, onAssessmentChanged }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [liveStats, setLiveStats] = useState({
  pendingAssignments: 0,
  pendingAssessments: 0,
  students: course.students,
  });
  const color = course.cover_color || "#243E36";

  const refreshStats = useCallback(async () => {
    try {
      const activeStudents = await getCourseStudents(course.id);
      const activeIds = new Set(activeStudents.map(s => s.id));
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("course_id", course.id)
        .eq("status", "active");

      const assignIds = (assignments || []).map(a => a.id);
      let pendingAssignments = 0;
      if (assignIds.length > 0) {
        const { data: subs } = await supabase
          .from("submissions")
          .select("status, student_id")
          .in("assignment_id", assignIds)
          .eq("status", "submitted");
        pendingAssignments = (subs || []).filter(s => activeIds.has(s.student_id)).length;
      }

      const { data: assessments } = await supabase
        .from("assessments")
        .select("id")
        .eq("course_id", course.id);

      const assessIds = (assessments || []).map(a => a.id);
      let pendingAssessments = 0;
      if (assessIds.length > 0) {
        const { data: aSubs } = await supabase
          .from("assessment_submissions")
          .select("status, student_id")
          .in("assessment_id", assessIds)
          .neq("status", "graded");
        pendingAssessments = (aSubs || []).filter(s => activeIds.has(s.student_id)).length;
      }

      setLiveStats(prev => ({ ...prev, pendingAssignments, pendingAssessments }));
    } catch (_) {}
  }, [course.id]);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  const TABS = [
    { id: "overview",     label: "Overview",    icon: <LayoutGrid size={14} /> },
    { id: "students",     label: "Students",    icon: <Users size={14} /> },
    { id: "assignments",  label: "Assignments", icon: <FileText size={14} />,       badgeCount: liveStats.pendingAssignments },
    { id: "assessments",  label: "Assessments", icon: <ClipboardList size={14} />,  badgeCount: liveStats.pendingAssessments },
    { id: "lectures",     label: "Lectures",    icon: <Link size={14} /> },
    { id: "attendance",   label: "Attendance",  icon: <Calendar size={14} /> },
  ];

  return (
    <div className="fade-up course-detail-root">
      <style>{pageCss}</style>
      <button style={s.backBtn} onClick={onBack} className="back-btn">
        <ChevronLeft size={16} /> Back to Courses
      </button>

      <div style={{ ...s.courseHero, background: color, position: "relative", overflow: "hidden" }}>
        <SubjectIllustration subject={course.subject} />
        <div style={s.heroContent}>
          <div style={s.heroSubject}>{course.subject || "Course"}</div>
          <h1 style={s.heroTitle}>{course.title}</h1>
          {course.description && <p style={s.heroDesc}>{course.description}</p>}
          <div style={s.heroMeta}>
            {course.schedule && (
              <div style={s.heroMetaItem}><Calendar size={13} />{course.schedule}</div>
            )}
             <div style={s.heroMetaItem}><Users size={13} />{liveStats.students} students</div>
          </div>
        </div>

        {course.join_code && (
          <div style={s.joinCodeCard}>
            <p style={s.joinCodeLabel}>Class Join Code</p>
            <p style={s.joinCodeValue}>{course.join_code}</p>
            <CopyButton text={course.join_code} style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }} />
          </div>
        )}
      </div>

      {/* 4-tab bar */}
      <div style={s.tabBar} className="tab-bar-scroll">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ ...s.tabBtn, ...(activeTab === tab.id ? s.tabBtnActive : {}) }}
            className="tab-btn"
          >
            {tab.icon} {tab.label}
            {tab.badgeCount > 0 && (
              <span style={s.tabBadge}>{tab.badgeCount}</span>
            )}
          </button>
        ))}
      </div>

<div style={{ marginTop: 24, position: "relative" }}>
  {activeTab === "overview"    && ( <CourseOverviewTab course={{ ...course, ...liveStats }}  color={color} /> )}
  {activeTab === "students"    && ( <CourseStudentsTab course={course} teacherId={teacherId} onStudentsChanged={setLiveStats} /> )}
  {activeTab === "assignments" && ( <CourseAssignmentsTab  course={course}  teacherId={teacherId} onGraded={refreshStats} onAssessmentChanged={onAssessmentChanged} /> )}
  {activeTab === "assessments" && ( <CourseAssessmentsTab course={course} teacherId={teacherId} onAssessmentChanged={onAssessmentChanged} onGraded={refreshStats} /> )}
  {activeTab === "lectures" && ( <CourseLecturesTab course={course} teacherId={teacherId} /> )}
  {activeTab === "attendance" && <CourseAttendanceTab course={course} teacherId={teacherId} />}
</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: OVERVIEW
// ─────────────────────────────────────────────
function CourseOverviewTab({ course, color }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={s.detailCard}>
        <h3 style={s.detailCardTitle}>Course Stats</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
          {[
            { label: "Enrolled Students",      value: course.students,            icon: <Users size={18} />,        color: "#243E36" },
            { label: "Assignments to Grade",   value: course.pendingAssignments,  icon: <FileText size={18} />,     color: "#e0a052" },
            { label: "Assessments to Grade",   value: course.pendingAssessments,  icon: <ClipboardList size={18} />, color: "#8b6ce0" },
          ].map((stat, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: stat.color + "18", color: stat.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: 20, fontFamily: "'Playfair Display', serif", fontWeight: 800, color: "#243E36", lineHeight: 1 }}>{stat.value}</p>
                <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 2 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.detailCard}>
        <h3 style={s.detailCardTitle}>Course Info</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {[
            { label: "Subject",   value: course.subject   || "—" },
            { label: "Schedule",  value: course.schedule  || "—" },
            { label: "Status",    value: course.status    || "active" },
            { label: "Join Code", value: course.join_code || "—" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: i < 3 ? "1px solid #e8f3ea" : "none" }}>
              <span style={{ fontSize: 13, color: "#9ab5a0", fontWeight: 500 }}>{item.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{item.value}</span>
                {item.label === "Join Code" && course.join_code && <CopyButton text={course.join_code} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {course.description && (
        <div style={{ ...s.detailCard, gridColumn: "span 2" }}>
          <h3 style={s.detailCardTitle}>Description</h3>
          <p style={{ fontSize: 14, color: "#5a7a6e", lineHeight: 1.7, marginTop: 12 }}>{course.description}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: STUDENTS
// ─────────────────────────────────────────────
function CourseStudentsTab({ course, teacherId, onStudentsChanged }) {
  const [students,     setStudents]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getCourseStudents(course.id);
      setStudents(data);
      onStudentsChanged?.(prev => ({ ...prev, students: data.length }));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [course.id, onStudentsChanged]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const [confirmModal, setConfirmModal] = useState(null);

  const handleRemove = (studentId) => {
    setConfirmModal({
      title: "Remove Student",
      message: "Are you sure you want to remove this student from the course?",
      confirmLabel: "Remove",
      onConfirm: async () => {
        try {
          await unenrollStudent(studentId, course.id);
          setStudents(prev => prev.filter(s => s.id !== studentId));
          onStudentsChanged?.(prev => ({ ...prev, students: (prev.students ?? 0) - 1 }));
        } catch (e) { alert(e.message); }
      },
    });
  };

  const handleEnrolled = (student) => {
    setStudents(prev => [...prev, student]);
    setShowAddModal(false);
    onStudentsChanged?.(prev => ({ ...prev, students: (prev.students ?? 0) + 1 }));
  };

  const handleStudentCreated = (student) => {
    setStudents(prev => [...prev, {
      ...student,
      full_name: student.full_name,
      submissionCount: 0,
      avgGrade: null,
      enrolled_at: new Date().toISOString(),
    }]);
    setShowCreateModal(false);
    onStudentsChanged?.(prev => ({ ...prev, students: (prev.students ?? 0) + 1 }));
  };

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#243E36" }}>
            {loading ? "Students" : `${students.length} Student${students.length !== 1 ? "s" : ""}`}
          </h3>
          {course.join_code && (
            <div style={s.joinCodeInlineCard}>
              <Hash size={11} color="#7CA982" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#243E36", letterSpacing: "0.05em" }}>{course.join_code}</span>
              <CopyButton text={course.join_code} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={s.primaryBtn} onClick={() => setShowCreateModal(true)} className="primary-btn">
            <UserPlus size={14} /> Create Student
          </button>
          <button style={s.secondaryBtn} onClick={() => setShowAddModal(true)} className="secondary-btn">
            <UserPlus size={14} /> Add Existing
          </button>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={14} color="#9ab5a0" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...s.searchInput, paddingLeft: 36 }} className="lms-input" />
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchStudents} />}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}><GraduationCap size={28} color="#c8ddc9" /></div>
          <p style={s.emptyTitle}>{search ? "No students match" : "No students enrolled yet"}</p>
          <p style={s.emptySub}>{search ? "Try a different name" : `Share the join code ${course.join_code ? `"${course.join_code}"` : ""} or add students manually`}</p>
        </div>
      ) : (
        <div style={s.listCard}>
          <table style={s.table}>
            <thead>
              <tr>{["Student", "Email", "Submissions", "Avg Grade", "Enrolled", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((student, i) => (
                <tr key={student.id} style={{ borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: stringToColor(student.full_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {getInitials(student.full_name)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{student.full_name}</span>
                    </div>
                  </td>
                  <td style={{ ...s.td, color: "#5a7a6e", fontSize: 12 }}>{student.email}</td>
                  <td style={{ ...s.td, color: "#5a7a6e" }}>{student.submissionCount}</td>
                  <td style={s.td}>
                    {student.avgGrade !== null
                      ? <span style={{ ...s.gradePill, background: student.avgGrade >= 85 ? "#e8f3ea" : "#fff8e1", color: student.avgGrade >= 85 ? "#1a5c30" : "#7a5c00" }}>{student.avgGrade}%</span>
                      : <span style={{ color: "#c8ddc9", fontSize: 12 }}>No grades</span>
                    }
                  </td>
                  <td style={{ ...s.td, color: "#9ab5a0", fontSize: 12 }}>{timeAgo(student.enrolled_at)}</td>
                  <td style={s.td}>
                    <button
                      style={{ ...s.labeledActionBtn, color: "#e05252", borderColor: "#f5c6c6" }}
                      className="labeled-action-btn"
                      title="Unenroll student from this course"
                      onClick={() => handleRemove(student.id)}
                    >
                      <X size={13} /> Unenroll
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {showAddModal && (
        <AddStudentModal courseId={course.id} teacherId={teacherId} existingIds={students.map(s => s.id)} onClose={() => setShowAddModal(false)} onEnrolled={handleEnrolled} />
      )}

      {showCreateModal && (
        <CreateStudentAccountModal courseId={course.id} onClose={() => setShowCreateModal(false)} onCreated={handleStudentCreated} />
      )}
    </div>
  );
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour   = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

// ─────────────────────────────────────────────
// MODAL: CREATE COURSE
// ─────────────────────────────────────────────
function CreateCourseModal({ teacherId, onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", subject: "", description: "", schedule: "", scheduleDays: [], scheduleStart: "", scheduleEnd: "", coverColor: "#243E36" });
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [newCourse, setNewCourse] = useState(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleCreate = async () => {
    if (!form.title.trim()) { setError("Course title is required."); return; }
    if (!form.subject)      { setError("Please select a subject.");  return; }
    setLoading(true); setError("");
    try {
      const created = await createCourse({ teacherId, title: form.title.trim(), subject: form.subject, description: form.description.trim(), schedule: form.schedule.trim(), coverColor: form.coverColor });
      setNewCourse(created);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (newCourse) {
    return createPortal(
      <div style={s.modalOverlay} onClick={onClose}>
        <div style={s.modal} onClick={e => e.stopPropagation()}>
          <div style={{ ...s.modalHero, background: newCourse.cover_color || "#243E36" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{newCourse.subject}</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: "#fff" }}>{newCourse.title}</h2>
          </div>
          <div style={{ padding: "24px" }}>
            <p style={{ fontSize: 14, color: "#5a7a6e", marginBottom: 20, lineHeight: 1.6 }}>Your course has been created! Share the join code with your students so they can enroll.</p>
            <div style={s.joinCodeSuccess}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Join Code</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 800, color: "#243E36", letterSpacing: "0.05em" }}>{newCourse.join_code}</p>
              </div>
              <CopyButton text={newCourse.join_code} style={{ fontSize: 13, padding: "8px 16px", border: "1.5px solid #c8ddc9", borderRadius: 8, color: "#243E36" }} />
            </div>
            <button style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: 20 }} className="primary-btn" onClick={() => onCreated(newCourse)}>
              Go to Course
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
          <h2 style={s.modalTitle}>Create New Course</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
          {error && <div style={{ background: "#fce8e8", border: "1px solid #e08080", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", display: "flex", gap: 8, alignItems: "center" }}><AlertCircle size={14} /> {error}</div>}
          <div style={s.fieldGroup}>
            <label style={s.label}>Course Title <span style={{ color: "#e05252" }}>*</span></label>
            <input placeholder="e.g. Mathematics 10" value={form.title} onChange={e => set("title", e.target.value)} style={s.input} className="lms-input" />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Subject <span style={{ color: "#e05252" }}>*</span></label>
            <select value={form.subject} onChange={e => set("subject", e.target.value)} style={s.input} className="lms-input">
              <option value="">Select a subject…</option>
              {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          <div style={s.fieldGroup}>
  <label style={s.label}>Schedule</label>

  {/* Day toggles */}
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => {
      const selectedDays = form.scheduleDays || [];
      const isSelected = selectedDays.includes(day);
      return (
        <button
          key={day}
          type="button"
          onClick={() => {
            const current = form.scheduleDays || [];
            const updated = isSelected
              ? current.filter(d => d !== day)
              : [...current, day];
            
            const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            updated.sort((a, b) => order.indexOf(a) - order.indexOf(b));
            set("scheduleDays", updated);
            
            const timeStart = form.scheduleStart || "";
            const timeEnd   = form.scheduleEnd   || "";
            const timeStr   = timeStart && timeEnd
              ? ` ${formatTime(timeStart)}–${formatTime(timeEnd)}`
              : timeStart ? ` ${formatTime(timeStart)}` : "";
            set("schedule", updated.join("/") + timeStr);
          }}
          style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            border: `1.5px solid ${isSelected ? "#243E36" : "#c8ddc9"}`,
            background: isSelected ? "#243E36" : "#fff",
            color: isSelected ? "#F1F7ED" : "#5a7a6e",
            transition: "all 0.15s",
          }}
        >
          {day}
        </button>
      );
    })}
  </div>

  {}
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
    <div style={s.fieldGroup}>
      <label style={{ fontSize: 12, color: "#9ab5a0", fontWeight: 600 }}>Start Time</label>
      <input
        type="time"
        value={form.scheduleStart || ""}
        onChange={e => {
          set("scheduleStart", e.target.value);
          const days    = (form.scheduleDays || []).join("/");
          const timeEnd = form.scheduleEnd || "";
          const timeStr = e.target.value && timeEnd
            ? ` ${formatTime(e.target.value)}–${formatTime(timeEnd)}`
            : e.target.value ? ` ${formatTime(e.target.value)}` : "";
          set("schedule", days + timeStr);
        }}
        style={s.input}
        className="lms-input"
      />
    </div>
    <div style={s.fieldGroup}>
      <label style={{ fontSize: 12, color: "#9ab5a0", fontWeight: 600 }}>End Time</label>
      <input type="time" value={form.scheduleEnd || ""} onChange={e => {
              set("scheduleEnd", e.target.value);
              const days      = (form.scheduleDays || []).join("/");
              const timeStart = form.scheduleStart || "";
              const timeStr   = timeStart && e.target.value
              ? ` ${formatTime(timeStart)}–${formatTime(e.target.value)}`
              : timeStart ? ` ${formatTime(timeStart)}` : "";
              set("schedule", days + timeStr);
              }}
              style={s.input} className="lms-input"/>
              </div>
          </div>
              {/* Preview */}
              {form.schedule && (
              <div style={{ background: "#e8f3ea", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#243E36" }}> {form.schedule}
          </div>
          )}
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Description</label>
            <textarea placeholder="Brief description of this course…" value={form.description} onChange={e => set("description", e.target.value)} rows={2} style={{ ...s.input, resize: "none" }} className="lms-input" />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Cover Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COVER_COLORS.map(color => (
                <button key={color} type="button" onClick={() => set("coverColor", color)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer", background: color, flexShrink: 0, outline: form.coverColor === color ? `3px solid ${color}` : "3px solid transparent", outlineOffset: 2, transform: form.coverColor === color ? "scale(1.2)" : "scale(1)", transition: "transform 0.15s" }} />
              ))}
            </div>
          </div>
          <button type="button" onClick={handleCreate} disabled={loading} style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }} className="primary-btn">
            {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Creating…</> : <><Plus size={15} /> Create Course</>}
          </button>
        </div>
      </div>
    </div>
   ,document.body);
}

// ─────────────────────────────────────────────
// MODAL: ADD STUDENT
// ─────────────────────────────────────────────
function AddStudentModal({ courseId, teacherId, existingIds, onClose, onEnrolled }) {
  const [allStudents, setAllStudents] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [enrolling,   setEnrolling]   = useState(null);
  const [search,      setSearch]      = useState("");
  const [error,       setError]       = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    getAllStudents(teacherId).then(setAllStudents).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [teacherId]);

  const available = allStudents.filter(s =>
    !existingIds.includes(s.id) &&
    (s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEnroll = async (student) => {
    setEnrolling(student.id); setError("");
    try {
      await enrollStudent(student.id, courseId);
      onEnrolled({ ...student, submissionCount: 0, avgGrade: null, enrolled_at: new Date().toISOString() });
    } catch (e) { setError(e.message); }
    finally { setEnrolling(null); }
  };

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h2 style={s.modalTitle}>Add Student</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px 24px" }}>
          {error && <div style={{ background: "#fce8e8", border: "1px solid #e08080", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", marginBottom: 12 }}>{error}</div>}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={14} color="#9ab5a0" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input placeholder="Search students by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...s.input, paddingLeft: 36 }} className="lms-input" autoFocus />
          </div>
          {loading ? <Spinner size={18} /> : available.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9ab5a0", fontSize: 13 }}>
              {search ? "No students match your search" : "All students are already enrolled"}
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {available.map(student => (
                <div key={student.id} style={s.studentPickRow} className="student-pick-row">
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: stringToColor(student.full_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {getInitials(student.full_name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{student.full_name}</p>
                    <p style={{ fontSize: 11, color: "#9ab5a0" }}>{student.email}</p>
                  </div>
                  <button style={{ ...s.primaryBtn, padding: "7px 16px", fontSize: 12 }} className="primary-btn" onClick={() => handleEnroll(student)} disabled={enrolling === student.id}>
                    {enrolling === student.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "Enroll"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// MODAL: CREATE STUDENT ACCOUNT
// ─────────────────────────────────────────────
function CreateStudentAccountModal({ courseId, onClose, onCreated }) {
  const [form, setForm]       = useState({ fullName: "", email: "", password: "" });
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
    if (!consentConfirmed) { setError("Please confirm authorization before creating this account."); return; }

    setLoading(true); setError("");
    try {
      const student = await createStudentAccount({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        courseId,
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
            <button
              style={{ ...s.primaryBtn, justifyContent: "center", width: "100%" }}
              className="primary-btn"
              onClick={() => onCreated(success)}
            >
              Done
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
// MODAL: ARCHIVED COURSES
// ─────────────────────────────────────────────
function ArchivedCoursesModal({ courses, loading, onClose, onUnarchive }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

    return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h2 style={s.modalTitle}>Archived Courses</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 24px 24px", overflowY: "auto" }}>
          {loading ? <Spinner /> : courses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9ab5a0", fontSize: 13 }}>
              No archived courses.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {courses.map(course => (
                <div key={course.id} style={s.archivedRow}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: course.cover_color || "#243E36", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#243E36" }}>{course.title}</p>
                    <p style={{ fontSize: 12, color: "#9ab5a0" }}>{course.subject || "—"}</p>
                  </div>
                  <button style={s.secondaryBtn} className="secondary-btn" onClick={() => onUnarchive(course.id)}>
                    <RefreshCw size={13} /> Unarchive
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// MODAL: DELETE COURSE (with confirmation checkbox)
// ─────────────────────────────────────────────
function DeleteCourseModal({ onConfirm, onClose }) {
  const [checked, setChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", padding: "28px 28px 24px", fontFamily: "'DM Sans', sans-serif" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <AlertCircle size={22} color="#e05252" />
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#243E36", marginBottom: 10 }}>Delete Course</h2>
        <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6, marginBottom: 8 }}>
          Deleting this course will permanently remove this course and the records associated with it, including student enrollments, submissions, assessment results, grades, and attendance for this course only.
        </p>
        <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6, marginBottom: 8 }}>
          This will not delete the students' Emegema accounts or their records in other courses.
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#8b2020", lineHeight: 1.6, marginBottom: 18 }}>
          This action cannot be undone.
        </p>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 10, background: checked ? "#fce8e8" : "#F1F7ED", border: `1.5px solid ${checked ? "#f0b8b8" : "#e8f3ea"}`, marginBottom: 20, transition: "all 0.15s" }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{ marginTop: 2, accentColor: "#e05252", width: 16, height: 16, flexShrink: 0, cursor: "pointer" }}
          />
          <span style={{ fontSize: 13, color: "#243E36", lineHeight: 1.5 }}>
            I understand that the records associated with this course will be permanently deleted.
          </span>
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            className="cancel-btn">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!checked || deleting}
            style={{ flex: 1, padding: "11px 0", border: "none", borderRadius: 9, background: "#e05252", color: "#fff", fontSize: 14, fontWeight: 600, cursor: (!checked || deleting) ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: (!checked || deleting) ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            className="confirm-btn">
            {deleting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Deleting…</> : "Delete Course"}
          </button>
        </div>
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
            style={{ flex: 1, padding: "11px 0", border: "none", borderRadius: 9, background: danger ? "#e05252" : "#243E36", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif', transition: 'background 0.2s'" }}
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
  pageHead:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  pageTitle:   { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#243E36", marginBottom: 4 },
  pageSub:     { fontSize: 14, color: "#9ab5a0" },
  primaryBtn:  { background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "background 0.2s", whiteSpace: "nowrap" },
  secondaryBtn: { background: "#fff", color: "#243E36", border: "1px solid #c8ddc9", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s", whiteSpace: "nowrap" },
  viewToggle:    { display: "flex", background: "#fff", border: "1px solid #e8f3ea", borderRadius: 9, overflow: "hidden" },
  viewBtn:       { background: "none", border: "none", padding: "8px 12px", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center", transition: "all 0.15s" },
  viewBtnActive: { background: "#243E36", color: "#fff" },
  searchWrap:  { position: "relative", marginBottom: 20 },
  searchInput: { width: "100%", padding: "11px 14px 11px 38px", borderRadius: 10, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 20px", gap: 12 },
  emptyIcon:  { width: 72, height: 72, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#243E36" },
  emptySub:   { fontSize: 14, color: "#9ab5a0", textAlign: "center", maxWidth: 300 },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 },
  card:         { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 14, overflow: "visible", transition: "transform 0.2s, box-shadow 0.2s", display: "flex", flexDirection: "column" },
  cardHeader:   { padding: "22px 20px 18px", cursor: "pointer", position: "relative", minHeight: 130, borderRadius: "14px 14px 0 0", overflow: "hidden" },
  cardSubject:  { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 },
  cardTitle:    { fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.3, marginBottom: 8 },
  cardSchedule: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.65)" },
  joinCodeBadge:{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.05em" },
  cardBody:     { padding: "14px 18px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 10 },
  cardStats:    { display: "flex", gap: 14, flexWrap: "wrap" },
  cardStat:     { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9ab5a0" },
  gradeBarBg:   { height: 4, background: "#e8f3ea", borderRadius: 99, overflow: "hidden" },
  gradeBarFill: { height: "100%", borderRadius: 99, transition: "width 0.5s ease" },
  cardFooter:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 4 },
  viewBtn2:     { background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "#243E36", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
  menuBtn:      { background: "none", border: "1px solid #e8f3ea", borderRadius: 7, padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#9ab5a0", transition: "all 0.15s" },
  menuDropdown: { position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e8f3ea", borderRadius: 10, boxShadow: "0 8px 24px rgba(36,62,54,0.12)", zIndex: 50, minWidth: 130, overflow: "hidden" },
  menuItem:     { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, color: "#5a7a6e", background: "none", border: "none", cursor: "pointer", width: "100%", fontFamily: "'DM Sans', sans-serif", textAlign: "left", transition: "background 0.15s" },
  listCard: { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, overflow: "hidden" },
  table:    { width: "100%", borderCollapse: "collapse" },
  th:       { textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e8f3ea", background: "#fafcfa", whiteSpace: "nowrap" },
  td:       { padding: "12px 16px", fontSize: 13, color: "#243E36", verticalAlign: "middle" },
  subjectPill:  { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "#e8f3ea", color: "#243E36" },
  gradePill:    { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "inline-block" },
  joinCodeInline: { fontSize: 12, fontWeight: 700, color: "#243E36", background: "#e8f3ea", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.05em" },
  iconActionBtn:  { background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#5a7a6e", transition: "all 0.15s" },
  labeledActionBtn: { background: "#fff", border: "1.5px solid", borderRadius: 7, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" },
  unenrollBtn: { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #f0b8b8", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "#e05252", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" },
  backBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#7CA982", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 16, padding: 0 },
  courseHero:    { borderRadius: 16, padding: "32px 32px 28px", marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" },
  heroContent:   { flex: 1 },
  heroSubject:   { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 },
  heroTitle:     { fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.2 },
  heroDesc:      { fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 14, maxWidth: 500 },
  heroMeta:      { display: "flex", gap: 16, flexWrap: "wrap" },
  heroMetaItem:  { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.65)" },
  joinCodeCard:  { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "16px 20px", textAlign: "center", flexShrink: 0, minWidth: 160 },
  joinCodeLabel: { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  joinCodeValue: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "0.08em", marginBottom: 10 },
  tabBar:       { display: "flex", gap: 4, borderBottom: "2px solid #e8f3ea", marginTop: 20 },
tabBtn:       { display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "none", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: "transparent", marginBottom: -2, color: "#9ab5a0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" },
tabBtnActive: { color: "#243E36", borderBottomColor: "#243E36" },
tabBadge: { background: "#e05252", color: "#fff", fontSize: 10, fontWeight: 700, minWidth: 17, height: 17, borderRadius: 99, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px", marginLeft: 2 },
  detailCard:      { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "20px 24px" },
  detailCardTitle: { fontSize: 14, fontWeight: 700, color: "#243E36" },
  joinCodeInlineCard: { display: "flex", alignItems: "center", gap: 6, background: "#e8f3ea", border: "1px solid #c8ddc9", borderRadius: 8, padding: "5px 10px" },
  joinCodeSuccess:    { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F1F7ED", border: "1.5px dashed #c8ddc9", borderRadius: 12, padding: "16px 20px" },
  studentPickRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 8, transition: "background 0.15s" },
  archivedRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "1px solid #e8f3ea", background: "#fafcfa" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  modal:        { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", margin: "auto", maxHeight: "90vh", display: "flex", flexDirection: "column" },
  modalHero:    { padding: "24px 24px 20px", borderRadius: "16px 16px 0 0" },
  modalHead:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e8f3ea" },
  modalTitle:   { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" },
  modalClose:   { background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" },
  fieldGroup:   { display: "flex", flexDirection: "column", gap: 6 },
  label:        { fontSize: 13, fontWeight: 600, color: "#243E36" },
  input:        { width: "100%", padding: "11px 14px", borderRadius: 9, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
};

const pageCss = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.4s ease both; }
  .primary-btn:hover  { background: #1a2e28 !important; }
  .secondary-btn:hover { background: #f5faf5 !important; border-color: #7CA982 !important; }
  .course-card:hover  { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(36,62,54,0.10); }
  .view-course-btn:hover { background: #e8f3ea !important; border-color: #c8ddc9 !important; }
  .icon-action-btn:hover { background: #e8f3ea !important; border-color: #c8ddc9 !important; }
  .labeled-action-btn:hover { filter: brightness(0.97); opacity: 0.9; }
  .unenroll-btn:hover { background: #fce8e8 !important; border-color: #e05252 !important; }
  .menu-item:hover       { background: #f5faf5 !important; }
  .menu-item-danger:hover { background: #fce8e8 !important; }
  .back-btn:hover        { color: #243E36 !important; }
  .tab-btn:hover         { color: #243E36 !important; background: #f5faf5; }
  .table-row:hover       { background: #fafcfa; }
  .confirm-btn:hover { opacity: 0.88 !important; }
  .cancel-btn:hover  { background: #e8f3ea !important; }
  .student-pick-row:hover { background: #f5faf5; }
  .lms-input:focus       { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
  @media (max-width: 900px) {
    div[style*="repeat(auto-fill, minmax(260px"] { grid-template-columns: repeat(2, 1fr) !important; }
    div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 600px) {
    div[style*="repeat(auto-fill, minmax(260px"] { grid-template-columns: 1fr !important; }
  }
  .tab-bar-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    max-width: 100%;
  }
  .tab-bar-scroll::-webkit-scrollbar { display: none; }
  .tab-bar-scroll .tab-btn {
    flex-shrink: 0;
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    /* lock the whole page (document level) from swiping sideways —
       a child element wider than the viewport was pushing the
       entire body horizontally, not just this component's div */
    html, body {
      overflow-x: hidden;
      max-width: 100vw;
    }
    .course-detail-root {
      overflow-x: hidden;
      min-width: 0;
      max-width: 100%;
    }
  }
`;
