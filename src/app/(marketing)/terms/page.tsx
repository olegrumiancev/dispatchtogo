import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | DispatchToGo",
  description: "Terms of Service for DispatchToGo — the field-service dispatch platform for Cornwall & SDG operators.",
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-blue-600 font-semibold text-sm hover:text-blue-700">
            ← DispatchToGo
          </Link>
          <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
            Privacy Policy
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective date: {EFFECTIVE} &nbsp;·&nbsp; Operator: {OWNER}
        </p>

        <Section id="acceptance" title="1. Acceptance of Terms">
          <p>
            By creating an account on DispatchToGo (<strong>&ldquo;Platform&rdquo;</strong>), clicking{" "}
            <em>Create Account</em>, or otherwise accessing or using the Platform, you agree to be bound by
            these Terms of Service (<strong>&ldquo;Terms&rdquo;</strong>). If you do not agree, do not use the
            Platform.
          </p>
          <p>
            These Terms form a legally binding agreement between you and <strong>{OWNER}</strong>{" "}
            (<strong>&ldquo;DispatchToGo&rdquo;</strong>, <strong>&ldquo;we&rdquo;</strong>,{" "}
            <strong>&ldquo;us&rdquo;</strong>, or <strong>&ldquo;our&rdquo;</strong>), a sole proprietor
            operating under the trade name <strong>DispatchToGo</strong>, based in Ontario, Canada.
          </p>
          <p>
            Your acceptance timestamp and IP address are recorded at the time you create your account and, for
            billing terms, when you initiate payment setup — these records are part of the agreement.
          </p>
        </Section>

        <Section id="description" title="2. Description of the Platform">
          <p>
            DispatchToGo is a business-to-business (<strong>B2B</strong>) field-service dispatch software-as-a-service
            platform (<strong>&ldquo;Service&rdquo;</strong>). It enables:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Operators</strong> (hotels, marinas, campgrounds, short-term rental managers, and similar
              property operators) to submit maintenance and service requests.
            </li>
            <li>
              <strong>Vendors</strong> (tradespeople and service providers) to receive, accept, and complete
              those requests and log proof of service.
            </li>
            <li>
              <strong>Administrators</strong> to manage the Platform, users, and vendor network.
            </li>
          </ul>
          <p>
            The Platform uses AI-assisted triage to classify requests, auto-dispatch logic to route jobs to
            qualified vendors, and generates proof-of-service documentation for completed work.
          </p>
        </Section>

        <Section id="eligibility" title="3. Eligibility">
          <p>
            You must be at least 18 years of age and have the legal authority to enter into these Terms on
            behalf of yourself or the business entity you represent. By using the Platform you represent that
            you meet these requirements.
          </p>
          <p>
            The Platform is intended for use by businesses and professionals. It is not a consumer product. If
            you are registering on behalf of a company or organization, you represent that you are duly
            authorized to bind that organization to these Terms.
          </p>
          <p>
            All accounts are subject to admin review and approval before access is granted. We reserve the
            right to decline any registration at our sole discretion.
          </p>
        </Section>

        <Section id="accounts" title="4. Accounts &amp; Security">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You agree to
            notify us immediately at{" "}
            <a href={`mailto:${CONTACT}`} className="text-blue-600 hover:underline">
              {CONTACT}
            </a>{" "}
            of any unauthorized use of your account.
          </p>
          <p>
            You may not share your account with others, create accounts by automated means, or create accounts
            under false pretenses.
          </p>
          <p>
            We may disable your account if we believe you have violated these Terms, if your account poses a
            security risk, or for any other reason in our sole discretion, with or without advance notice.
          </p>
        </Section>

        <Section id="operator-obligations" title="5. Operator Obligations">
          <p>As an Operator, you agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Provide accurate and complete information about your organization, properties, and service
              requests.
            </li>
            <li>
              Ensure you have the authority to authorize service work at the properties you add to the
              Platform.
            </li>
            <li>
              Communicate promptly and professionally with Vendors assigned to your requests.
            </li>
            <li>
              Pay all invoices generated under these Terms within the stated payment period (see Section 8).
            </li>
            <li>
              Use any AI-generated triage summaries as guidance only — you remain responsible for verifying
              the accuracy of any classification or urgency assessment before acting on it.
            </li>
          </ul>
        </Section>

        <Section id="vendor-obligations" title="6. Vendor Obligations">
          <p>As a Vendor, you agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Maintain all required licences, certifications, and insurance applicable to the services you
              offer, and keep the credentials you upload to the Platform current and accurate.
            </li>
            <li>
              Accept or decline dispatched jobs promptly and honour accepted jobs in accordance with the
              Platform&apos;s job lifecycle.
            </li>
            <li>
              Provide accurate, honest records of labour time, materials, and before/after photos when logging
              job completion.
            </li>
            <li>
              Not upload photos, GPS data, or other job records that are falsified, manipulated, or do not
              relate to the work performed.
            </li>
            <li>
              Conduct all work in compliance with applicable provincial and federal laws, trades standards, and
              safety regulations.
            </li>
          </ul>
          <p>
            Vendor accounts are created and managed by Platform Administrators. Vendors use the Platform free
            of charge; no subscription or per-request fees apply to Vendors.
          </p>
        </Section>

        <Section id="user-content" title="7. User Content">
          <p>
            <strong>&ldquo;User Content&rdquo;</strong> means any information, text, photos, GPS data, notes,
            messages, and other materials you upload or submit to the Platform.
          </p>
          <p>
            You retain ownership of your User Content. By submitting User Content, you grant DispatchToGo a
            non-exclusive, worldwide, royalty-free licence to store, process, display, and transmit that
            content solely for the purpose of providing the Service to you and the other parties involved in
            your service requests.
          </p>
          <p>
            You represent that you have all rights necessary to grant this licence and that your User Content
            does not infringe any third-party rights or violate any applicable law.
          </p>
          <p>
            We do not use your User Content to train AI models. Request descriptions submitted for AI triage
            are processed by a third-party AI provider solely for classification purposes and are not retained
            by the AI provider for training beyond what their own data-processing terms permit.
          </p>
        </Section>

        <Section id="billing" title="8. Billing &amp; Payment">
          <p>
            <strong>Operators only.</strong> Vendor accounts are free of charge.
          </p>
          <p>
            <strong>Free Plan:</strong> Your account includes 15 completed service requests per calendar month
            at no charge. No credit card is required to start.
          </p>
          <p>
            <strong>Pay-As-You-Go:</strong> Once you exceed 15 completed requests in a month, additional
            completed requests are billed at <strong>$0.25 CAD per request</strong>. A payment method must be
            on file to dispatch requests beyond the free limit.
          </p>
          <p>
            <strong>Invoicing:</strong> Platform bills are generated at the end of each calendar month
            (Ontario Eastern Time) for any overage incurred during that month. Invoices are issued through
            Stripe and sent to your billing email. Payment is due within <strong>30 days</strong> of the
            invoice date.
          </p>
          <p>
            <strong>Payment Processing:</strong> Payment information is collected and stored by Stripe, Inc.
            We do not store your credit card details. By providing a payment method, you also agree to
            Stripe&apos;s terms of service available at{" "}
            <a
              href="https://stripe.com/legal/ssa"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              stripe.com/legal
            </a>
            .
          </p>
          <p>
            <strong>No Long-Term Contracts:</strong> There are no minimum commitment periods. You may stop
            using the Platform at any time. Outstanding invoices for completed requests remain payable.
          </p>
          <p>
            <strong>Held Requests:</strong> If you exceed the free limit without a payment method on file,
            new requests will be queued and held. Held requests are dispatched automatically when a valid
            payment method is added.
          </p>
          <p>
            All prices are in <strong>Canadian dollars (CAD)</strong> and are exclusive of applicable taxes.
            GST/HST may apply.
          </p>
        </Section>

        <Section id="acceptable-use" title="9. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the Platform for any unlawful purpose or in violation of any applicable law.</li>
            <li>
              Submit false, misleading, or fraudulent service requests, job records, or credential
              documents.
            </li>
            <li>
              Attempt to circumvent the Platform&apos;s dispatch logic, billing system, or security controls.
            </li>
            <li>Scrape, reverse-engineer, decompile, or disassemble any part of the Platform.</li>
            <li>
              Use automated scripts, bots, or crawlers to interact with the Platform without our prior written
              consent.
            </li>
            <li>
              Upload any content that is defamatory, obscene, harassing, threatening, or infringes any
              third-party rights.
            </li>
            <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
            <li>
              Interfere with the integrity or performance of the Platform or attempt to gain unauthorized
              access to any system or network.
            </li>
          </ul>
        </Section>

        <Section id="intellectual-property" title="10. Intellectual Property">
          <p>
            All software, algorithms, interfaces, designs, trademarks, and other intellectual property
            comprising or underlying the Platform (excluding User Content) are owned exclusively by
            DispatchToGo or its licensors. Nothing in these Terms transfers ownership of Platform IP to you.
          </p>
          <p>
            Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
            non-transferable, revocable licence to access and use the Platform solely for your internal
            business operations during the term of your account.
          </p>
        </Section>

        <Section id="termination" title="11. Suspension &amp; Termination">
          <p>
            We may suspend or terminate your access to the Platform at any time, with or without notice, for
            any reason including but not limited to: breach of these Terms, non-payment of invoices, suspected
            fraudulent activity, or if we decide to discontinue the Service.
          </p>
          <p>
            You may close your account at any time by contacting us at{" "}
            <a href={`mailto:${CONTACT}`} className="text-blue-600 hover:underline">
              {CONTACT}
            </a>
            . Account closure does not cancel outstanding payment obligations.
          </p>
          <p>
            Upon termination, your right to access the Platform ceases. We may retain records as required by
            law or described in our{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section id="disclaimers" title="12. Disclaimer of Warranties">
          <p>
            THE PLATFORM IS PROVIDED ON AN <strong>&ldquo;AS IS&rdquo;</strong> AND{" "}
            <strong>&ldquo;AS AVAILABLE&rdquo;</strong> BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
            IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p>
            We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other
            harmful components. AI-generated triage results are provided for convenience only and are not
            guaranteed to be accurate. We are not responsible for Vendor performance, workmanship, or any
            outcomes of service work arranged through the Platform.
          </p>
          <p>
            You use the Platform and rely on any dispatched Vendors at your own risk.
          </p>
        </Section>

        <Section id="liability" title="13. Limitation of Liability">
          <p>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DISPATCHTOGO, ITS OWNER, OR
            ITS AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES, INCLUDING LOSS OF PROFITS, LOSS OF DATA, BUSINESS INTERRUPTION, OR PROPERTY DAMAGE,
            ARISING OUT OF OR RELATED TO YOUR USE OF (OR INABILITY TO USE) THE PLATFORM, EVEN IF WE HAVE BEEN
            ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            OUR TOTAL AGGREGATE LIABILITY TO YOU ARISING OUT OF OR RELATED TO THESE TERMS SHALL NOT EXCEED
            THE GREATER OF: (A) THE TOTAL FEES PAID BY YOU TO DISPATCHTOGO IN THE THREE (3) MONTHS
            IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) ONE HUNDRED CANADIAN DOLLARS
            ($100 CAD).
          </p>
          <p>
            SOME JURISDICTIONS DO NOT ALLOW LIMITATION OF LIABILITY FOR CERTAIN TYPES OF DAMAGE; IN SUCH
            JURISDICTIONS, OUR LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
          </p>
        </Section>

        <Section id="indemnification" title="14. Indemnification">
          <p>
            You agree to indemnify, defend, and hold harmless DispatchToGo and its owner from and against any
            and all claims, damages, losses, costs, and expenses (including reasonable legal fees) arising out
            of or related to: (a) your use of the Platform; (b) your User Content; (c) your breach of these
            Terms; or (d) your violation of any applicable law or third-party rights.
          </p>
        </Section>

        <Section id="governing-law" title="15. Governing Law &amp; Dispute Resolution">
          <p>
            These Terms are governed by and construed in accordance with the laws of the{" "}
            <strong>Province of Ontario</strong> and the applicable federal laws of{" "}
            <strong>Canada</strong>, without regard to conflict-of-law principles.
          </p>
          <p>
            Any dispute arising out of or relating to these Terms or the Platform shall be subject to the
            exclusive jurisdiction of the courts of Ontario, Canada. You irrevocably consent to such
            jurisdiction.
          </p>
        </Section>

        <Section id="amendments" title="16. Amendments">
          <p>
            We may modify these Terms at any time by posting the revised version on this page with an updated
            effective date. For material changes, we will make reasonable efforts to notify you by email at
            the address on your account. Continued use of the Platform after the effective date of any changes
            constitutes acceptance of the revised Terms.
          </p>
          <p>
            If you do not agree to any changes, you must stop using the Platform and close your account.
          </p>
        </Section>

        <Section id="general" title="17. General">
          <p>
            <strong>Entire Agreement:</strong> These Terms, together with our{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            , constitute the entire agreement between you and DispatchToGo regarding your use of the Platform
            and supersede all prior agreements and understandings.
          </p>
          <p>
            <strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the
            remaining provisions will continue in full force and effect.
          </p>
          <p>
            <strong>Waiver:</strong> Our failure to enforce any right or provision will not constitute a waiver
            of that right or provision.
          </p>
          <p>
            <strong>Assignment:</strong> You may not assign these Terms or any rights or obligations hereunder
            without our prior written consent. We may assign these Terms in connection with a merger,
            acquisition, or sale of assets.
          </p>
        </Section>

        <Section id="contact" title="18. Contact">
          <p>
            Questions about these Terms? Contact us at:{" "}
            <a href={`mailto:${CONTACT}`} className="text-blue-600 hover:underline">
              {CONTACT}
            </a>
          </p>
        </Section>

        <hr className="my-10 border-gray-200" />
        <p className="text-xs text-gray-400 text-center">
          DispatchToGo &mdash; Cornwall &amp; SDG, Ontario, Canada &mdash; Effective {EFFECTIVE}
        </p>
      </main>
    </div>
  );
}
