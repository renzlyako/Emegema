// src/pages/auth/LoginPage.jsx
// ─────────────────────────────────────────────
// DROP THIS FILE INTO: src/pages/auth/LoginPage.jsx
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, BookOpen, ArrowRight, AlertCircle, X, TrendingUp, ClipboardCheck, UploadCloud, Settings2, Megaphone } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../services/supabase";
import { Turnstile } from "@marsidev/react-turnstile";
import logo from "../../assets/logo.png";
import splitImg from "../../assets/split.png";

const loginSchema = z.object({
  email:    z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const ROLE_REDIRECT = {
  admin:   "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

const HERO_CARDS = [
  { icon: "grades",   title: "Full grade transparency", desc: "Students see every score, anytime, no more guessing where they stand.", tag: "Real-time" },
  { icon: "assess",   title: "Online assessments",      desc: "Quizzes and exams taken online, auto-graded the moment students submit.", tag: "Auto-graded" },
  { icon: "submit",   title: "Assignment submission",   desc: "Submit work directly through the platform, no lost papers, no excuses.", tag: "Paperless" },
  { icon: "config",   title: "Configurable grading",    desc: "Teachers set their own grading weights for quizzes, exams, and activities.", tag: "Flexible" },
  { icon: "announce", title: "Class announcements",     desc: "Teachers post updates that reach every student instantly.", tag: "Instant" },
];

const HERO_ICON_MAP = {
  grades:   TrendingUp,
  assess:   ClipboardCheck,
  submit:   UploadCloud,
  config:   Settings2,
  announce: Megaphone,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const signIn   = useAuthStore(state => state.signIn);
  const { user, profile, isRecovering } = useAuthStore();
  const [searchParams] = useSearchParams();
  const loggedOutFromInactivity = searchParams.get("reason") === "inactivity";

 
  useEffect(() => {
    if (isRecovering) return; 
    if (user && profile) {
      const redirect = {
        admin:   "/admin/dashboard",
        teacher: "/teacher/dashboard",
        student: "/student/dashboard",
      };
      navigate(redirect[profile.role] ?? "/student/dashboard", { replace: true });
    }
  }, [user, profile, navigate]);

  const [cardIndex, setCardIndex] = useState(0); useEffect(() => {
  const interval = setInterval(() => { setCardIndex(prev => (prev + 1) % HERO_CARDS.length); }, 4800); return () => clearInterval(interval); }, []);
  const goPrev = () => setCardIndex(prev => (prev - 1 + HERO_CARDS.length) % HERO_CARDS.length);
  const goNext = () => setCardIndex(prev => (prev + 1) % HERO_CARDS.length);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError]   = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [showForgot,  setShowForgot]    = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (formData) => {
      if (!captchaToken) {
        setServerError("Please complete the verification check.");
        return;
      }
      setIsLoading(true);
      setServerError("");
      const { error, role } = await signIn(formData.email, formData.password, captchaToken);
      if (error) {
        setServerError(error.message);
        setIsLoading(false);
        return;
      }
      navigate(ROLE_REDIRECT[role] ?? "/student/dashboard", { replace: true });
    };

  return (
    <div style={st.root}>
      <style>{css}</style>

      {/* Left panel */}
      <div style={st.leftPanel}>
        <div style={st.leftInner}>
          <a href="/" style={st.logo}>
            <div className="logo-glow-wrap">
              <img src={logo} alt="Emegema logo" style={{ width: 38, height: 38, objectFit: "contain", position: "relative", zIndex: 1 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, color: "#F1F7ED", letterSpacing: "0.03em", lineHeight: 1, margin: 0 }}>EMEGEMA</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 10, color: "rgba(124,169,130,0.8)", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1, margin: 0 }}>Integrated Learning Hub</p>
            </div>
          </a>

          <div style={st.heroCardCenter}>
            <div style={st.heroCardWrap}>
              {HERO_CARDS.map((card, i) => {
                const diff = (i - cardIndex + HERO_CARDS.length) % HERO_CARDS.length;
                let transform = "translateX(60%)";
                let opacity = 0;
                if (diff === 0) { transform = "translateX(0)"; opacity = 1; }
                else if (diff === HERO_CARDS.length - 1) { transform = "translateX(-60%)"; opacity = 0; }
                const Icon = HERO_ICON_MAP[card.icon];
                return (
                  <div key={card.title} style={{ ...st.heroCard, transform, opacity }}>
                    <div style={st.heroCardIconRow}>
                      <Icon size={22} color="#7CA982" />
                      <span style={st.heroCardTag}>{card.tag}</span>
                    </div>
                    <p style={st.heroCardTitle}>{card.title}</p>
                    <p style={st.heroCardDesc}>{card.desc}</p>
                  </div>
                );
              })}
            </div>
            <div style={st.heroCardNavRow}>
              <button onClick={goPrev} style={st.heroCardNavBtn} aria-label="Previous">‹</button>
              <div style={st.heroCardDots}>
                {HERO_CARDS.map((card, i) => (
                  <span
                    key={card.title}
                    onClick={() => setCardIndex(i)}
                    style={{ ...st.heroCardDot, ...(i === cardIndex ? st.heroCardDotActive : {}) }}
                  />
                ))}
              </div>
              <button onClick={goNext} style={st.heroCardNavBtn} aria-label="Next">›</button>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={st.rightPanel}>
        <div style={st.formWrap} className="form-wrap">
          <h1 style={st.heading}>Welcome back</h1>
          <p style={st.subheading}>Sign in to your Emegema account</p>

          {loggedOutFromInactivity && !serverError && (
            <div style={st.infoBox}>
              <AlertCircle size={15} color="#7a5c00" /><span>You were signed out due to inactivity. Please sign in again.</span>
            </div>
          )}

          {serverError && (
            <div style={st.errorBox} className="error-shake">
              <AlertCircle size={15} color="#8b2020" /><span>{serverError}</span>
            </div>
          )}

          <div style={st.form}>
            <div style={st.fieldGroup}>
              <label style={st.label} htmlFor="email">Email address</label>
              <input id="email" type="email" placeholder="you@school.com" autoComplete="email"
                style={{ ...st.input, ...(errors.email ? st.inputError : {}) }}
                className="lms-input" {...register("email")} />
              {errors.email && <span style={st.fieldError}>{errors.email.message}</span>}
            </div>

            <div style={st.fieldGroup}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={st.label} htmlFor="password">Password</label>
                <button type="button" onClick={() => setShowForgot(true)} style={st.forgotLink}>Forgot password?</button>
              </div>
              <div style={st.passwordWrap}>
                <input id="password" type={showPassword ? "text" : "password"}
                  placeholder="••••••••" autoComplete="current-password"
                  style={{ ...st.input, paddingRight: 48, ...(errors.password ? st.inputError : {}) }}
                  className="lms-input" {...register("password")} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={st.eyeBtn} tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span style={st.fieldError}>{errors.password.message}</span>}
            </div>


            <Turnstile
            siteKey="0x4AAAAAAEEK3ajOywdCrhSj"
            onSuccess={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken("")}
            options={{ theme: "light" }}
            />
            <button type="button" onClick={handleSubmit(onSubmit)} disabled={isLoading}
              style={{ ...st.submitBtn, ...(isLoading ? st.submitBtnLoading : {}) }}
              className="submit-btn">
              {isLoading
                ? <><span style={st.spinner} className="spinner" /> Signing in…</>
                : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </div>

          {/* Footer note — no public registration */}
          <p style={st.footerNote}>
            Access is by invitation only. Contact your administrator if you need an account.
          </p>
        </div>
      </div>
            {showForgot && (
        <ForgotPasswordModal onClose={() => setShowForgot(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL: FORGOT PASSWORD
// ─────────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSend = async () => {
      setError("");
      if (!email.trim())              { setError("Please enter your email address."); return; }
      if (!email.includes("@"))       { setError("Please enter a valid email address."); return; }
      if (!captchaToken)               { setError("Please complete the verification check."); return; }
 
      setLoading(true);
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
          captchaToken,
        });
        if (resetError) { setError(resetError.message); return; }
        setSent(true);
      } catch (e) {
        setError(e.message || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

  return (
    <div style={fm.overlay} onClick={onClose}>
      <div style={fm.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={fm.header}>
          <img src={logo} alt="EMEGEMA logo" style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <h2 style={fm.title}>Reset Password</h2>
            <p style={fm.subtitle}>We'll send a reset link to your email</p>
          </div>
          <button style={fm.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={fm.body}>
          {sent ? (
            /* ── Success State ── */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "8px 0 8px" }}>
              <div style={{ width: 64, height: 64, background: "#e8f3ea", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowRight size={28} color="#7CA982" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#243E36", marginBottom: 8 }}>Check your email!</p>
                <p style={{ fontSize: 13, color: "#5a7a6e", lineHeight: 1.6 }}>
                  We sent a password reset link to <br />
                  <strong style={{ color: "#243E36" }}>{email}</strong>
                </p>
                <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 10, lineHeight: 1.6 }}>
                  Click the link in the email to set your new password. Check your spam folder if you don't see it.
                </p>
              </div>
              <button
                style={{ ...fm.submitBtn, width: "100%" }}
                onClick={onClose}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            /* ── Form State ── */
            <>
              {error && (
                <div style={{ background: "#fce8e8", border: "1px solid #e08080", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8b2020", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
              <label style={fm.label}>Email Address</label>
              <input
                type="email"
                placeholder="you@school.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                style={fm.input}
                className="lms-input"
                autoFocus
              />
              <p style={{ fontSize: 12, color: "#9ab5a0", marginTop: 8, lineHeight: 1.5 }}>
                Enter the email address linked to your EMEGEMA account.
              </p>
            </div>
 
            <div style={{ marginBottom: 20 }}>
              <Turnstile
                siteKey="0x4AAAAAAEEK3ajOywdCrhSj"
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken("")}
                options={{ theme: "light" }}
              />
            </div>
 
    <div style={{ display: "flex", gap: 10 }}>
                <button style={fm.cancelBtn} onClick={onClose} className="cancel-btn">Cancel</button>
                <button
                  style={{ ...fm.submitBtn, flex: 2, opacity: loading ? 0.7 : 1 }}
                  onClick={handleSend}
                  disabled={loading}
                >
                  {loading
                    ? <><span style={st.spinner} className="spinner" /> Sending…</>
                    : <><ArrowRight size={15} /> Send Reset Link</>
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

// Forgot password modal styles
const fm = {
  overlay:   { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:     { background: "#fff", borderRadius: 18, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", fontFamily: "'DM Sans', sans-serif" },
  header:    { display: "flex", alignItems: "center", gap: 14, padding: "22px 24px 0" },
  headerIcon:{ width: 44, height: 44, background: "#e8f3ea", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title:     { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#243E36" },
  subtitle:  { fontSize: 13, color: "#9ab5a0", marginTop: 2 },
  closeBtn:  { background: "none", border: "none", cursor: "pointer", color: "#9ab5a0", marginLeft: "auto", display: "flex", alignItems: "center", padding: 4 },
  body:      { padding: "20px 24px 24px" },
  label:     { fontSize: 13, fontWeight: 600, color: "#243E36", display: "block", marginBottom: 8 },
  input:     { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #c8ddc9", background: "#fafcfa", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
  cancelBtn: { flex: 1, padding: "11px 0", border: "1.5px solid #e8f3ea", borderRadius: 9, background: "#fff", color: "#5a7a6e", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s" },
  submitBtn: { flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", border: "none", borderRadius: 9, background: "#243E36", color: "#F1F7ED", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "background 0.2s" },
};

const st = {
  root: { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#F1F7ED" },
  leftPanel: {
    flex: 1,
    background: `linear-gradient(to top, rgba(36,62,54,0.92) 0%, rgba(36,62,54,0.5) 45%, rgba(36,62,54,0.25) 100%), url(${splitImg})`,
    backgroundSize: "cover",
    backgroundPosition: "center 30%",
    backgroundRepeat: "no-repeat",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  leftInner: { padding: "40px 48px", display: "flex", flexDirection: "column", height: "100%", position: "relative", zIndex: 1 },
  logo: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
  logoIcon: { width: 38, height: 38, background: "rgba(124,169,130,0.15)", border: "1px solid rgba(124,169,130,0.3)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20, color: "#F1F7ED" },
  quoteWrap: { marginTop: 0, marginBottom: 0, paddingTop: 0 },
  quoteMark: { fontFamily: "'Playfair Display', serif", fontSize: 96, lineHeight: 0.8, color: "#7CA982", opacity: 0.4, marginBottom: 16 },
  quoteText: { fontFamily: "'Playfair Display', serif", fontSize: 26, lineHeight: 1.5, color: "#F1F7ED", fontStyle: "italic", maxWidth: 420, marginBottom: 20 },
  quoteAuthor: { fontSize: 13, color: "rgba(241,247,237,0.5)", fontWeight: 500 },
  floatCard: { position: "absolute", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(124,169,130,0.25)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)" },
  floatDot: { width: 8, height: 8, background: "#7CA982", borderRadius: "50%", display: "inline-block", flexShrink: 0 },
  floatLabel: { fontSize: 12, color: "rgba(241,247,237,0.75)", fontWeight: 500, whiteSpace: "nowrap" },
  heroCardCenter: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 },
  heroCardNavRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16 },
  heroCardNavBtn: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(124,169,130,0.3)", color: "#F1F7ED", width: 34, height: 34, borderRadius: "50%", fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" },
  heroCardDots: { display: "flex", alignItems: "center", gap: 8 },
  heroCardDot: { width: 7, height: 7, borderRadius: "50%", background: "rgba(124,169,130,0.35)", cursor: "pointer", transition: "background 0.3s, transform 0.3s" },
  heroCardDotActive: { background: "#7CA982", transform: "scale(1.3)" },
  heroCardWrap: { position: "relative", width: 420, height: 230, overflow: "hidden" },
  heroCard: {
    position: "absolute", inset: 0,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(124,169,130,0.25)",
    borderRadius: 16, padding: "28px 30px",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left",
    transition: "transform 1s cubic-bezier(0.4,0,0.2,1), opacity 1s ease",
  },
  heroCardIconRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  heroCardTag: { fontSize: 10.5, fontWeight: 700, color: "#c8ddc9", background: "rgba(124,169,130,0.2)", padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" },
  heroCardTitle: { fontSize: 18, fontWeight: 700, color: "#F1F7ED", fontFamily: "'Playfair Display', serif", margin: "0 0 10px" },
  heroCardDesc: { fontSize: 13.5, color: "rgba(241,247,237,0.65)", margin: 0, lineHeight: 1.6 },rightPanel: { width: "100%", maxWidth: 480, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", background: "#F1F7ED" },
  formWrap: { width: "100%", maxWidth: 380 },
  heading: { fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 800, color: "#243E36", marginBottom: 8 },
  subheading: { fontSize: 15, color: "#5a7a6e", marginBottom: 28 },
  errorBox: { background: "#fce8e8", border: "1px solid #e08080", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#8b2020" },
  infoBox: { background: "#fff8e1", border: "1px solid #f0d060", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#7a5c00" },
  form: { display: "flex", flexDirection: "column", gap: 20 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#243E36" },
  input: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #c8ddc9", background: "#fff", fontSize: 14, color: "#243E36", outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s, box-shadow 0.2s" },
  inputError: { borderColor: "#e08080", background: "#fff8f8" },
  fieldError: { fontSize: 12, color: "#c0392b", fontWeight: 500 },
  passwordWrap: { position: "relative" },
  eyeBtn: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7CA982", padding: 0, display: "flex", alignItems: "center" },
  forgotLink: { fontSize: 12, color: "#7CA982", textDecoration: "none", fontWeight: 500, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: 0 },
  submitBtn: { width: "100%", padding: "13px 0", background: "#243E36", color: "#F1F7ED", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s", marginTop: 4 },
  submitBtnLoading: { opacity: 0.75, cursor: "not-allowed" },
  spinner: { width: 16, height: 16, border: "2px solid rgba(241,247,237,0.3)", borderTop: "2px solid #F1F7ED", borderRadius: "50%", display: "inline-block" },
  footerNote: { textAlign: "center", fontSize: 12, color: "#9ab5a0", marginTop: 28, lineHeight: 1.6 },
};

const css = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap');
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
      .lms-input:focus { border-color: #7CA982 !important; box-shadow: 0 0 0 3px rgba(124,169,130,0.15); }
  .submit-btn:hover:not(:disabled) { background: #1a2e28 !important; transform: translateY(-1px); }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { animation: spin 0.75s linear infinite; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  .error-shake { animation: shake 0.4s ease; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  .form-wrap { animation: fadeUp 0.5s ease both; }
  @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
  @keyframes floatC { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  .float-card   { animation: floatA 4s ease-in-out infinite; }
  .float-card-2 { animation: floatB 5s ease-in-out infinite 0.8s; }
  .float-card-3 { animation: floatC 3.5s ease-in-out infinite 1.5s; }
  @media (max-width: 768px) {
    div[style*="flex: 1"][style*="background: rgb(36"] { display: none !important; }
  }
`;
