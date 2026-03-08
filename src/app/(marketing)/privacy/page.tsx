import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | DispatchToGo",
  description: "Privacy Policy for DispatchToGo — how we collect, use, and protect your information.",
};

const OWNER = process.env.LEGAL_OWNER_NAME ?? "⚠ [NOT CONFIGURED — set LEGAL_OWNER_NAME]";
const EFFECTIVE = process.env.LEGAL_EFFECTIVE_DATE ?? "⚠ [NOT CONFIGURED — set LEGAL_EFFECTIVE_DATE]";
const CONTACT = process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "contact@dispatchtogo.com";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-800 mb-1.5">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-blue-600 font-semibold text-sm hover:text-blue-700">
            ← DispatchToGo
          </Link>
          <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">
            Terms of Service
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective date: {EFFECTIVE} &nbsp;·&nbsp; Operator: {OWNER}
        </p>

        <Section id="overview" title="1. Overview &amp; Identity of the Data Controller">
          <p>
            This Privacy Policy describes how <strong>{OWNER}</strong>, operating under the trade name{" "}
            <strong>DispatchToGo</strong> (<strong>&ldquo;DispatchToGo&rdquo;</strong>,{" "}
            <strong>&ldquo;we&rdquo;</strong>, <strong>&ldquo;us&rdquo;</strong>, or{" "}
            <strong>&ldquo;our&rdquo;</strong>), collects, uses, discloses, and protects personal information
            through the DispatchToGo Platform (<strong>&ldquo;Platform&rdquo;</strong>), operated at{" "}
            <em>dispatchtogo.com</em> and <em>app.dispatchtogo.com</em>.
          </p>
          <p>
            We are subject to Canada&apos;s federal{" "}
            <strong>Personal Information Protection and Electronic Documents Act (PIPEDA)</strong>, Ontario
            provincial privacy law, and the{" "}
            <strong>Canadian Anti‑Spam Legislation (CASL)</strong> with respect to commercial electronic
            messages.
          </p>
          <p>
            For privacy inquiries, contact our Privacy Officer at:{" "}
            <a href={`mailto:${CONTACT}`} className="text-blue-600 hover:underline">
              {CONTACT}
            </a>
          </p>
        </Section>

        <Section id="information-collected" title="2. Personal Information We Collect">
          <p>
            We collect only the personal information necessary to provide the Platform&apos;s services. The
            following describes what we collect and why.
          </p>

          <SubSection title="2.1 Registration &amp; Account Information">
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your <strong>full name</strong> and <strong>email address</strong></li>
              <li>A <strong>hashed password</strong> (we never store your password in plaintext)</li>
              <li>Your <strong>role</strong> on the Platform (Operator or Vendor)</li>
            </ul>
          </SubSection>

          <SubSection title="2.2 Organization &amp; Business Information (Operators)">
            <ul className="list-disc pl-6 space-y-1">
              <li>Organization name, type, contact email, contact phone, and billing email</li>
              <li>Business address</li>
              <li>
                Terms acceptance timestamp and IP address (recorded at registration and again when you initiate
                payment setup)
              </li>
              <li>Stripe customer identifier (once a payment method is added)</li>
            </ul>
          </SubSection>

          <SubSection title="2.3 Vendor &amp; Professional Information (Vendors)">
            <ul className="list-disc pl-6 space-y-1">
              <li>Company name, contact name, email, and phone number</li>
              <li>Service area and address</li>
              <li>Service categories and specialties</li>
              <li>
                <strong>Credential documents</strong>: licence numbers, insurance certificates, certifications,
                expiry dates, and uploaded document files — stored on our secure S3-compatible storage
              </li>
            </ul>
          </SubSection>

          <SubSection title="2.4 Property &amp; Service Request Data (Operators)">
            <ul className="list-disc pl-6 space-y-1">
              <li>Property names and addresses</li>
              <li>Service request descriptions (plain-language text you enter)</li>
              <li>Request category and urgency classification (AI-assisted)</li>
              <li>Photos attached to requests (may include embedded EXIF metadata)</li>
            </ul>
          </SubSection>

          <SubSection title="2.5 Job Records &amp; Photos (Vendors)">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Job notes, labour hours, material costs, and completion summaries you enter when completing a
                job
              </li>
              <li>
                Before and after photos — which may optionally include{" "}
                <strong>GPS latitude and longitude coordinates</strong> captured at the time of upload
              </li>
              <li>Timestamps for enroute, arrival, and completion events</li>
            </ul>
          </SubSection>

          <SubSection title="2.6 Communication Data">
            <ul className="list-disc pl-6 space-y-1">
              <li>Messages sent through the Platform&apos;s chat/comment system linked to service requests</li>
              <li>In-app notifications generated by the Platform</li>
            </ul>
          </SubSection>

          <SubSection title="2.7 Authentication &amp; Security Data">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Email verification tokens and password reset tokens (hashed; short-lived and deleted on use or
                expiry)
              </li>
              <li>Session JWT token stored in a browser cookie (see Section 7)</li>
            </ul>
          </SubSection>

          <SubSection title="2.8 Notification Preferences">
            <ul className="list-disc pl-6 space-y-1">
              <li>SMS and email opt-in/opt-out status</li>
              <li>Digest email preference</li>
              <li>Unsubscribe token (used to process one-click unsubscribe requests)</li>
            </ul>
          </SubSection>

          <SubSection title="2.9 Activity &amp; Audit Data">
            <p>
              The Platform maintains an audit log of significant administrative actions (e.g., user approval,
              account changes). This log is linked to user identifiers and used solely for Platform integrity
              and troubleshooting.
            </p>
          </SubSection>
        </Section>

        <Section id="purposes" title="3. How We Use Your Personal Information">
          <p>We use your personal information to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Provide the Service:</strong> Create and manage your account, process service requests,
              dispatch jobs to qualified vendors, and generate proof-of-service documentation.
            </li>
            <li>
              <strong>AI Triage:</strong> Transmit the text of your service request descriptions to a
              third-party AI provider to classify the request category and urgency. No personal identifiers are
              included in what is sent to the AI provider.
            </li>
            <li>
              <strong>Notifications:</strong> Send transactional SMS and email messages about request status,
              job assignments, completions, and billing. All messages relate to your use of the Platform (see
              Section 8 — CASL).
            </li>
            <li>
              <strong>Billing:</strong> Calculate and issue monthly platform usage invoices via Stripe. Your
              billing email and organization name are shared with Stripe for invoicing purposes.
            </li>
            <li>
              <strong>Security &amp; integrity:</strong> Detect and prevent fraud, unauthorized access, and
              abuse. Verify CAPTCHA challenges on login. Enforce account approval requirements.
            </li>
            <li>
              <strong>Platform operations:</strong> Monitor errors and performance via Sentry (see Section 5).
            </li>
            <li>
              <strong>Legal compliance:</strong> Maintain records as required by law, including terms acceptance
              records.
            </li>
          </ul>
        </Section>

        <Section id="legal-basis" title="4. Legal Basis for Processing (PIPEDA)">
          <p>Under PIPEDA, we collect, use, and disclose personal information with your <strong>consent</strong>:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Express consent</strong> is obtained when you create an account by agreeing to these
              Terms and this Privacy Policy.
            </li>
            <li>
              <strong>Implied consent</strong> applies to incidental processing necessary to deliver the
              services you have requested (e.g., transmitting your phone number to our SMS provider to send you
              a dispatch notification you requested).
            </li>
          </ul>
          <p>
            You may withdraw consent at any time (see Section 9 — Your Rights). Note that doing so may prevent
            us from continuing to provide the Service.
          </p>
        </Section>

        <Section id="third-parties" title="5. Third-Party Service Providers (Data Processors)">
          <p>
            We share personal information with the following service providers only to the extent necessary to
            deliver the Platform. These are <strong>data processors</strong> acting on our instructions, not
            independent data controllers.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200">Provider</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200">Purpose</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200">Data Shared</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700 border-b border-gray-200">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2 font-medium">TextBee</td>
                  <td className="px-4 py-2">SMS notifications</td>
                  <td className="px-4 py-2">Phone numbers, SMS message body</td>
                  <td className="px-4 py-2">Canada / US</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-2 font-medium">Stripe, Inc.</td>
                  <td className="px-4 py-2">Payment processing &amp; invoicing</td>
                  <td className="px-4 py-2">Org name, billing email; payment card details (stored by Stripe only)</td>
                  <td className="px-4 py-2">United States</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">SMTP Provider</td>
                  <td className="px-4 py-2">Transactional email delivery</td>
                  <td className="px-4 py-2">Email address, email message body</td>
                  <td className="px-4 py-2">Varies</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-2 font-medium">S3-Compatible Storage</td>
                  <td className="px-4 py-2">Photo &amp; document storage</td>
                  <td className="px-4 py-2">Job photos, vendor credential documents</td>
                  <td className="px-4 py-2">Canada</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Cloudflare</td>
                  <td className="px-4 py-2">Network security, Turnstile CAPTCHA</td>
                  <td className="px-4 py-2">IP address, browser fingerprint (CAPTCHA only)</td>
                  <td className="px-4 py-2">United States (global CDN)</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-4 py-2 font-medium">AI Provider</td>
                  <td className="px-4 py-2">Request triage classification</td>
                  <td className="px-4 py-2">Service request description text (no personal identifiers)</td>
                  <td className="px-4 py-2">United States</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Sentry</td>
                  <td className="px-4 py-2">Error monitoring &amp; performance</td>
                  <td className="px-4 py-2">Error stack traces, may capture limited request context</td>
                  <td className="px-4 py-2">United States</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            We do not sell your personal information. We do not share it with any party for their own marketing
            or advertising purposes.
          </p>
        </Section>

        <Section id="cross-border" title="6. Cross-Border Transfers">
          <p>
            As noted in Section 5, several of our service providers are located in the United States (Stripe,
            Cloudflare, the AI provider, and Sentry). By using the Platform and consenting to this Privacy
            Policy, you acknowledge that your personal information may be transferred to and processed in the
            United States, where privacy laws may differ from those in Canada.
          </p>
          <p>
            We take reasonable contractual measures to ensure that any cross-border transfer of personal
            information is subject to appropriate safeguards consistent with PIPEDA.
          </p>
        </Section>

        <Section id="cookies" title="7. Cookies &amp; Session Storage">
          <p>The Platform uses the following cookies:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Session cookie</strong> (<code>next-auth.session-token</code> or{" "}
              <code>__Secure-next-auth.session-token</code> over HTTPS): A signed JWT cookie set by NextAuth
              at login. It contains your user ID, role, and organization/vendor identifier. It expires after
              30 days of inactivity. This cookie is strictly necessary for the Platform to function.
            </li>
            <li>
              <strong>CAPTCHA challenge cookie</strong>: Set by Cloudflare Turnstile during the login and
              registration flow to verify you are human. This is a functional cookie managed by Cloudflare;
              refer to{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloudflare&apos;s Privacy Policy
              </a>{" "}
              for details.
            </li>
          </ul>
          <p>
            We do not use analytics cookies, advertising cookies, or any third-party tracking cookies.
          </p>
        </Section>

        <Section id="casl" title="8. Commercial Electronic Messages &amp; CASL">
          <p>
            All email and SMS messages sent by the Platform are <strong>transactional messages</strong> that
            relate directly to your use of the Service — including dispatch notifications, job status updates,
            service request confirmations, billing invoices, and account alerts. These messages are sent on
            the basis of an <strong>existing business relationship</strong> as defined under CASL.
          </p>
          <p>
            We do not send promotional or marketing messages without your explicit opt-in consent.
          </p>
          <p>
            <strong>Opt-out:</strong> You may unsubscribe from non-essential email notifications at any time
            by:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Clicking the unsubscribe link in any email we send you; or</li>
            <li>Updating your notification preferences in your account settings.</li>
          </ul>
          <p>
            Note that certain transactional messages that are essential to the operation of the Service (e.g.,
            email verification, password reset, and billing alerts) cannot be opted out of while your account
            is active.
          </p>
        </Section>

        <Section id="retention" title="9. Data Retention">
          <p>
            We retain personal information for as long as your account remains active and for a reasonable
            period thereafter to fulfill legal, accounting, or dispute-resolution obligations.
          </p>
          <p>Specific retention notes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Password reset tokens</strong> and <strong>email verification tokens</strong> are deleted
              automatically on use or expiry.
            </li>
            <li>
              <strong>Proof-of-service photos</strong> attached to completed jobs are retained as part of the
              permanent service record, as they form part of the documented audit trail.
            </li>
            <li>
              <strong>Billing records</strong> (PlatformBill invoices) are retained for a minimum of seven (7)
              years in accordance with standard Canadian business record-keeping requirements.
            </li>
            <li>
              <strong>AI triage request text</strong> is not retained by us beyond what is needed to classify
              the request. Refer to the AI provider&apos;s own data-retention policy for any processing on
              their end.
            </li>
          </ul>
          <p>
            There is no automated data purge for account or request data. Data is retained indefinitely unless
            you request deletion (see Section 10).
          </p>
        </Section>

        <Section id="rights" title="10. Your Rights Under PIPEDA">
          <p>You have the following rights regarding your personal information:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Right of Access:</strong> You may request a summary of the personal information we hold
              about you.
            </li>
            <li>
              <strong>Right to Correction:</strong> You may request that we correct inaccurate or incomplete
              personal information.
            </li>
            <li>
              <strong>Right to Withdraw Consent / Request Deletion:</strong> You may withdraw consent to our
              collection and use of your personal information and request that your account and associated data
              be deleted. Note that some data (e.g., billing records) may need to be retained for legal
              compliance reasons even after account deletion.
            </li>
            <li>
              <strong>Right to Lodge a Complaint:</strong> If you believe we have not handled your personal
              information in compliance with PIPEDA, you have the right to file a complaint with the{" "}
              <a
                href="https://www.priv.gc.ca/en/report-a-concern/"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Office of the Privacy Commissioner of Canada (OPC)
              </a>
              .
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact our Privacy Officer at:{" "}
            <a href={`mailto:${CONTACT}`} className="text-blue-600 hover:underline">
              {CONTACT}
            </a>
            . We will respond within 30 calendar days.
          </p>
        </Section>

        <Section id="security" title="11. Security Measures">
          <p>
            We implement industry-standard technical and organizational measures to protect your personal
            information, including:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>All passwords are stored as salted <strong>bcrypt hashes</strong> — plaintext passwords are never stored.</li>
            <li>All data in transit is encrypted using <strong>HTTPS/TLS</strong>.</li>
            <li>
              Photo and document storage is access-controlled and not publicly enumerable; files are served
              via authenticated or time-limited URLs.
            </li>
            <li>
              Account access requires multi-factor consent (email verification + admin approval) before an
              account becomes active.
            </li>
            <li>
              Login is protected by a CAPTCHA challenge (Cloudflare Turnstile) to prevent automated credential
              attacks.
            </li>
            <li>
              Each account role (Admin, Operator, Vendor) has strictly scoped data access — Operators can only
              see their own organization&apos;s data; Vendors can only see jobs assigned to them.
            </li>
          </ul>
          <p>
            No method of transmission over the Internet or electronic storage is 100% secure. While we strive
            to protect your personal information, we cannot guarantee absolute security.
          </p>
        </Section>

        <Section id="children" title="12. Children's Privacy">
          <p>
            The Platform is a B2B service intended for use by adults (18+) acting in a professional or
            business capacity. We do not knowingly collect personal information from persons under the age of
            18. If you believe we have inadvertently collected information from a minor, please contact us
            immediately at{" "}
            <a href={`mailto:${CONTACT}`} className="text-blue-600 hover:underline">
              {CONTACT}
            </a>{" "}
            and we will take steps to delete that information.
          </p>
        </Section>

        <Section id="changes" title="13. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the effective date
            above. For material changes, we will notify you by email at the address associated with your
            account. Continued use of the Platform after changes take effect constitutes acceptance of the
            revised policy.
          </p>
        </Section>

        <Section id="contact-section" title="14. Contact Us">
          <p>
            For any questions, concerns, or requests regarding this Privacy Policy or our privacy practices,
            contact:
          </p>
          <address className="not-italic bg-gray-50 rounded-lg px-5 py-4 text-sm space-y-1">
            <p className="font-semibold text-gray-800">Privacy Officer — DispatchToGo</p>
            <p>{OWNER}</p>
            <p>Cornwall &amp; SDG, Ontario, Canada</p>
            <p>
              Email:{" "}
              <a href={`mailto:${CONTACT}`} className="text-blue-600 hover:underline">
                {CONTACT}
              </a>
            </p>
          </address>
        </Section>

        <hr className="my-10 border-gray-200" />
        <p className="text-xs text-gray-400 text-center">
          DispatchToGo &mdash; Cornwall &amp; SDG, Ontario, Canada &mdash; Effective {EFFECTIVE}
        </p>
      </main>
    </div>
  );
}
