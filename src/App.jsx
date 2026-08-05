// src/App.jsx
// ─────────────────────────────────────────────
// REPLACE your entire src/App.jsx with this file
// ─────────────────────────────────────────────

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages
import LandingPage      from "./pages/auth/LandingPage";
import LoginPage        from "./pages/auth/LoginPage";
import ResetPasswordPage  from "./pages/auth/ResetPasswordPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import AdminDashboard   from "./pages/admin/AdminDashboard";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsPage         from "./pages/legal/TermsPage";
import AccessibilityPage from "./pages/legal/AccessibilityPage";

// Auth
import ProtectedRoute   from "./routes/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import { useInactivityLogout } from "./hooks/useInactivityLogout";

function RootRedirect() {
  const { user, profile, loading } = useAuthStore();

  if (loading) return null;

  if (user && profile) {
    const redirect = {
      admin:   "/admin/dashboard",
      teacher: "/teacher/dashboard",
      student: "/student/dashboard",
    };
    return <Navigate to={redirect[profile.role] ?? "/login"} replace />;
  }

  return <LandingPage />;
}

// ─────────────────────────────────────────────
export default function App() {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, []);

  useInactivityLogout();

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes ── */}
        <Route path="/"      element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ── Password reset (linked from email) ── */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ── Legal pages ── */}
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/accessibility" element={<AccessibilityPage />} />

        {/* ── Student routes ── */}
        <Route path="/student/dashboard" element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        } />

        {/* ── Teacher routes ── */}
        <Route path="/teacher/dashboard" element={
          <ProtectedRoute allowedRoles={["teacher"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        } />

        {/* ── Admin routes ── */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
