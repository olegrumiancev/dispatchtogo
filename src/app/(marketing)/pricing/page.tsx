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

const VALUE_FEATURES = [
  "100 completed service requests included / month",
  "$0.25 CAD per additional completed request",
  "Everything in Free",
  "Priority support",
];

const faqs = [
  {
    q: "What counts as a billable completed request?",
    a: "A request is billable when the associated job reaches Completed or Verified status — meaning the vendor has finished the work. Cancelled, declined, or in-progress jobs do not count.",
  },
  {
    q: "When am I charged?",
    a: "At the end of each calendar month, we tally your completed requests. If you're over your plan's included amount, you'll receive a Stripe invoice for the overage. You have 30 days to pay.",
  },
  {
    q: "Can I add more properties?",
    a: "Yes. Both plans include unlimited properties at no extra cost.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "No long-term contracts. The Free tier is always free for up to 15 completions per month. Charges only apply when you go over.",
  },
  {
    q: "Do vendors pay anything?",
    a: "No. Vendors use DispatchToGo for free. Only operators (the ones submitting requests) are billed for platform usage.",
  },
  {
    q: "What's the Value plan?",
    a: "The Value plan is coming soon. It includes 100 completed requests per month — ideal for high-volume operators. Sign up on Free today and we'll notify you when Value launches.",
  },
];

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">DispatchToGo</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/app/login"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/app/register"
            className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Simple, usage-based pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Start free. Pay only for what you use. No surprises.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-8">

            {/* Free plan */}
            <div className="bg-white rounded-3xl border-2 border-blue-600 shadow-xl shadow-blue-600/10 overflow-hidden flex flex-col">
              <div className="bg-blue-600 text-white text-center py-3 text-sm font-medium">
                <Zap className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                Available now
              </div>
              <div className="p-8 flex flex-col flex-1">
                <h2 className="text-2xl font-bold text-gray-900">Free</h2>
                <p className="text-gray-500 mt-1">For operators getting started</p>

                <div className="mt-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-500 text-lg">/month</span>
                  </div>
                  <p className="text-gray-500 mt-2">
                    Then{" "}
                    <span className="font-semibold text-gray-700">$0.25 CAD</span>
                    {" "}per completed request over 15
                  </p>
                </div>

                <Link
                  href="/app/register"
                  className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white text-base font-semibold px-6 py-3.5 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-400">
                  <Clock className="w-3.5 h-3.5" /> No credit card required to start
                </div>

                <div className="mt-8 border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                    Included
                  </h3>
                  <ul className="space-y-3">
                    {FREE_FEATURES.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Value plan — coming soon */}
            <div className="bg-gray-50 rounded-3xl border-2 border-gray-200 overflow-hidden flex flex-col opacity-75">
              <div className="bg-gray-200 text-gray-600 text-center py-3 text-sm font-medium">
                Coming soon
              </div>
              <div className="p-8 flex flex-col flex-1">
                <h2 className="text-2xl font-bold text-gray-700">Value</h2>
                <p className="text-gray-400 mt-1">For high-volume operators</p>

                <div className="mt-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-gray-400">TBD</span>
                  </div>
                  <p className="text-gray-400 mt-2">
                    Then{" "}
                    <span className="font-semibold">$0.25 CAD</span>
                    {" "}per completed request over 100
                  </p>
                </div>

                <div className="mt-8 inline-flex items-center justify-center w-full bg-gray-200 text-gray-500 text-base font-semibold px-6 py-3.5 rounded-xl cursor-not-allowed">
                  Coming Soon
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Included
                  </h3>
                  <ul className="space-y-3">
                    {VALUE_FEATURES.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-500">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* How billing works */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How billing works</h2>
          <div className="grid sm:grid-cols-3 gap-6 text-left mt-8">
            {[
              {
                step: "1",
                title: "Submit requests",
                body: "Operators submit maintenance requests through the dashboard. All platform features are available on every plan.",
              },
              {
                step: "2",
                title: "Jobs get completed",
                body: "A request becomes billable only when its job is marked Completed or Verified by the vendor. Cancelled or in-progress jobs don't count.",
              },
              {
                step: "3",
                title: "Invoiced at month-end",
                body: "At the end of each month, we tally your completed requests. Overage is invoiced via Stripe with a 30-day payment window.",
              },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 flex items-start gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  {faq.q}
                </h3>
                <p className="mt-2 text-gray-600 ml-7">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold">DispatchToGo</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/app/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/app/register" className="hover:text-white transition-colors">
                Register
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} DispatchToGo. Cornwall &amp; SDG, Ontario.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const included = [
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

