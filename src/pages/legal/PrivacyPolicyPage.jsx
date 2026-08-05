// src/pages/legal/PrivacyPolicyPage.jsx
// ─────────────────────────────────────────────
// DROP THIS FILE INTO: src/pages/legal/PrivacyPolicyPage.jsx
// ─────────────────────────────────────────────

import LegalPageLayout from "./LegalPageLayout";

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="August 5, 2026"
      currentPath="/privacy-policy"
    >
      <div className="legal-prose">
        <h2>1. Introduction</h2>
        <p>
          Emegema ("we," "us," "the platform") is a Learning Management System (LMS) built for use by schools,
          teachers, and students. This Privacy Policy explains what information we collect, why we collect it,
          and how you can request that it be deleted.
        </p>
        <p>
          Emegema does not offer public self-registration. Every account is created by a school administrator
          or teacher on behalf of the person using it. If you are a student or parent with questions about an
          account, your first point of contact should be your school's administrator or teacher.
        </p>

        <h2>2. Information We Collect</h2>
        <p><strong>Account information</strong></p>
        <ul>
          <li>Full name</li>
          <li>Email address</li>
          <li>Role (administrator, teacher, or student)</li>
        </ul>

        <p><strong>Academic information</strong></p>
        <p>Depending on your role, we may also process:</p>
        <ul>
          <li>Course enrollment and course content created by teachers</li>
          <li>Assessment and quiz answers, scores, and feedback</li>
          <li>Assignment submissions (files, written answers, or links)</li>
          <li>Grades and gradebook entries</li>
          <li>Attendance records</li>
          <li>Class announcements</li>
        </ul>

        <p><strong>Activity information</strong></p>
        <ul>
          <li>
            An audit trail of certain administrative actions, such as when an account is created or deleted, or
            when a grade is changed, including who performed the action and when. This exists to keep account
            management and grading accountable and traceable.
          </li>
          <li>
            Last login timestamps, which a teacher can see for students enrolled in their own courses.
          </li>
        </ul>

        <p><strong>Security information</strong></p>
        <ul>
          <li>Basic technical information used to protect accounts from abuse, such as bot-verification checks (see Section 5, Cookies).</li>
        </ul>

        <p>We do not collect payment information, government ID numbers, or any information beyond what's needed to operate the platform.</p>

        <h2>3. Why We Collect This Information</h2>
        <p>We collect and use this information only to operate the core functions of the platform:</p>
        <ul>
          <li>To create and manage your account and let you sign in</li>
          <li>To let teachers create courses, assignments, and assessments</li>
          <li>To let students submit work and view their own grades and feedback</li>
          <li>To let administrators manage accounts and oversee platform activity within their school</li>
          <li>To maintain an accurate, tamper-evident record of account changes and grading, for fairness and accountability</li>
          <li>To protect the platform from spam, bots, and unauthorized access</li>
        </ul>
        <p>
          We do not sell your information. We do not use your information for advertising, and we do not share
          it with third parties for marketing purposes.
        </p>

        <h2>4. Who Can See Your Information</h2>
        <p>Access to information is limited by role:</p>
        <ul>
          <li><strong>Students</strong> can see their own grades, feedback, submissions, and attendance. They cannot see other students' data.</li>
          <li><strong>Teachers</strong> can see the data of students enrolled in their own courses, including last login timestamps for those students.</li>
          <li><strong>Administrators</strong> can see account and activity information across the school, including the audit trail of user creation, deletion, and grade changes, in order to manage the platform and support users.</li>
        </ul>

        <h2>5. Cookies and Similar Technology</h2>
        <p>Emegema uses only the cookies and local storage necessary for the platform to function and stay secure:</p>
        <ul>
          <li><strong>Session/login cookies</strong>, to keep you signed in.</li>
          <li><strong>Bot-verification (Cloudflare Turnstile)</strong>, used on the login and password-reset forms to prevent automated abuse.</li>
        </ul>
        <p>
          We do not use cookies for advertising or third-party tracking, and we do not currently use analytics
          cookies. Because we only use strictly necessary cookies, we don't show a cookie consent banner — but
          you're welcome to contact us if you'd like more detail on what's stored.
        </p>

        <h2>6. How Long We Keep Information</h2>
        <p>
          We keep account and academic information for as long as the account is active, and for a reasonable
          period afterward to preserve academic records (for example, so a student's past grades remain available
          to their school). Specific retention periods are set by the school or institution using Emegema.
        </p>

        <h2>7. How to Request Deletion of Your Data</h2>
        <p>
          Because Emegema accounts are created and managed by your school (not self-registered), account and data
          deletion is handled by your school administrator, who can delete accounts directly within the platform.
          If you're a student or teacher who wants your account or data removed, contact your school administrator
          to make the request.
        </p>
        <p>
          When an account is deleted, associated personal data is removed in accordance with the school's data
          retention requirements.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we'll update the
          "Last updated" date above.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or how your information is handled, contact your school
          administrator.
        </p>
      </div>
    </LegalPageLayout>
  );
}
