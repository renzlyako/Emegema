// src/pages/legal/AccessibilityPage.jsx
// ─────────────────────────────────────────────
// DROP THIS FILE INTO: src/pages/legal/AccessibilityPage.jsx
// ─────────────────────────────────────────────

import LegalPageLayout from "./LegalPageLayout";

export default function AccessibilityPage() {
  return (
    <LegalPageLayout
      title="Accessibility"
      lastUpdated="August 5, 2026"
      currentPath="/accessibility"
    >
      <div className="legal-prose">
        <h2>Our Commitment</h2>
        <p>
          Emegema is used by students, teachers, and administrators with a range of needs and abilities. We want
          the platform to be usable by everyone, and we're working to make that consistently true across the
          entire system.
        </p>

        <h2>What We're Doing</h2>
        <p>As we continue to build and improve Emegema, we aim to:</p>
        <ul>
          <li>Use clear, readable text and sufficient color contrast throughout the platform</li>
          <li>Support keyboard navigation for core actions like signing in, submitting work, and viewing grades</li>
          <li>Use descriptive labels on forms, buttons, and interactive elements</li>
          <li>Keep layouts predictable and consistent across pages</li>
        </ul>

        <h2>Where We're Still Improving</h2>
        <p>
          Emegema is under active development, and not every part of the platform has been fully audited for
          accessibility yet. We don't currently claim full compliance with any specific standard (such as WCAG),
          but we treat accessibility as an ongoing responsibility rather than a one-time fix.
        </p>

        <h2>Let Us Know</h2>
        <p>
          If you use Emegema with assistive technology, or if any part of the platform is difficult for you to
          access or use, we want to hear about it. Reports from real users are the most effective way for us to
          find and fix accessibility gaps.
        </p>
        <p>
          Please contact your school administrator to report an accessibility issue, so it can be relayed to us
          with the context we need to address it.
        </p>
      </div>
    </LegalPageLayout>
  );
}
