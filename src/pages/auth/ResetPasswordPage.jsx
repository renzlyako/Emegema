import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../../services/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState(false);
  const [validSession,    setValidSession]    = useState(false);
  const [checking,        setChecking]        = useState(true);

  
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
        setChecking(false);
      }
    });

    
    setTimeout(() => setChecking(false), 2000);
  }, []);

  const handleReset = async () => {
    setError("");
    if (newPassword.length < 6)          { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword)  { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) { setError(updateError.message); return; }
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", display: "flex", alignItems: "center" };

  return (
    <div style={r.root}>
      <style>{css}</style>
      <div style={r.card} className="form-wrap">
        {/* Logo */}
        <div style={r.logo}>
          <div style={r.logoIcon}><BookOpen size={18} color="#7CA982" /></div>
          <span style={r.logoText}>EduSpace</span>
        </div>

        {checking ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 14, color: "#9ab5a0" }}>Verifying reset link…</p>
          </div>
        ) : success ? (
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0 8px" }}>
            <div style={{ width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={32} color="#7CA982" />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#243E36", marginBottom: 8 }}>Password Updated!</p>
              <p style={{ fontSize: 14, color: "#5a7a6e", lineHeight: 1.6 }}>Your password has been changed successfully.<br />Redirecting you to login…</p>
            </div>
          </div>
        ) : (
          
          <>
            <h1 style={r.heading}>Set New Password</h1>
            <p style={r.subheading}>Enter your new password below.</p>

            {error && (
              <div style={r.errorBox}>
                <AlertCircle size={14} color="#8b2020" /><span>{error}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* New Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={r.label}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showNew ? "text" : "password"} placeholder="At least 6 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    style={{ ...r.input, paddingRight: 44 }} className="lms-input" autoFocus />
                  <button type="button" onClick={() => setShowNew(v => !v)} style={eyeBtn}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={r.label}>Confirm New Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showConfirm ? "text" : "password"} placeholder="Re-enter new password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleReset()}
                    style={{ ...r.input, paddingRight: 44, borderColor: confirmPassword && confirmPassword !== newPassword ? "#e05252" : undefined }}
                    className="lms-input" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={eyeBtn}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p style={{ fontSize: 12, color: "#e05252", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={12} /> Passwords do not match
                  </p>
                )}
              </div>

              <button onClick={handleReset} disabled={loading}
                style={{ ...r.submitBtn, opacity: loading ? 0.75 : 1 }}
                className="submit-btn">
                {loading
                  ? <><span style={r.spinner} className="spinner" /> Updating…</>
                  : "Update Password"
                }
              </button>

              <button onClick={() => navigate("/login")}
                style={{ background: "none", border: "none", color: "#9ab5a0", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "center" }}>
                ← Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const r = {
  root:      { minHeight: "100vh", background: "#F1F7ED", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans', sans-serif" },
  card:      { background: "#fff", borderRadius: 18, padding: "40px 36px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(36,62,54,0.10)" },
  logo:      { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  logoIcon:  { width: 36, height: 36, background: "#e8f3ea", border: "1px solid #c8ddc9", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText:  { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, color: "#243E36" },
  heading:   { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#243E36", marginBottom: 8 },
  subheading:{ fontSize: 14, color: "#5a7a6e", marginBottom: 24 },
  errorBox:  { background: "#fce8e8", border: "1px solid #e08080", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#8b2020" },
  label:     { fontSize: 13, fontWeight: 600, color: "#243E36" },
  input:     { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
  submitBtn: { width: "100%", padding: "13px 0", background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" },
  spinner:   { width: 16, height: 16, border: "2px solid rgba(241,247,237,0.3)", borderTop: "2px solid #F1F7ED", borderRadius: "50%", display: "inline-block" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to { transform: rotate(360deg); } }
  .form-wrap { animation: fadeUp 0.5s ease both; }
  .spinner { animation: spin 0.75s linear infinite; }
  .lms-input:focus { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
  .submit-btn:hover:not(:disabled) { background: #1a2e28 !important; }
`;