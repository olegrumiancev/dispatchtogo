import Link from "next/link";
import {
  Truck,
  CheckCircle2,
  ArrowRight,
  Zap,
  HelpCircle,
  Clock,
} from "lucide-react";

const FREE_FEATURES = [
  "15 completed service requests included / month",
  "$0.25 CAD per additional completed request",
  "Unlimited properties",
  "Unlimited vendors in your network",
  "AI-powered triage & auto-dispatch",
  "Before/after photo documentation",
  "Proof-of-service PDF packets",
  "Real-time status dashboard",
  "Vendor credential tracking",
  "Invoice management",
  "Email & SMS notifications",
  "Dedicated support",
];

const VALUE_ADDS = [
  {
    icon: Zap,
    title: "AI-Powered Triage",
    description:
      "Every request is automatically categorized and routed to the right vendor — no manual dispatch needed.",
  },
  {
    icon: Truck,
    title: "Vendor Network",
    description:
      "Manage unlimited vendors with credential tracking, preferred vendor routing, and performance history.",
  },
  {
    icon: CheckCircle2,
    title: "Proof of Service",
    description:
      "Before/after photos, technician notes, and materials — compiled into a shareable PDF packet automatically.",
  },
  {
    icon: Clock,
    title: "Real-Time Visibility",
    description:
      "Track every request from submission to completion with live status updates and notifications.",
  },
];

const FAQS = [
  {
    q: "What counts as a completed service request?",
    a: "A request is counted as completed when the work is marked done and approved by your team. Cancelled or rejected requests don't count.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "No contracts, no commitments. Pay only for what you use, month to month.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards via Stripe. Invoicing available for enterprise customers.",
  },
  {
    q: "Can I add multiple properties?",
    a: "Yes — unlimited properties are included at no extra cost.",
  },
  {
    q: "How does vendor credential tracking work?",
    a: "Upload insurance certificates, licenses, and other docs for each vendor. DispatchToGo tracks expiry dates and alerts you before anything lapses.",
  },
  {
    q: "Is there a free trial?",
    a: "Your first 15 completed requests each month are always free — no trial period needed. Start using it today.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Simple, usage-based pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            Start free. Pay only when you scale.
          </p>
        </div>
      </section>

      {/* Pricing card */}
      <section className="py-16 px-4">
        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl border-2 border-blue-600 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider opacity-80">
                    Single Plan
                  </p>
                  <h2 className="text-3xl font-extrabold mt-1">Free to start</h2>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-extrabold">$0</p>
                  <p className="text-sm opacity-80">/ month base</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white px-8 py-6">
              <ul className="space-y-3">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  Billed monthly. No setup fees. Cancel anytime.
                </p>
              </div>

              <div className="mt-6">
                <Link
                  href="/app/register"
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Get started free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value adds */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Everything you need to manage maintenance
          </h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {VALUE_ADDS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{q}</p>
                    <p className="text-sm text-gray-600 mt-1">{a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white">
            Ready to streamline your maintenance operations?
          </h2>
          <p className="mt-3 text-blue-100">
            Join property managers who trust DispatchToGo to handle their service requests.
          </p>
          <Link
            href="/app/register"
            className="mt-6 inline-flex items-center gap-2 bg-white text-blue-600 font-semibold py-3 px-8 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
