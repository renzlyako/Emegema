// src/pages/legal/LegalPageLayout.jsx
// ─────────────────────────────────────────────

import { ArrowLeft } from "lucide-react";
import logo from "../../assets/logo.png";

const LEGAL_LINKS = [
  { label: "Privacy Policy",   href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Accessibility",    href: "/accessibility" },
];

export default function LegalPageLayout({ title, lastUpdated, currentPath, children }) {
  return (
    <div style={s.root}>
      <style>{css}</style>

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <a href="/" style={s.logo}>
            <div className="logo-glow-wrap">
              <img src={logo} alt="Emegema logo" style={{ width: 30, height: 30, objectFit: "contain", position: "relative", zIndex: 1 }} />
            </div>
            <span style={s.logoText}>EMEGEMA</span>
          </a>
          <a href="/" style={s.backLink} className="back-home-btn">
            <ArrowLeft size={15} /> Back to home
          </a>
        </div>
      </header>

      {/* Body */}
      <div style={s.body}>
        {/* Side nav */}
        <nav style={s.sideNav}>
          <p style={s.sideNavLabel}>Legal</p>
          {LEGAL_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              style={{ ...s.sideNavLink, ...(currentPath === link.href ? s.sideNavLinkActive : {}) }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Content */}
        <main style={s.content}>
          <h1 style={s.title}>{title}</h1>
          {lastUpdated && <p style={s.lastUpdated}>Last updated: {lastUpdated}</p>}
          <div style={s.prose}>{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer style={s.footer}>
        <p style={s.footerText}>© 2026 Emegema · Built for educators</p>
      </footer>
    </div>
  );
}

const s = {
  root: { fontFamily: "'DM Sans', sans-serif", background: "#F1F7ED", color: "#243E36", minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { borderBottom: "1px solid #d4e6d5", padding: "0 5%", flexShrink: 0 },
  headerInner: { maxWidth: 1100, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 9, textDecoration: "none" },
  logoText: { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, color: "#243E36", letterSpacing: "0.03em" },
  backLink: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#243E36", textDecoration: "none", border: "1.5px solid #243E36", borderRadius: 10, padding: "8px 18px", transition: "all 0.2s" },

  body: { flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", gap: 48, padding: "48px 5% 64px", alignItems: "flex-start" },
  sideNav: { width: 180, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 24 },
  sideNavLabel: { fontSize: 11, fontWeight: 700, color: "#9ab5a0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 },
  sideNavLink: { fontSize: 13.5, fontWeight: 500, color: "#5a7a6e", textDecoration: "none", padding: "7px 0" },
  sideNavLinkActive: { color: "#243E36", fontWeight: 700 },

  content: { flex: 1, minWidth: 0, maxWidth: 680 },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 800, color: "#243E36", marginBottom: 6 },
  lastUpdated: { fontSize: 13, color: "#9ab5a0", marginBottom: 32 },
  prose: { fontSize: 14.5, lineHeight: 1.75, color: "#3d5a4f" },

  footer: { background: "#243E36", padding: "14px 5%", flexShrink: 0 },
  footerText: { color: "rgba(241,247,237,0.4)", fontSize: 11, textAlign: "center" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
  @keyframes logoPulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(124,169,130,0.5); }
    50%      { box-shadow: 0 0 0 6px rgba(124,169,130,0); }
  }
  .logo-glow-wrap {
    position: relative; display: flex; align-items: center; justify-content: center;
    border-radius: 8px; animation: logoPulseGlow 2.2s ease-in-out infinite; flex-shrink: 0;
  }
  .back-home-btn:hover { background: #243E36; color: #F1F7ED !important; }
  .legal-prose h2 { font-family: 'Playfair Display', serif; font-size: 19px; font-weight: 700; color: #243E36; margin: 32px 0 10px; }
  .legal-prose h2:first-child { margin-top: 0; }
  .legal-prose p { margin: 0 0 14px; }
  .legal-prose ul { margin: 0 0 14px; padding-left: 20px; }
  .legal-prose li { margin-bottom: 6px; }
  .legal-prose strong { color: #243E36; }
  .legal-prose a { color: #4a7c59; }
  @media (max-width: 768px) {
    .legal-body-sidenav { display: none !important; }
  }
`;
