// src/pages/legal/TermsPage.jsx
// ─────────────────────────────────────────────
// DROP THIS FILE INTO: src/pages/legal/TermsPage.jsx
// ─────────────────────────────────────────────

import LegalPageLayout from "./LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      lastUpdated="August 5, 2026"
      currentPath="/terms"
    >
      <div className="legal-prose">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Emegema ("the platform"), you agree to these Terms & Conditions. If you do not
          agree, do not use the platform.
        </p>
        <p>
          Emegema is not affiliated with, operated by, or connected to any school. Teachers use Emegema
          independently to organize and manage their own classes.
        </p>

        <h2>2. Eligibility and Account Creation</h2>
        <p>
          Emegema does not offer public self-registration for students. Student accounts are created by a
          teacher. Teacher accounts may be created by the teacher themselves, subject to approval by Emegema's
          administrator, or created directly by Emegema's administrator.
        </p>
        <p>
          By creating a student account, the teacher represents and warrants that they have obtained any consent
          required to do so, including consent from a parent or guardian if the student is a minor. Emegema
          relies on this representation and does not independently verify a student's age or consent status —
          see Section 3 below.
        </p>
        <p>
          You are responsible for keeping your login credentials confidential and for all activity that happens
          under your account. Tell us immediately if you believe your account has been accessed without your
          permission.
        </p>

        <h2>3. Teacher Responsibility for Student Accounts</h2>
        <p>Teachers are solely responsible for:</p>
        <ul>
          <li>Determining whether a student they are adding to Emegema is a minor</li>
          <li>Obtaining consent from the student's parent or guardian before creating the student's account, where the student is a minor</li>
          <li>Ensuring the accuracy of the name and email address provided for each student</li>
          <li>Using student data only for legitimate teaching purposes within their own classes</li>
        </ul>
        <p>
          Emegema may suspend or remove a student account at any time if we have reason to believe it was created
          without appropriate consent.
        </p>

        <h2>4. User Roles and Responsibilities</h2>
        <p>Emegema has three types of accounts, each with different capabilities and responsibilities.</p>

        <p><strong>Administrator</strong></p>
        <ul>
          <li>Operates and oversees the Emegema platform</li>
          <li>Approves teacher accounts</li>
          <li>Can view account information as needed to operate, secure, and support the platform</li>
          <li>Acts on account deletion requests</li>
        </ul>

        <p><strong>Teachers</strong></p>
        <ul>
          <li>Create student accounts, subject to Section 3 above</li>
          <li>Create and manage their own classes, assignments, quizzes, and activities</li>
          <li>Mark attendance and record grades for their own students</li>
          <li>Communicate with their own students through the platform</li>
        </ul>
        <p>
          Teachers are responsible for the accuracy of grades and content they post, and for using student data
          only for legitimate teaching purposes within their own classes.
        </p>

        <p><strong>Students</strong></p>
        <ul>
          <li>Answer and submit quizzes, exams, activities, and assignments</li>
          <li>View their own grades and attendance</li>
          <li>Communicate with their teacher through the platform</li>
        </ul>
        <p>
          Students are responsible for the work they submit and for keeping their own account credentials
          private.
        </p>

        <h2>5. Acceptable Use</h2>
        <p>When using Emegema, you agree not to:</p>
        <ul>
          <li>Share your account or login credentials with anyone else</li>
          <li>Attempt to access another user's account or data without authorization</li>
          <li>Attempt to bypass, disable, or interfere with the platform's security features</li>
          <li>Upload or submit content that is unlawful, harassing, or infringes someone else's rights</li>
          <li>Use the platform for any purpose unrelated to teaching or learning</li>
        </ul>
        <p>
          Accounts found to violate acceptable use may be suspended or deleted by the administrator.
        </p>

        <h2>6. Content Ownership</h2>
        <p>
          Course materials, assignments, quizzes, and activities created by a teacher remain that teacher's
          content. Work submitted by a student remains that student's content. By submitting content to
          Emegema, you grant the platform the right to store, display, and process it as needed to provide the
          service — for example, showing a submission to the teacher who assigned it, or displaying a grade to
          the student who earned it.
        </p>

        <h2>7. Account Deletion</h2>
        <p>
          You can request deletion of your account at any time using the "Request Account Deletion" feature
          after logging in. This sends your request directly to Emegema's administrator, who will act on it in
          line with our Privacy Policy.
        </p>
        <p>
          The administrator may also suspend or delete an account at their discretion for violations of these
          Terms, or where a teacher has requested removal of a student they added, subject to our Privacy
          Policy.
        </p>

        <h2>8. Disclaimer and Limitation of Liability</h2>
        <p>
          Emegema is provided "as is." While we take reasonable steps to keep the platform secure and available,
          we do not guarantee that it will be uninterrupted or error-free. To the extent permitted by law,
          Emegema is not liable for indirect or incidental damages arising from use of the platform, including
          loss of data due to circumstances outside our reasonable control.
        </p>

        <h2>9. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material changes, we'll update the
          "Last updated" date above and, where appropriate, ask you to re-confirm your agreement.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have questions about these Terms, contact us at [contact email].
        </p>
      </div>
    </LegalPageLayout>
  );
}
