// src/pages/legal/PrivacyPolicyPage.jsx

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
          Emegema ("we," "us," "the platform") is a tool that helps teachers organize their 
          teaching work — including quizzes, exams, activities, assignments, attendance, and 
          grades — and lets students complete and submit their coursework directly through the 
          platform.
        </p>
        <p>
          Emegema is not affiliated with, operated by, or connected to any school. Teachers use 
          Emegema independently to manage their own classes. This Privacy Policy explains what 
          information we collect, why we collect it, and how you can request that it be deleted.
        </p>
        <p>
          Emegema does not offer public self-registration for students. Student accounts are 
          created by their teacher, who is responsible for obtaining any necessary parental or 
          guardian consent before doing so (see Section 3). Teachers who wish to use Emegema may 
          create their own account, subject to approval by Emegema's administrator.
        </p>

        <h2>2. Information We Collect</h2>
        <p><strong>Account information</strong></p>
        <ul>
          <li>Full name</li>
          <li>Working email address (used only for authentication and account-related communication)</li>
        </ul>

        <p>
          We do not collect age, date of birth, government-issued IDs (such as LRN), phone 
          numbers, or any information beyond what's needed to operate the platform.
        </p>

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

        <p><strong>Account deletion requests</strong></p>
        <p>
          When you request deletion of your account through the in-app feature, we collect the 
          request itself (sent via email to our administrator) in order to act on it.
        </p>

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
          <li>Basic technical information used to protect accounts from abuse, such as bot-verification checks (see Section 6, Cookies).</li>
        </ul>

        <p>We do not collect payment information, government ID numbers, or any information beyond what's needed to operate the platform.</p>

        <h2>3. Minors and Parental Consent</h2>
        <p>
          Emegema does not collect birth dates or ages, and relies on the teacher who creates a 
          student account to determine whether the student is a minor and, if so, to obtain 
          consent from a parent or guardian before creating that account.
        </p>
        <p>
          By creating a student account, a teacher confirms that they have obtained any consent 
          required for that student to use Emegema, including parental or guardian consent where 
          the student is a minor.
        </p>
        <p>
          If you are a parent or guardian and believe your child's account was created without 
          your consent, please contact us at [contact email] so we can address it, including 
          deletion of the account if appropriate.
        </p>

        <h2>4. Why We Collect This Information and Our Legal Basis</h2>
        <p>We collect and use this information because it is necessary to provide the service 
          you or your teacher has signed up for — organizing coursework, submitting and grading 
          assignments, and tracking attendance — and because you (or, for students, your teacher 
          on your behalf, with appropriate parental consent for minors) have agreed to our Terms 
          & Conditions and this Privacy Policy.
        </p>
        <p>
          We do not sell your information. We do not use it for advertising, and we do not share 
          it with third parties for marketing purposes.
        </p>

        <h2>5. Who Can See Your Information</h2>
        <p>Access to information is limited by role:</p>
        <ul>
          <li><strong>Students</strong> can see their own grades, feedback, submissions, and attendance. They cannot see other students' data.</li>
          <li><strong>Teachers</strong> can see the data of students they have added to their own classes — including submissions, grades, and attendance for those students.</li>
          <li><strong>Emegema's Administrator</strong> can view account information as needed to operate, secure, and support the platform, including to act on deletion requests.</li>
        </ul>

        <h2>6. Cookies and Similar Technology</h2>
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

        <h2>7. How Long We Keep Information</h2>
        <p>
          We keep account and academic information for as long as your account is active, and for a reasonable
          period afterward in case it's needed for legal, security, or dispute-resolution purposes. If you
          request deletion, see Section 9 for how that process works.
        </p>

        <h2>8. Data Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect your information from unauthorized
          access, alteration, or loss. No system is completely secure, but we take steps appropriate to the
          nature of the data we hold, most of which is limited to names, emails, and academic records.
        </p>

        <h2>9. Deleting Your Account</h2>
        <p>
          You can request deletion of your account at any time by using the "Request Account 
          Deletion" feature after logging in. This sends your request directly to Emegema's 
          administrator by email.
        </p>
        <p>
          We will act on your request within [15–30] days. Once processed, your account and 
          associated personal data will be deleted, except where we are required to keep certain 
          records for legal or security purposes (for example, fraud prevention).
        </p>
        <p>
          For students: if you are a minor, we recommend involving your teacher or parent/guardian 
          in the deletion request, though you may submit it yourself directly.
        </p>
        <p>
          If you believe your deletion request was not properly handled, you may file a complaint 
          with the National Privacy Commission (NPC) at https://privacy.gov.ph.
        </p>

        <h2>10. Your Rights Under the Data Privacy Act</h2>
        <p>
          As a data subject under the Philippine Data Privacy Act of 2012 (RA 10173), you have the right to:
        </p>
        <ul>
          <li>Be informed that your personal data is being processed</li>
          <li>Access your own data that we hold</li>
          <li>Correct any inaccurate or outdated information about you</li>
          <li>Object to certain processing of your data</li>
          <li>Request the erasure or blocking of your data, where legally permitted</li>
          <li>Be indemnified for damages from unauthorized processing, if applicable</li>
          <li>File a complaint with the National Privacy Commission</li>
        </ul>
        <p>
          To exercise these rights, use the in-app account deletion feature described in Section 9, or contact
          us directly at [contact email]. If you're not satisfied with how your request was handled, you may
          escalate to the National Privacy Commission at https://privacy.gov.ph.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we'll update the
          "Last updated" date above and, where appropriate, ask you to re-confirm your agreement.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or how your information is handled, contact us at
          [contact email].
        </p>
      </div>
    </LegalPageLayout>
  );
}


