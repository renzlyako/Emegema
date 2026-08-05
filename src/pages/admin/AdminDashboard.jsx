// src/pages/admin/AdminDashboard.jsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  getAdminProfile,
  getAdminOverviewStats,
  getAdminUsers,
  updateUserStatus,
  deleteUser,
  adminCreateUser,
  getAdminCourses,
  updateCourseStatus,
  deleteCourse,
  getAdminReportStats,
  getAdminRecentActivity,
  getTeacherStudentBreakdown,
  getAuditLog,
} from "../../services/adminService";
import {
  LayoutDashboard, Users, BookOpen, BarChart2, Settings,
  Bell, LogOut, Menu, X, ChevronRight, TrendingUp,
  Shield, AlertTriangle, CheckCircle2, Clock, Search,
  Plus, Edit2, Trash2, Eye, ToggleLeft, ToggleRight,
  Download, GraduationCap, UserCheck, UserX,
  Activity, Database, Globe, Lock, Mail, Save,
  ArrowUp, ArrowDown, MessageSquare, FileText,
  Loader2, RefreshCw, AlertCircle,
} from "lucide-react";
import { createPortal } from "react-dom";

const NAV = [
  { id: "overview",  label: "Overview",          icon: <LayoutDashboard size={18} /> },
  { id: "users",     label: "User Management",   icon: <Users size={18} />           },
  { id: "courses",   label: "Course Management", icon: <BookOpen size={18} />        },
  { id: "reports",   label: "Reports",           icon: <BarChart2 size={18} />       },
  { id: "audit",     label: "Audit Trail",       icon: <Shield size={18} />          },
  { id: "settings",  label: "Settings",          icon: <Settings size={18} />        },
];

