// src/routes/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import logo from "../assets/logo.png";

// ─────────────────────────────────────────────
// ProtectedRoute
// ─────────────────────────────────────────────
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuthStore();


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
            <img src={logo} alt="Logo" style={{ width: 52, height: 52, objectFit: "contain" }} />
          </div>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Checking your session...</p>
        </div>
      </div>
    );
  }


  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    const roleRedirect = {
      admin:   "/admin/dashboard",
      teacher: "/teacher/dashboard",
      student: "/student/dashboard",
    };
    return <Navigate to={roleRedirect[profile?.role] ?? "/login"} replace />;
  }

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
