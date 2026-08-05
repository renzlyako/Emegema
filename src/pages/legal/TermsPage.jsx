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
          agree, do not use the platform. If you're using Emegema on behalf of a school, "you" includes that
          school and everyone it authorizes to use the account it creates.
        </p>

        <h2>2. Eligibility and Account Creation</h2>
        <p>
          Emegema is invitation-only. There is no public self-registration. Accounts are created by a school
          administrator or teacher, who is responsible for the accuracy of the information provided when creating
          an account on someone else's behalf.
        </p>
        <p>
          You are responsible for keeping your login credentials confidential and for all activity that happens
          under your account. Tell your administrator immediately if you believe your account has been accessed
          without your permission.
        </p>

        <h2>3. User Roles and Responsibilities</h2>
        <p>Emegema has three types of accounts, each with different capabilities and responsibilities.</p>

        <p><strong>Administrators</strong></p>
        <ul>
          <li>Create teacher and student accounts</li>
          <li>Are the only role able to delete student and teacher accounts</li>
          <li>Can view the actions of every user on the platform, including teacher activity such as account and course creation</li>
          <li>Can archive or delete a teacher's course</li>
        </ul>
        <p>
          Administrators are responsible for managing accounts and courses appropriately, and for acting on
          deletion or access requests in line with the Privacy Policy.
        </p>

        <p><strong>Teachers</strong></p>
        <ul>
          <li>Create student accounts</li>
          <li>Create and manage courses</li>
          <li>Create assignments, assessments, and announcements</li>
          <li>Configure attendance and grading for their own courses</li>
        </ul>
        <p>
          Teachers are responsible for the accuracy of grades and content they post, and for using student data
          only for legitimate teaching purposes within their own courses.
        </p>

        <p><strong>Students</strong></p>
        <ul>
          <li>Join courses using a course code provided by a teacher</li>
          <li>View, answer, and submit assignments and assessments</li>
          <li>View their own grades and attendance</li>
        </ul>
        <p>
          Students are responsible for the work they submit and for keeping their own account credentials
          private.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>When using Emegema, you agree not to:</p>
        <ul>
          <li>Share your account or login credentials with anyone else</li>
          <li>Attempt to access another user's account or data without authorization</li>
          <li>Attempt to bypass, disable, or interfere with the platform's security features</li>
          <li>Upload or submit content that is unlawful, harassing, or infringes someone else's rights</li>
          <li>Use the platform for any purpose unrelated to teaching, learning, or school administration</li>
        </ul>
        <p>
          Accounts found to violate acceptable use may be suspended or deleted by an administrator.
        </p>

        <h2>5. Content Ownership</h2>
        <p>
          Course materials, assignments, and assessments created by a teacher remain that teacher's (or their
          school's) content. Work submitted by a student remains that student's content. By submitting content to
          Emegema, you grant the platform and your school the right to store, display, and process it as needed
          to provide the service — for example, showing a submission to the teacher who assigned it, or including
          a grade in the gradebook.
        </p>

        <h2>6. Account Suspension and Termination</h2>
        <p>
          An administrator may suspend or delete an account at their discretion, including for violations of
          these Terms, at the request of the school, or when an account is no longer needed (for example, a
          student who has left the school).
        </p>

        <h2>7. Disclaimer and Limitation of Liability</h2>
        <p>
          Emegema is provided "as is." While we take reasonable steps to keep the platform secure and available,
          we do not guarantee that it will be uninterrupted or error-free. To the extent permitted by law,
          Emegema is not liable for indirect or incidental damages arising from use of the platform, including
          loss of data due to circumstances outside our reasonable control.
        </p>

        <h2>8. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material changes, we'll update the
          "Last updated" date above.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have questions about these Terms, contact your school administrator.
        </p>
      </div>
    </LegalPageLayout>
  );
}
