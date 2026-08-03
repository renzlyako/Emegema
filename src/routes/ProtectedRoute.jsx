// src/routes/ProtectedRoute.jsx
// ─────────────────────────────────────────────
// DROP THIS FILE INTO: src/routes/ProtectedRoute.jsx
// (Create the "routes" folder inside src/ if it doesn't exist)
// ─────────────────────────────────────────────

import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// ─────────────────────────────────────────────
// ProtectedRoute
//
// Usage:
//   <ProtectedRoute allowedRoles={["admin"]}>
//     <AdminDashboard />
//   </ProtectedRoute>
//
// allowedRoles: array of roles that can access this route
//   e.g. ["admin"] — only admin
//   e.g. ["teacher", "admin"] — teacher OR admin
//   e.g. undefined — any logged-in user
// ─────────────────────────────────────────────
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuthStore();

  // ── Still checking session ──
  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&display=swap');
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
        <div style={styles.loadingInner}>
          <div style={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7CA982" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Checking your session...</p>
        </div>
      </div>
    );
  }

  // ── Not logged in → go to login ──
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ── Logged in but wrong role → go to their own dashboard ──
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    const roleRedirect = {
      admin:   "/admin/dashboard",
      teacher: "/teacher/dashboard",
      student: "/student/dashboard",
    };
    return <Navigate to={roleRedirect[profile?.role] ?? "/login"} replace />;
  }

  // ── All good → render the page ──
  return children;
}

const styles = {
  loadingWrap: {
    minHeight: "100vh",
    background: "#F1F7ED",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
    animation: "fadeIn 0.3s ease",
  },
  loadingInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  logoIcon: {
    width: 52,
    height: 52,
    background: "#243E36",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  spinner: {
    width: 28,
    height: 28,
    border: "3px solid #d4e6d5",
    borderTop: "3px solid #7CA982",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 14,
    color: "#9ab5a0",
    fontWeight: 500,
  },
};
