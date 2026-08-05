import { useState, useEffect } from "react";
import { BookOpen, Users, Award, ArrowRight, CheckCircle, Menu, X, Layers, Bell, FileText } from "lucide-react";
import logo from "../../assets/logo.png";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const highlights = [
    { icon: <Layers size={18} color="#7CA982" />, label: "Course Management" },
    { icon: <FileText size={18} color="#7CA982" />, label: "Assignments & Submissions" },
    { icon: <Award size={18} color="#7CA982" />, label: "Grading System" },
    { icon: <Bell size={18} color="#7CA982" />, label: "Announcements" },
    { icon: <Users size={18} color="#7CA982" />, label: "Role-Based Access" },
    { icon: <CheckCircle size={18} color="#7CA982" />, label: "Secure by Default" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#F1F7ED", color: "#243E36", overflowX: "hidden", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
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

        .nav-link {
          color: #243E36;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .nav-link:hover { opacity: 1; }

        .btn-primary {
          background: #243E36;
          color: #F1F7ED;
          border: none;
          border-radius: 10px;
          padding: 12px 28px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.2s, transform 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .btn-primary:hover { background: #1a2e28; transform: translateY(-1px); }
        .btn-primary svg { transition: transform 0.2s ease; }
        .btn-primary:hover svg { transform: translateX(4px); }

        .btn-outline {
          background: transparent;
          color: #243E36;
          border: 1.5px solid #243E36;
          border-radius: 10px;
          padding: 11px 28px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .btn-outline:hover { background: #243E36; color: #F1F7ED; }

        .highlight-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #d4e6d5;
          border-radius: 99px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 600;
          color: #243E36;
          white-space: nowrap;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .highlight-pill:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 14px rgba(36,62,54,0.12);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .delay-1 { animation-delay: 0.08s; }
        .delay-2 { animation-delay: 0.16s; }
        .delay-3 { animation-delay: 0.24s; }
        .delay-4 { animation-delay: 0.32s; }

        @keyframes underlineSweep {
          from { width: 0%; }
          to { width: 100%; }
        }
        .underline-sweep {
          position: absolute;
          left: 0;
          bottom: 2px;
          height: 3px;
          background: #7CA982;
          width: 0%;
          animation: underlineSweep 0.6s ease 0.55s both;
        }

        @keyframes underlineSweep {
          from { width: 0%; }
          to { width: 100%; }
        }
        .underline-sweep {
          position: absolute;
          left: 0;
          bottom: 2px;
          height: 3px;
          background: #7CA982;
          width: 0%;
          animation: underlineSweep 0.6s ease 0.55s both;
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 34px !important; }
          .nav-links { display: none !important; }
          .nav-ctas { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .highlights-row { overflow-x: auto !important; justify-content: flex-start !important; padding-bottom: 4px; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: "relative", zIndex: 100,
        background: scrolled ? "rgba(241,247,237,0.92)" : "transparent",
        borderBottom: "1px solid #d4e6d5",
        padding: "0 5%",
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="logo-glow-wrap">
              <img src={logo} alt="Emegema logo" style={{ width: 34, height: 34, objectFit: "contain", position: "relative", zIndex: 1 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15, color: "#243E36", letterSpacing: "0.03em", lineHeight: 1, margin: 0 }}>EMEGEMA</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 9, color: "#7CA982", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1, margin: 0 }}>Integrated Learning Hub</p>
            </div>
          </div>

          <div className="nav-ctas" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/login" className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>Log in</a>
          </div>

          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: "#243E36", alignItems: "center" }}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div style={{ background: "#F1F7ED", borderTop: "1px solid #d4e6d5", padding: "16px 5%", display: "flex", gap: 12 }}>
            <a href="/login" className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>Log in</a>
          </div>
        )}
      </nav>

      {/* ─── HERO (fills remaining space) ─── */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 5%", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          <h1
            className="hero-title fade-up delay-1"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1.15,
              color: "#243E36",
              marginBottom: 18,
              letterSpacing: "-0.02em",
            }}
          >
            Learning made{" "}
            <span style={{ position: "relative", display: "inline-block", color: "#7CA982", fontStyle: "italic" }}>
              simple
              <span className="underline-sweep" />
            </span>
            {" "}& organized
          </h1>

          <p className="fade-up delay-2" style={{ fontSize: 16, lineHeight: 1.6, color: "#5a7a6e", marginBottom: 32, maxWidth: 520, margin: "0 auto 32px" }}>
            EduSpace is your private learning hub manage courses, assignments, grades, and announcements all in one clean place.
          </p>

          <div className="fade-up delay-3" style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 12.5, color: "#9ab5a0" }}>
              Access is by invitation only. Contact your administrator if you need an account.
            </p>
          </div>

          {/* Compact highlights row instead of full feature sections */}
          <div className="highlights-row fade-up delay-4" style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {highlights.map(h => (
              <div key={h.label} className="highlight-pill">
                {h.icon} {h.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SLIM FOOTER ─── */}
      <footer style={{ background: "#243E36", padding: "14px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src={logo} alt="Emegema logo" style={{ width: 24, height: 24, objectFit: "contain" }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: "#F1F7ED" }}>Emegema</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <p style={{ color: "rgba(241,247,237,0.4)", fontSize: 11 }}>© 2026 Emegema · Built for educators and students</p>
          <a href="/privacy-policy" style={{ color: "rgba(241,247,237,0.5)", fontSize: 11, textDecoration: "underline" }}>Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}