function getInitials(name = "") {
  return (name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function stringToColor(str = "") {
  const colors = ["#243E36", "#7CA982", "#4a7c59", "#2d5a45", "#5c8a6a", "#3d6b50"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
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

function roleStyle(role) {
  if (role === "teacher") return { background: "#e8f3ea", color: "#1a5c30" };
  if (role === "student") return { background: "#e8eef9", color: "#1a3a70" };
  if (role === "admin")   return { background: "#fce8e8", color: "#8b2020" };
  return {};
}

function statusStyle(status) {
  if (status === "active")    return { background: "#e8f3ea", color: "#1a5c30" };
  if (status === "pending")   return { background: "#fff8e1", color: "#7a5c00" };
  if (status === "suspended") return { background: "#fce8e8", color: "#8b2020" };
  return {};
}

function Spinner({ size = 20 }) {
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

function EmptyState({ icon, text }) {
  return (
    <div style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {icon}
      <p style={{ fontSize: 14, color: "#9ab5a0" }}>{text}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate  = useNavigate();
  const { user, signOut } = useAuthStore();

  const [activePage,  setActivePage]  = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);

  const [adminProfile,  setAdminProfile]  = useState(null);
  const [overviewStats, setOverviewStats] = useState(null);
  const [users,         setUsers]         = useState([]);
  const [courses,       setCourses]       = useState([]);
  const [reportStats,   setReportStats]   = useState(null);
  const [activity,      setActivity]      = useState([]);
  const [auditLog,      setAuditLog]      = useState([]);

  const [loading, setLoading] = useState({
    profile: true, overview: true, users: true,
    courses: true, reports: true, activity: true, audit: true,
  });
  const [errors, setErrors] = useState({});

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));
  const setErr  = (key, val) => setErrors(prev  => ({ ...prev, [key]: val }));

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoad("profile", true);
    try { setAdminProfile(await getAdminProfile(user.id)); }
    catch (e) { setErr("profile", e.message); }
    finally { setLoad("profile", false); }
  }, [user?.id]);

  const fetchOverview = useCallback(async () => {
    setLoad("overview", true); setErr("overview", null);
    try { setOverviewStats(await getAdminOverviewStats()); }
    catch (e) { setErr("overview", e.message); }
    finally { setLoad("overview", false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoad("users", true); setErr("users", null);
    try { setUsers(await getAdminUsers()); }
    catch (e) { setErr("users", e.message); }
    finally { setLoad("users", false); }
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoad("courses", true); setErr("courses", null);
    try { setCourses(await getAdminCourses()); }
    catch (e) { setErr("courses", e.message); }
    finally { setLoad("courses", false); }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoad("reports", true); setErr("reports", null);
    try { setReportStats(await getAdminReportStats()); }
    catch (e) { setErr("reports", e.message); }
    finally { setLoad("reports", false); }
  }, []);

  const fetchActivity = useCallback(async () => {
    setLoad("activity", true); setErr("activity", null);
    try { setActivity(await getAdminRecentActivity()); }
    catch (e) { setErr("activity", e.message); }
    finally { setLoad("activity", false); }
  }, []);

  const fetchAuditLog = useCallback(async () => {
    setLoad("audit", true); setErr("audit", null);
    try { setAuditLog(await getAuditLog()); }
    catch (e) { setErr("audit", e.message); }
    finally { setLoad("audit", false); }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchOverview();
    fetchUsers();
    fetchCourses();
    fetchReports();
    fetchActivity();
    fetchAuditLog();
  }, [fetchProfile, fetchOverview, fetchUsers, fetchCourses, fetchReports, fetchActivity, fetchAuditLog]);

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  const displayName  = adminProfile?.full_name ?? user?.email ?? "Admin";
  const initials     = getInitials(displayName);
  const pendingUsers = users.filter(u => u.status === "pending");

  const STATS_CARDS = overviewStats ? [
    { label: "Total Users",       value: overviewStats.totalUsers,       icon: <Users size={20} />,    color: "#243E36" },
    { label: "Active Courses",    value: overviewStats.activeCourses,    icon: <BookOpen size={20} />, color: "#7CA982" },
    { label: "Submissions Today", value: overviewStats.submissionsToday, icon: <FileText size={20} />, color: "#4a7c59" },
    { label: "Pending Approvals", value: overviewStats.pendingUsers,     icon: <Clock size={20} />,    color: "#e0a052" },
  ] : [];

  return (
    <div style={s.root}>
      <style>{css}</style>

      <aside style={{ ...s.sidebar, ...(sidebarOpen ? { transform: "translateX(0)" } : {}) }} className="sidebar">
        <div style={s.sidebarTop}>
          <div style={s.logoRow}>
            <div style={s.logoIcon}><Shield size={16} color="#7CA982" /></div>
            <span style={s.logoText}>EduSpace</span>
            <button style={s.closeBtn} onClick={() => setSidebarOpen(false)} className="close-btn">
              <X size={17} color="rgba(241,247,237,0.4)" />
            </button>
          </div>
          <div style={s.adminBadge}>
            <div style={{ ...s.adminAvatar, background: stringToColor(initials) }}>{initials}</div>
            <div>
              <p style={s.adminName}>{displayName}</p>
              <div style={s.adminRolePill}><Shield size={9} color="#7CA982" /> Administrator</div>
            </div>
          </div>
        </div>

        <nav style={s.nav}>
          <p style={s.navLabel}>ADMIN PANEL</p>
          {NAV.map(item => (
            <button key={item.id}
              onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              style={{ ...s.navItem, ...(activePage === item.id ? s.navActive : {}) }}
              className="nav-item">
              <span style={{ opacity: activePage === item.id ? 1 : 0.5, display: "flex" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === "users" && pendingUsers.length > 0 && (
                <span style={s.navBadge}>{pendingUsers.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.systemStatus}>
            <div style={s.statusDot} />
            <span style={s.statusText}>System Online</span>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} className="logout-btn">
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div style={s.sidebarOverlay} onClick={() => setSidebarOpen(false)} />}

      <div style={s.main}>
        <header style={s.topbar}>
          <button style={s.menuBtn} onClick={() => setSidebarOpen(true)} className="menu-btn">
            <Menu size={20} color="#243E36" />
          </button>
          <div style={s.topbarInner}>
            <span style={s.topTitle}>{NAV.find(n => n.id === activePage)?.label}</span>
            <div style={s.topRight}>
              <div style={{ position: "relative" }}>
                <button style={s.iconBtn} onClick={() => setNotifOpen(v => !v)} className="icon-btn">
                  <Bell size={17} color="#243E36" />
                  {pendingUsers.length > 0 && <span style={s.bellBadge}>{pendingUsers.length}</span>}
                </button>
                {notifOpen && (
                  <div style={s.notifDrop}>
                    <p style={s.notifDropTitle}>Recent Activity</p>
                    {loading.activity ? (
                      <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}><Spinner size={16} /></div>
                    ) : activity.slice(0, 5).map((a, i) => (
                      <div key={a.id} style={{ ...s.notifRow, borderTop: i > 0 ? "1px solid #f5faf5" : "none" }}>
                        <div style={{ ...s.notifDot, background: a.color }} />
                        <div>
                          <p style={s.notifText}>{a.text}</p>
                          <p style={s.notifTime}>{a.timeAgo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ ...s.topAvatar, background: stringToColor(initials) }}>{initials}</div>
            </div>
          </div>
        </header>

        <div style={s.content}>
          {activePage === "overview" && (
            <OverviewPage
              setActivePage={setActivePage}
              statsCards={STATS_CARDS}
              statsLoading={loading.overview}
              statsError={errors.overview}
              pendingUsers={pendingUsers}
              usersLoading={loading.users}
              activity={activity}
              activityLoading={loading.activity}
              onApprove={async (id) => { await updateUserStatus(id, "active");    fetchUsers(); fetchOverview(); }}
              onReject={async (id)  => { await updateUserStatus(id, "suspended"); fetchUsers(); fetchOverview(); }}
            />
          )}
          {activePage === "users" && (
            <UsersPage
              users={users}
              loading={loading.users}
              error={errors.users}
              onRefresh={() => { fetchUsers(); fetchOverview(); }}
            />
          )}
          {activePage === "courses" && (
            <CoursesPage
              courses={courses}
              loading={loading.courses}
              error={errors.courses}
              onRefresh={() => { fetchCourses(); fetchOverview(); }}
            />
          )}
          {activePage === "reports" && (
            <ReportsPage
              reportStats={reportStats}
              activity={activity}
              loading={loading.reports}
              activityLoading={loading.activity}
              error={errors.reports}
              onRefresh={fetchReports}
            />
          )}
          {activePage === "audit" && (
            <AuditTrailPage
              auditLog={auditLog}
              loading={loading.audit}
              error={errors.audit}
              onRefresh={fetchAuditLog}
            />
          )}
          {activePage === "settings" && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: OVERVIEW
// ─────────────────────────────────────────────
function OverviewPage({ setActivePage, statsCards, statsLoading, statsError, pendingUsers, usersLoading, activity, activityLoading, onApprove, onReject }) {
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (id, fn) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try { await fn(id); }
    finally { setActionLoading(prev => ({ ...prev, [id]: false })); }
  };

  return (
    <div className="fade-up">
      <div style={s.welcomeRow}>
        <div>
          <h1 style={s.pageTitle}>Admin Overview</h1>
          <p style={s.pageSub}>{new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div style={s.systemBadge}>
          <div style={s.statusDot} />
          All systems operational
        </div>
      </div>

      {statsError && <ErrorBanner message={statsError} />}
      <div style={s.statsGrid}>
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ ...s.statCard, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 110 }}>
              <Spinner />
            </div>
          ))
        ) : statsCards.map((st, i) => (
          <div key={i} style={s.statCard} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ ...s.statIcon, background: st.color + "18", color: st.color }}>{st.icon}</div>
            </div>
            <p style={s.statVal}>{st.value}</p>
            <p style={s.statLabel}>{st.label}</p>
          </div>
        ))}
      </div>

      <div style={s.twoCol}>
        <div>
          <SectionHead title="Pending Approvals" badge={pendingUsers.length} action="Manage Users" onAction={() => setActivePage("users")} />
          <div style={s.card}>
            {usersLoading ? (
              <div style={{ padding: "32px", display: "flex", justifyContent: "center" }}><Spinner /></div>
            ) : pendingUsers.length === 0 ? (
              <EmptyState icon={<CheckCircle2 size={28} color="#c8ddc9" />} text="No pending approvals" />
            ) : pendingUsers.map((u, i) => (
              <div key={u.id} style={{ ...s.pendingRow, borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                <div style={{ ...s.miniAvatar, background: stringToColor(u.initials) }}>{u.initials}</div>
                <div style={{ flex: 1 }}>
                  <p style={s.pendingName}>{u.full_name}</p>
                  <p style={s.pendingMeta}>{u.email} · {u.role}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.approveBtn} className="approve-btn" disabled={actionLoading[u.id]} onClick={() => handleAction(u.id, onApprove)}>
                    {actionLoading[u.id] ? <Spinner size={12} /> : <CheckCircle2 size={13} />} Approve
                  </button>
                  <button style={s.rejectBtn} className="reject-btn" disabled={actionLoading[u.id]} onClick={() => handleAction(u.id, onReject)}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHead title="Activity Log" action="View Reports" onAction={() => setActivePage("reports")} />
          <div style={s.card}>
            {activityLoading ? (
              <div style={{ padding: "32px", display: "flex", justifyContent: "center" }}><Spinner /></div>
            ) : activity.length === 0 ? (
              <EmptyState icon={<Activity size={28} color="#c8ddc9" />} text="No recent activity" />
            ) : activity.slice(0, 6).map((a, i) => (
              <div key={a.id} style={{ ...s.actRow, borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                <div style={{ ...s.actDot, background: a.color }} />
                <div style={{ flex: 1 }}>
                  <p style={s.actText}>{a.text}</p>
                  <p style={s.actTime}>{a.timeAgo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionHead title="Quick Actions" />
        <div style={s.quickGrid}>
          {[
            { icon: <Users size={20} />,     label: "Manage Users",    sub: "Add, edit, suspend",  page: "users",    color: "#243E36" },
            { icon: <BookOpen size={20} />,  label: "Manage Courses",  sub: "View all courses",    page: "courses",  color: "#7CA982" },
            { icon: <BarChart2 size={20} />, label: "View Reports",    sub: "Stats & analytics",   page: "reports",  color: "#4a7c59" },
            { icon: <Settings size={20} />,  label: "System Settings", sub: "Configure platform",  page: "settings", color: "#2d5a45" },
          ].map((q, i) => (
            <button key={i} style={s.quickCard} className="quick-card" onClick={() => setActivePage(q.page)}>
              <div style={{ ...s.quickIcon, background: q.color + "18", color: q.color }}>{q.icon}</div>
              <p style={s.quickLabel}>{q.label}</p>
              <p style={s.quickSub}>{q.sub}</p>
              <ChevronRight size={14} color="#c8ddc9" style={{ marginTop: "auto" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: USER MANAGEMENT
// ─────────────────────────────────────────────
function UsersPage({ users, loading, error, onRefresh }) {
  const [search,       setSearch]    = useState("");
  const [roleFilter,   setRole]      = useState("all");
  const [statusFilter, setStatus]    = useState("all");
  const [showModal,    setShowModal] = useState(false);
  const [actionLoading,setActLoad]   = useState({});
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [infoModal,      setInfoModal]      = useState(null); // { title, message, variant }
  const [confirmModal,   setConfirmModal]   = useState(null); // { title, message, confirmLabel, onConfirm }

  const filtered = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter   === "all" || u.role   === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const pendingCount = users.filter(u => u.status === "pending").length;

  const handleStatusChange = async (userId, newStatus) => {
    setActLoad(prev => ({ ...prev, [userId]: true }));
    try {
      const targetUser = users.find(u => u.id === userId);
      await updateUserStatus(userId, newStatus, targetUser?.full_name, targetUser?.status);
      onRefresh();
    }
    catch (e) { setInfoModal({ title: "Action Failed", message: e.message, variant: "error" }); }
    finally { setActLoad(prev => ({ ...prev, [userId]: false })); }
  };

  const handleDelete = (userId) => {
    setConfirmModal({
      title: "Delete User",
      message: "Are you sure you want to delete this user? This will permanently remove their account and cannot be undone.",
      confirmLabel: "Delete User",
      onConfirm: async () => {
        setActLoad(prev => ({ ...prev, [userId]: true }));
        try {
          await deleteUser(userId);
          onRefresh();
          setInfoModal({ title: "User Deleted", message: "The user account has been permanently removed.", variant: "success" });
        } catch (e) {
          setInfoModal({ title: "Delete Failed", message: e.message, variant: "error" });
        } finally {
          setActLoad(prev => ({ ...prev, [userId]: false }));
        }
      },
    });
  };

  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>User Management</h1>
          <p style={s.pageSub}>{loading ? "Loading…" : `${users.length} total users · ${pendingCount} pending approval`}</p>
        </div>
        <button style={s.primaryBtn} className="primary-btn" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Add User
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={onRefresh} />}

      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={15} color="#9ab5a0" style={s.searchIcon} />
          <input placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={s.searchInput} className="lms-input" />
        </div>
        <div style={s.filterGroup}>
          {["all", "student", "teacher", "admin"].map(r => (
            <button key={r} onClick={() => setRole(r)}
              style={{ ...s.filterTab, ...(roleFilter === r ? s.filterActive : {}) }}
              className="filter-tab">
              {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        <div style={s.filterGroup}>
          {["all", "active", "pending", "suspended"].map(st => (
            <button key={st} onClick={() => setStatus(st)}
              style={{ ...s.filterTab, ...(statusFilter === st ? s.filterActive : {}) }}
              className="filter-tab">
              {st === "all" ? "All Status" : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : (
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>
                {["User", "Email", "Role", "Courses", "Joined", "Last Active", "Status", "Actions"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...s.miniAvatar, background: stringToColor(u.initials) }}>{u.initials}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ ...s.td, color: "#5a7a6e", fontSize: 12 }}>{u.email}</td>
                  <td style={s.td}><span style={{ ...s.rolePill, ...roleStyle(u.role) }}>{u.role}</span></td>
                  <td style={{ ...s.td, color: "#5a7a6e" }}>{u.courseCount}</td>
                  <td style={{ ...s.td, color: "#9ab5a0", fontSize: 12 }}>{formatDate(u.created_at)}</td>
                  <td style={{ ...s.td, color: "#9ab5a0", fontSize: 12 }}>{u.last_active_at ? timeAgo(u.last_active_at) : "Never logged in"}</td>
                  <td style={s.td}><span style={{ ...s.statusPill, ...statusStyle(u.status) }}>{u.status}</span></td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ minWidth: 68, flexShrink: 0 }}>
                        {u.role === "teacher" && (
                          <button style={{ ...s.labeledActionBtn, color: "#5a7a6e", borderColor: "#c8ddc9" }} className="labeled-action-btn" title="View student breakdown" onClick={() => setViewingTeacher(u)}>
                            <Eye size={12} /> View
                          </button>
                        )}
                      </div>
                      {u.status === "pending" && (
                        <button style={s.approveBtn} className="approve-btn" disabled={actionLoading[u.id]} onClick={() => handleStatusChange(u.id, "active")}>
                          {actionLoading[u.id] ? <Spinner size={11} /> : <CheckCircle2 size={12} />} Approve
                        </button>
                      )}
                      {u.status === "active" && (
                        <button style={{ ...s.labeledActionBtn, color: "#e0a052", borderColor: "#f0c060" }} className="labeled-action-btn" disabled={actionLoading[u.id]} onClick={() => handleStatusChange(u.id, "suspended")}>
                          {actionLoading[u.id] ? <Spinner size={11} /> : <UserX size={12} />} Suspend
                        </button>
                      )}
                      {u.status === "suspended" && (
                        <button style={{ ...s.labeledActionBtn, color: "#7CA982", borderColor: "#c8ddc9" }} className="labeled-action-btn" disabled={actionLoading[u.id]} onClick={() => handleStatusChange(u.id, "active")}>
                          {actionLoading[u.id] ? <Spinner size={11} /> : <UserCheck size={12} />} Reactivate
                        </button>
                      )}
                      <button style={{ ...s.labeledActionBtn, color: "#e05252", borderColor: "#f5c6c6" }} className="labeled-action-btn" disabled={actionLoading[u.id]} onClick={() => handleDelete(u.id)}>
                        {actionLoading[u.id] ? <Spinner size={11} /> : <Trash2 size={12} />} Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <EmptyState icon={<Users size={28} color="#c8ddc9" />} text="No users found" />
          )}
        </div>
      )}

      {}
      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); onRefresh(); }}
        />
      )}

      {viewingTeacher && (
        <TeacherStudentDetailModal
          teacher={viewingTeacher}
          onClose={() => setViewingTeacher(null)}
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

      {infoModal && (
        <InfoModal
          title={infoModal.title}
          message={infoModal.message}
          variant={infoModal.variant}
          onClose={() => setInfoModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: TEACHER STUDENT BREAKDOWN (Admin view)
// ─────────────────────────────────────────────
function TeacherStudentDetailModal({ teacher, onClose }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [openCourseId, setOpenCourseId] = useState(null);

  const toggleCourse = (id) => setOpenCourseId(prev => prev === id ? null : id);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await getTeacherStudentBreakdown(teacher.id);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [teacher.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const renderStudentRow = (st) => (
    <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: "1px solid #e8f3ea" }}>
      <div style={{ ...s.miniAvatar, background: stringToColor(st.full_name) }}>{getInitials(st.full_name)}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{st.full_name}</p>
        <p style={{ fontSize: 11, color: "#9ab5a0" }}>{st.email}</p>
      </div>
      <span style={{ ...s.statusPill, ...statusStyle(st.status) }}>{st.status}</span>
    </div>
  );

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <div>
            <h2 style={s.modalTitle}>{teacher.full_name}'s Students</h2>
            <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 4 }}>{teacher.email}</p>
          </div>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: "20px 24px 24px", maxHeight: "70vh", overflowY: "auto" }}>
          {error && <ErrorBanner message={error} onRetry={fetchData} />}

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}><Spinner size={22} /></div>
          ) : data && (
            data.courses.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ab5a0", padding: "8px 0" }}>This teacher has no courses yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.courses.map(course => {
                  const isOpen = openCourseId === course.id;
                  const total  = course.created.length + course.joined.length;
                  return (
                    <div key={course.id} style={{ ...s.card, overflow: "hidden" }}>
                      <button
                        onClick={() => toggleCourse(course.id)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#243E36" }}>{course.title}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ background: "#e8eef9", color: "#1a3a70", fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 99 }}>
                            {total} student{total !== 1 ? "s" : ""}
                          </span>
                          <ChevronRight size={14} color="#9ab5a0" style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                        </div>
                      </button>

                      {isOpen && (
                        <div style={{ borderTop: "1px solid #e8f3ea", padding: "14px 16px 16px" }}>
                          <div style={{ marginBottom: course.joined.length > 0 ? 16 : 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a5c30" }}>Created by This Teacher</span>
                              <span style={{ background: "#e8f3ea", color: "#1a5c30", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{course.created.length}</span>
                            </div>
                            {course.created.length === 0 ? (
                              <p style={{ fontSize: 12, color: "#9ab5a0", padding: "4px 0" }}>None enrolled in this course.</p>
                            ) : (
                              <div style={{ border: "1px solid #e8f3ea", borderRadius: 9, overflow: "hidden" }}>
                                {course.created.map((st, i) => (
                                  <div key={st.id} style={{ borderTop: i === 0 ? "none" : undefined }}>{renderStudentRow(st)}</div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a3a70" }}>Enrolled via Join Code</span>
                              <span style={{ background: "#e8eef9", color: "#1a3a70", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{course.joined.length}</span>
                            </div>
                            {course.joined.length === 0 ? (
                              <p style={{ fontSize: 12, color: "#9ab5a0", padding: "4px 0" }}>None enrolled via join code.</p>
                            ) : (
                              <div style={{ border: "1px solid #e8f3ea", borderRadius: 9, overflow: "hidden" }}>
                                {course.joined.map((st, i) => (
                                  <div key={st.id} style={{ borderTop: i === 0 ? "none" : undefined }}>{renderStudentRow(st)}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// PAGE: COURSE MANAGEMENT
// ─────────────────────────────────────────────
function CoursesPage({ courses, loading, error, onRefresh }) {
  const [search,       setSearch]  = useState("");
  const [statusFilter, setStatus]  = useState("all");
  const [actionLoading,setActLoad] = useState({});

  const filtered = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.teacherName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = async (courseId, newStatus) => {
    setActLoad(prev => ({ ...prev, [courseId]: true }));
    try { await updateCourseStatus(courseId, newStatus); onRefresh(); }
    catch (_) {}
    finally { setActLoad(prev => ({ ...prev, [courseId]: false })); }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm("Delete this course? This cannot be undone.")) return;
    setActLoad(prev => ({ ...prev, [courseId]: true }));
    try { await deleteCourse(courseId); onRefresh(); }
    catch (_) {}
    finally { setActLoad(prev => ({ ...prev, [courseId]: false })); }
  };

  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>Course Management</h1>
          <p style={s.pageSub}>{loading ? "Loading…" : `${courses.length} total courses · ${courses.filter(c => c.status === "active").length} active`}</p>
        </div>
        <button style={s.primaryBtn} className="primary-btn" onClick={onRefresh}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={onRefresh} />}

      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={15} color="#9ab5a0" style={s.searchIcon} />
          <input placeholder="Search by course or teacher..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={s.searchInput} className="lms-input" />
        </div>
        <div style={s.filterGroup}>
          {["all", "active", "archived"].map(st => (
            <button key={st} onClick={() => setStatus(st)}
              style={{ ...s.filterTab, ...(statusFilter === st ? s.filterActive : {}) }}
              className="filter-tab">
              {st === "all" ? "All" : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : (
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Course", "Subject", "Teacher", "Students", "Created", "Status", "Actions"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} style={{ borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.cover_color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: "#243E36", fontSize: 13 }}>{c.title}</span>
                    </div>
                  </td>
                  <td style={{ ...s.td, fontSize: 12 }}>
                    <span style={{ ...s.rolePill, background: "#e8f3ea", color: "#243E36" }}>{c.subject}</span>
                  </td>
                  <td style={{ ...s.td, color: "#5a7a6e", fontSize: 12 }}>{c.teacherName}</td>
                  <td style={{ ...s.td, color: "#5a7a6e" }}>{c.studentCount}</td>
                  <td style={{ ...s.td, color: "#9ab5a0", fontSize: 12 }}>{formatDate(c.created_at)}</td>
                  <td style={s.td}>
                    <span style={{ ...s.statusPill, ...(c.status === "active" ? { background: "#e8f3ea", color: "#1a5c30" } : { background: "#f0f0f0", color: "#666" }) }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {c.status === "active" ? (
                        <button style={{ ...s.iconActionBtn, color: "#e0a052" }} className="icon-action-btn" title="Archive" disabled={actionLoading[c.id]} onClick={() => handleStatusChange(c.id, "archived")}>
                          {actionLoading[c.id] ? <Spinner size={11} /> : <ToggleLeft size={13} />}
                        </button>
                      ) : (
                        <button style={{ ...s.iconActionBtn, color: "#7CA982" }} className="icon-action-btn" title="Reactivate" disabled={actionLoading[c.id]} onClick={() => handleStatusChange(c.id, "active")}>
                          {actionLoading[c.id] ? <Spinner size={11} /> : <ToggleRight size={13} />}
                        </button>
                      )}
                      <button style={{ ...s.iconActionBtn, color: "#e05252" }} className="icon-action-btn" title="Delete" disabled={actionLoading[c.id]} onClick={() => handleDelete(c.id)}>
                        {actionLoading[c.id] ? <Spinner size={11} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <EmptyState icon={<BookOpen size={28} color="#c8ddc9" />} text="No courses found" />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: REPORTS
// ─────────────────────────────────────────────
function ReportsPage({ reportStats, activity, loading, activityLoading, error, onRefresh }) {
  const REPORT_CARDS = reportStats ? [
    { label: "Total Students",  value: reportStats.totalStudents,    icon: <GraduationCap size={18} />, color: "#243E36" },
    { label: "Total Teachers",  value: reportStats.totalTeachers,    icon: <UserCheck size={18} />,     color: "#7CA982" },
    { label: "Total Courses",   value: reportStats.totalCourses,     icon: <BookOpen size={18} />,      color: "#4a7c59" },
    { label: "Avg. Grade",      value: reportStats.avgGrade,         icon: <TrendingUp size={18} />,    color: "#2d5a45" },
    { label: "Submissions",     value: reportStats.totalSubmissions, icon: <FileText size={18} />,      color: "#5c8a6a" },
    { label: "Active Today",    value: reportStats.activeToday,      icon: <Activity size={18} />,      color: "#3d6b50" },
  ] : [];

  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>Reports & Analytics</h1>
          <p style={s.pageSub}>Platform-wide statistics and performance overview.</p>
        </div>
        <button style={s.primaryBtn} className="primary-btn" onClick={onRefresh}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={onRefresh} />}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : (
        <>
          <div style={s.reportGrid}>
            {REPORT_CARDS.map((r, i) => (
              <div key={i} style={s.reportCard} className="stat-card">
                <div style={{ ...s.reportIcon, background: r.color + "18", color: r.color }}>{r.icon}</div>
                <p style={s.reportVal}>{r.value ?? "—"}</p>
                <p style={s.reportLabel}>{r.label}</p>
              </div>
            ))}
          </div>

          <div style={s.twoCol}>
            <div>
              <SectionHead title="User Breakdown by Role" />
              <div style={{ ...s.card, padding: "20px 24px" }}>
                {(reportStats?.roleBreakdown ?? []).map((r, i) => (
                  <div key={i} style={{ marginBottom: i < 2 ? 18 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{r.label}</span>
                      <span style={{ fontSize: 13, color: "#5a7a6e" }}>{r.count} <span style={{ color: "#9ab5a0" }}>({r.pct}%)</span></span>
                    </div>
                    <div style={s.barBg}>
                      <div style={{ ...s.barFill, width: `${r.pct}%`, background: r.color }} className="bar-fill" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SectionHead title="Grade Distribution" />
              <div style={{ ...s.card, padding: "20px 24px" }}>
                {(reportStats?.gradeBreakdown ?? []).map((g, i) => (
                  <div key={i} style={{ marginBottom: i < 3 ? 18 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#243E36" }}>{g.label}</span>
                      <span style={{ fontSize: 13, color: "#5a7a6e" }}>{g.count} <span style={{ color: "#9ab5a0" }}>({g.pct}%)</span></span>
                    </div>
                    <div style={s.barBg}>
                      <div style={{ ...s.barFill, width: `${g.pct}%`, background: g.color }} className="bar-fill" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <SectionHead title="Full Activity Log" />
            <div style={s.card}>
              {activityLoading ? (
                <div style={{ padding: "32px", display: "flex", justifyContent: "center" }}><Spinner /></div>
              ) : activity.length === 0 ? (
                <EmptyState icon={<Activity size={28} color="#c8ddc9" />} text="No activity yet" />
              ) : activity.map((a, i) => (
                <div key={a.id} style={{ ...s.actRow, borderTop: i > 0 ? "1px solid #e8f3ea" : "none" }}>
                  <div style={{ ...s.actDot, background: a.color }} />
                  <div style={{ flex: 1 }}>
                    <p style={s.actText}>{a.text}</p>
                    <p style={s.actTime}>{a.timeAgo}</p>
                  </div>
                  <span style={{ ...s.rolePill, background: "#f5f5f5", color: "#9ab5a0", fontSize: 10 }}>{a.type}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: SETTINGS (UI only)
// ─────────────────────────────────────────────
function SettingsPage() {
  const [saved,   setSaved]   = useState(false);
  const [toggles, setToggles] = useState({ registration: true, emailVerify: true, teacherApproval: true, maintenance: false, notifications: true });
  const toggle     = (key) => setToggles(v => ({ ...v, [key]: !v[key] }));
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>System Settings</h1>
          <p style={s.pageSub}>Configure your EduSpace platform settings.</p>
        </div>
        <button style={s.primaryBtn} className="primary-btn" onClick={handleSave}>
          <Save size={14} /> {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div style={s.settingsGrid}>
        <div>
          <SectionHead title="Platform" />
          <div style={{ ...s.card, padding: "0" }}>
            {[
              { key: "registration",    label: "Open Registration",    desc: "Allow new users to register",          icon: <Globe size={16} color="#7CA982" />         },
              { key: "emailVerify",     label: "Email Verification",   desc: "Require email confirmation on signup",  icon: <Mail size={16} color="#7CA982" />          },
              { key: "teacherApproval", label: "Teacher Approval",     desc: "Manually approve new teacher accounts", icon: <UserCheck size={16} color="#7CA982" />     },
              { key: "maintenance",     label: "Maintenance Mode",     desc: "Take platform offline for maintenance", icon: <AlertTriangle size={16} color="#e0a052" /> },
              { key: "notifications",   label: "System Notifications", desc: "Send email alerts to users",            icon: <Bell size={16} color="#7CA982" />          },
            ].map((item, i, arr) => (
              <div key={item.key} style={{ ...s.settingRow, borderBottom: i < arr.length - 1 ? "1px solid #e8f3ea" : "none" }}>
                <div style={s.settingIconWrap}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={s.settingLabel}>{item.label}</p>
                  <p style={s.settingDesc}>{item.desc}</p>
                </div>
                <button onClick={() => toggle(item.key)} style={s.toggleBtn} className="toggle-btn">
                  {toggles[item.key] ? <ToggleRight size={28} color="#7CA982" /> : <ToggleLeft size={28} color="#c8ddc9" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHead title="School Information" />
          <div style={{ ...s.card, padding: "20px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "School Name",    placeholder: "EduSpace Academy",   defaultVal: "EduSpace Academy"    },
                { label: "School Email",   placeholder: "admin@school.com",   defaultVal: "admin@eduspace.com"  },
                { label: "School Address", placeholder: "City, Province",     defaultVal: "Manila, Philippines" },
                { label: "School Year",    placeholder: "e.g. 2024–2025",     defaultVal: "2024–2025"           },
              ].map(f => (
                <div key={f.label} style={s.fieldGroup}>
                  <label style={s.label}>{f.label}</label>
                  <input defaultValue={f.defaultVal} placeholder={f.placeholder} style={s.input} className="lms-input" />
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <SectionHead title="Danger Zone" />
            <div style={{ ...s.card, padding: "20px 24px", border: "1px solid #f0c0c0" }}>
              <p style={{ fontSize: 13, color: "#8b2020", marginBottom: 16, fontWeight: 500 }}>
                These actions are irreversible. Proceed with caution.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button style={s.dangerBtn} className="danger-btn"><Trash2 size={14} /> Clear All Submissions</button>
                <button style={s.dangerBtn} className="danger-btn"><Database size={14} /> Reset Platform Data</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: Add User
// ─────────────────────────────────────────────
function AddUserModal({ onClose, onSuccess }) {
  const [form,      setForm]      = useState({ fullName: "", email: "", role: "student", password: "" });
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setSaveError("All fields are required."); return;
    }
    if (form.password.length < 8) {
      setSaveError("Password must be at least 8 characters."); return;
    }
    setSaving(true); setSaveError("");
    try {
      await adminCreateUser({
        fullName: form.fullName.trim(),
        email:    form.email.trim(),
        password: form.password,
        role:     form.role,
      });
      onSuccess();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <h2 style={s.modalTitle}>Add New User</h2>
          <button style={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {saveError && (
            <div style={{ background: "#fce8e8", border: "1px solid #f5c6c6", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#8b2020", display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} color="#c0392b" /> {saveError}
            </div>
          )}
          <div style={s.fieldGroup}>
            <label style={s.label}>Full Name</label>
            <input placeholder="e.g. Maria Santos" value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              style={s.input} className="lms-input" />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Email Address</label>
            <input type="email" placeholder="maria@school.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={s.input} className="lms-input" />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Role</label>
            <select value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={s.input} className="lms-input">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Temporary Password</label>
            <input type="password" placeholder="Min. 8 characters" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={s.input} className="lms-input" />
          </div>
          <button
            style={{ ...s.primaryBtn, justifyContent: "center", width: "100%", padding: "12px 0" }}
            className="primary-btn" onClick={handleCreate} disabled={saving}
          >
            {saving
              ? <><Loader2 size={14} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> Creating…</>
              : <><Plus size={14} /> Create User</>
            }
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// MODAL: Info / Result
// ─────────────────────────────────────────────
function InfoModal({ title, message, variant = "success", onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const isError = variant === "error";

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", padding: "28px 28px 24px", fontFamily: "'DM Sans', sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: isError ? "#fce8e8" : "#e8f3ea", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          {isError ? <AlertCircle size={22} color="#e05252" /> : <CheckCircle2 size={22} color="#7CA982" />}
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#243E36", marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        <button onClick={onClose}
          style={{ width: "100%", padding: "11px 0", border: "none", borderRadius: 9, background: isError ? "#e05252" : "#243E36", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          className="confirm-btn">
          OK
        </button>
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// MODAL: Confirm
// ─────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = "Confirm", onConfirm, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", padding: "28px 28px 24px", fontFamily: "'DM Sans', sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fce8e8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <AlertCircle size={22} color="#e05252" />
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
            style={{ flex: 1, padding: "11px 0", border: "none", borderRadius: 9, background: "#e05252", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            className="confirm-btn">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

// ─────────────────────────────────────────────
// HELPER COMPONENT
// ─────────────────────────────────────────────
function SectionHead({ title, badge, action, onAction }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#243E36" }}>{title}</h2>
        {badge > 0 && <span style={{ background: "#e05252", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{badge}</span>}
      </div>
      {action && (
        <button onClick={onAction} style={{ background: "none", border: "none", color: "#7CA982", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontFamily: "'DM Sans', sans-serif" }}>
          {action} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE: AUDIT TRAIL
// ─────────────────────────────────────────────
function ACTION_META(action) {
  const map = {
    user_deleted:         { label: "User Deleted",   color: "#e05252", icon: <Trash2 size={14} /> },
    user_status_changed:  { label: "Status Changed",  color: "#e0a052", icon: <UserCheck size={14} /> },
    grade_updated:        { label: "Grade Updated",   color: "#7CA982", icon: <FileText size={14} /> },
  };
  return map[action] ?? { label: action, color: "#9ab5a0", icon: <Activity size={14} /> };
}

function AuditTrailPage({ auditLog, loading, error, onRefresh }) {
  const [search,       setSearch]       = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filtered = auditLog.filter(e => {
    const matchSearch = e.actorName?.toLowerCase().includes(search.toLowerCase()) ||
                         e.targetName?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || e.action === actionFilter;
    return matchSearch && matchAction;
  });

  const actionTypes = ["all", ...new Set(auditLog.map(e => e.action))];

  return (
    <div className="fade-up">
      <div style={s.pageHead}>
        <div>
          <h1 style={s.pageTitle}>Audit Trail</h1>
          <p style={s.pageSub}>
            {loading ? "Loading…" : `${auditLog.length} recorded action${auditLog.length !== 1 ? "s" : ""} — deletions, status changes, and grade edits`}
          </p>
        </div>
        <button style={s.primaryBtn} className="primary-btn" onClick={onRefresh}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={onRefresh} />}

      <div style={s.filterBar}>
        <div style={s.searchWrap}>
          <Search size={15} color="#9ab5a0" style={s.searchIcon} />
          <input placeholder="Search by actor or target name..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={s.searchInput} className="lms-input" />
        </div>
        <div style={s.filterGroup}>
          {actionTypes.map(a => (
            <button key={a} onClick={() => setActionFilter(a)}
              style={{ ...s.filterTab, ...(actionFilter === a ? s.filterActive : {}) }}
              className="filter-tab">
              {a === "all" ? "All Actions" : ACTION_META(a).label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}><Spinner size={24} /></div>
      ) : (
        <div style={s.card}>
          {filtered.length === 0 ? (
            <EmptyState icon={<Shield size={28} color="#c8ddc9" />} text="No audit entries found" />
          ) : filtered.map((e, i) => {
            const meta = ACTION_META(e.action);
            return (
              <div key={e.id} style={{ ...s.actRow, borderTop: i > 0 ? "1px solid #e8f3ea" : "none", padding: "14px 18px" }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: meta.color + "18", color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "#243E36" }}>
                    <strong>{e.actorName}</strong> — {meta.label.toLowerCase()} — <strong>{e.targetName}</strong>
                  </p>
                  {e.details && (
                    <p style={{ fontSize: 11, color: "#9ab5a0", marginTop: 2 }}>
                      {Object.entries(e.details).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </p>
                  )}
                </div>
                <span style={{ ...s.rolePill, background: meta.color + "18", color: meta.color, flexShrink: 0 }}>{e.timeAgo}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = {
  root:         { display: "flex", minHeight: "100vh", background: "#F1F7ED", fontFamily: "'DM Sans', sans-serif", position: "relative" },
  sidebar:      { width: 240, flexShrink: 0, background: "#1a2e28", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto", zIndex: 40, transition: "transform 0.25s ease" },
  sidebarTop:   { borderBottom: "1px solid rgba(124,169,130,0.12)" },
  logoRow:      { display: "flex", alignItems: "center", gap: 10, padding: "24px 20px 14px" },
  logoIcon:     { width: 32, height: 32, background: "rgba(124,169,130,0.15)", border: "1px solid rgba(124,169,130,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logoText:     { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, color: "#F1F7ED", flex: 1 },
  closeBtn:     { background: "none", border: "none", cursor: "pointer", padding: 4, display: "none" },
  adminBadge:   { display: "flex", alignItems: "center", gap: 10, padding: "10px 20px 16px" },
  adminAvatar:  { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 },
  adminName:    { fontSize: 13, fontWeight: 600, color: "#F1F7ED", marginBottom: 3 },
  adminRolePill:{ display: "flex", alignItems: "center", gap: 4, background: "rgba(124,169,130,0.15)", border: "1px solid rgba(124,169,130,0.25)", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#7CA982", width: "fit-content" },
  nav:          { padding: "16px 12px", flex: 1 },
  navLabel:     { fontSize: 10, fontWeight: 700, color: "rgba(241,247,237,0.25)", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 8 },
  navItem:      { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, background: "transparent", border: "none", color: "rgba(241,247,237,0.5)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", marginBottom: 2, transition: "all 0.15s" },
  navActive:    { background: "#7CA982", color: "#fff" },
  navBadge:     { marginLeft: "auto", background: "#e05252", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99 },
  sidebarFooter:{ borderTop: "1px solid rgba(124,169,130,0.12)", padding: "12px 16px" },
  systemStatus: { display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", marginBottom: 4 },
  statusDot:    { width: 8, height: 8, background: "#7CA982", borderRadius: "50%", boxShadow: "0 0 0 3px rgba(124,169,130,0.2)", flexShrink: 0 },
  statusText:   { fontSize: 12, color: "rgba(241,247,237,0.4)", fontWeight: 500 },
  logoutBtn:    { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "rgba(241,247,237,0.35)", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "8px 4px", width: "100%", transition: "color 0.15s" },
  sidebarOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 35 },
  main:         { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topbar:       { height: 60, background: "#fff", borderBottom: "1px solid #e8f3ea", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, position: "sticky", top: 0, zIndex: 30 },
  menuBtn:      { background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "none" },
  topbarInner:  { flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" },
  topTitle:     { fontSize: 15, fontWeight: 600, color: "#243E36" },
  topRight:     { display: "flex", alignItems: "center", gap: 12 },
  iconBtn:      { position: "relative", background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  bellBadge:    { position: "absolute", top: -4, right: -4, background: "#e05252", color: "#fff", fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" },
  notifDrop:    { position: "absolute", top: "calc(100% + 10px)", right: 0, width: 310, background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, boxShadow: "0 8px 32px rgba(36,62,54,0.12)", overflow: "hidden", zIndex: 50, padding: "14px 0" },
  notifDropTitle:{ fontSize: 13, fontWeight: 700, color: "#243E36", padding: "0 16px 12px", borderBottom: "1px solid #e8f3ea" },
  notifRow:     { display: "flex", gap: 10, padding: "10px 16px", alignItems: "flex-start" },
  notifDot:     { width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  notifText:    { fontSize: 12, color: "#243E36", lineHeight: 1.5 },
  notifTime:    { fontSize: 11, color: "#9ab5a0", marginTop: 2 },
  topAvatar:    { width: 34, height: 34, color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
  content:      { padding: "28px", flex: 1, overflowY: "auto" },
  welcomeRow:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  systemBadge:  { display: "flex", alignItems: "center", gap: 8, background: "#e8f3ea", border: "1px solid #c8ddc9", borderRadius: 99, padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "#1a5c30" },
  statsGrid:    { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 },
  statCard:     { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "18px 20px", transition: "transform 0.2s, box-shadow 0.2s" },
  statIcon:     { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  statVal:      { fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, color: "#243E36", margin: "10px 0 4px" },
  statLabel:    { fontSize: 12, color: "#9ab5a0", fontWeight: 500 },
  twoCol:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card:         { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, overflow: "hidden" },
  pendingRow:   { display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" },
  miniAvatar:   { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 },
  pendingName:  { fontSize: 13, fontWeight: 600, color: "#243E36", marginBottom: 2 },
  pendingMeta:  { fontSize: 11, color: "#9ab5a0" },
  approveBtn:   { display: "flex", alignItems: "center", gap: 5, background: "#e8f3ea", color: "#1a5c30", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" },
  rejectBtn:    { background: "#fce8e8", color: "#8b2020", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center" },
  actRow:       { display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 16px" },
  actDot:       { width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  actText:      { fontSize: 12, color: "#243E36", lineHeight: 1.5 },
  actTime:      { fontSize: 11, color: "#9ab5a0", marginTop: 2 },
  quickGrid:    { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 },
  quickCard:    { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "20px 18px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, transition: "transform 0.2s, box-shadow 0.2s", fontFamily: "'DM Sans', sans-serif", textAlign: "left" },
  quickIcon:    { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  quickLabel:   { fontSize: 14, fontWeight: 700, color: "#243E36" },
  quickSub:     { fontSize: 12, color: "#9ab5a0" },
  pageHead:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  pageTitle:    { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#243E36", marginBottom: 4 },
  pageSub:      { fontSize: 14, color: "#9ab5a0" },
  primaryBtn:   { background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "background 0.2s" },
  filterBar:    { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  searchWrap:   { position: "relative", flex: 1, minWidth: 200 },
  searchIcon:   { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" },
  searchInput:  { width: "100%", padding: "9px 14px 9px 36px", borderRadius: 9, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 13, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif" },
  filterGroup:  { display: "flex", gap: 6 },
  filterTab:    { padding: "7px 14px", borderRadius: 8, border: "1px solid #e8f3ea", background: "#fff", color: "#5a7a6e", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" },
  filterActive: { background: "#243E36", color: "#fff", border: "1px solid #243E36" },
  table:        { width: "100%", borderCollapse: "collapse" },
  th:           { textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e8f3ea", background: "#fafcfa", whiteSpace: "nowrap" },
  td:           { padding: "11px 16px", fontSize: 13, color: "#243E36", verticalAlign: "middle" },
  rolePill:     { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, display: "inline-block" },
  statusPill:   { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, textTransform: "capitalize" },
  iconActionBtn:{ background: "#F1F7ED", border: "1px solid #e8f3ea", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#5a7a6e", transition: "all 0.15s" },
  labeledActionBtn: { background: "#fff", border: "1.5px solid", borderRadius: 7, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap" },
  reportGrid:   { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 },
  reportCard:   { background: "#fff", border: "1px solid #e8f3ea", borderRadius: 12, padding: "16px", textAlign: "center" },
  reportIcon:   { width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" },
  reportVal:    { fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: "#243E36", marginBottom: 2 },
  reportLabel:  { fontSize: 11, color: "#9ab5a0", fontWeight: 500 },
  barBg:        { height: 8, background: "#e8f3ea", borderRadius: 99, overflow: "hidden" },
  barFill:      { height: "100%", borderRadius: 99, transition: "width 0.6s ease" },
  settingsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  settingRow:   { display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" },
  settingIconWrap:{ width: 36, height: 36, background: "#e8f3ea", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  settingLabel: { fontSize: 14, fontWeight: 600, color: "#243E36", marginBottom: 2 },
  settingDesc:  { fontSize: 12, color: "#9ab5a0" },
  toggleBtn:    { background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 },
  dangerBtn:    { display: "flex", alignItems: "center", gap: 8, background: "#fce8e8", color: "#8b2020", border: "1px solid #f0c0c0", borderRadius: 9, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", width: "100%", transition: "background 0.15s" },
  fieldGroup:   { display: "flex", flexDirection: "column", gap: 6 },
  label:        { fontSize: 13, fontWeight: 600, color: "#243E36" },
  input:        { width: "100%", padding: "11px 14px", borderRadius: 9, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s", boxSizing: "border-box" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, minHeight: "100vh", minWidth: "100vw", background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,},
  modal:        { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" },
  modalHead:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e8f3ea", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  modalTitle:   { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" },
  modalClose:   { background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin     { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes growWidth{ from { width: 0 !important; } }
  .fade-up  { animation: fadeUp 0.4s ease both; }
  .bar-fill { animation: growWidth 0.8s ease both; }
  .stat-card:hover       { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(36,62,54,0.08); }
  .quick-card:hover      { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(36,62,54,0.08); }
  .nav-item:hover        { background: rgba(124,169,130,0.1) !important; color: rgba(241,247,237,0.85) !important; }
  .logout-btn:hover      { color: rgba(241,247,237,0.7) !important; }
  .primary-btn:hover     { background: #1a2e28 !important; }
  .approve-btn:hover     { background: #c8ddc9 !important; }
  .reject-btn:hover      { background: #f0a0a0 !important; }
  .filter-tab:hover      { background: #e8f3ea !important; }
  .icon-btn:hover        { background: #e8f3ea !important; }
  .icon-action-btn:hover { background: #e8f3ea !important; border-color: #c8ddc9 !important; }
  .labeled-action-btn:hover { filter: brightness(0.97); opacity: 0.9; }
  .danger-btn:hover      { background: #f5c5c5 !important; }
  .toggle-btn:hover      { opacity: 0.8; }
  .lms-input:focus       { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
  @media (max-width: 1100px) {
    div[style*="repeat(4, 1fr)"][style*="gap: 14"] { grid-template-columns: repeat(2,1fr) !important; }
    div[style*="repeat(6, 1fr)"] { grid-template-columns: repeat(3,1fr) !important; }
  }
  @media (max-width: 900px) {
    .sidebar   { position: fixed !important; top:0; left:0; bottom:0; transform: translateX(-100%); z-index:40; }
    .close-btn { display: flex !important; }
    .menu-btn  { display: flex !important; }
    div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
    div[style*="padding: 28px"] { padding: 16px !important; }
  }
  @media (max-width: 600px) {
    div[style*="repeat(6, 1fr)"] { grid-template-columns: repeat(2,1fr) !important; }
  }
`;
