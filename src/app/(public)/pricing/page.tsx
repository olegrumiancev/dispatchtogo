import Link from "next/link";
import {
  Truck,
  CheckCircle2,
  ArrowRight,
  Shield,
  Clock,
  Zap,
  HelpCircle,
} from "lucide-react";

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

const faqs = [
  {
    q: "What counts as a dispatch?",
    a: "A dispatch is when a service request is assigned to a vendor. If a vendor declines and the job is re-dispatched, that counts as one dispatch — not two.",
  },
  {
    q: "Can I add more properties later?",
    a: "Yes. Your subscription covers unlimited properties. Add as many as you need at no extra cost.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "No long-term contracts. Pay month-to-month and cancel anytime. During your free trial, you won't be charged at all.",
  },
  {
    q: "What happens after the free trial?",
    a: "After 30 days, you'll be asked to enter payment details to continue. All your data and vendor network remain intact.",
  },
  {
    q: "Do vendors pay anything?",
    a: "No. Vendors use DispatchToGo for free. Only operators (the ones submitting requests) pay the subscription and per-dispatch fee.",
  },
  {
    q: "Can I try it during the pilot period?",
    a: "Yes! If you're a Cornwall & SDG operator joining our pilot program, the platform is completely free during the pilot period.",
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
            href="/login"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
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
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            One plan. Everything included. Pay a small base fee plus a per-dispatch charge that scales with your usage.
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="pb-20">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border-2 border-blue-600 shadow-xl shadow-blue-600/10 overflow-hidden">
            {/* Pilot Banner */}
            <div className="bg-blue-600 text-white text-center py-3 text-sm font-medium">
              <Zap className="w-4 h-4 inline-block mr-1 -mt-0.5" />
              Free during pilot &middot; 30-day free trial after
            </div>

            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900">DispatchToGo Pro</h2>
              <p className="text-gray-500 mt-1">For operators of any size</p>

              <div className="mt-8 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-gray-900">$99</span>
                <span className="text-gray-500 text-lg">/month</span>
              </div>
              <p className="text-gray-500 mt-2">
                + <span className="font-semibold text-gray-700">$5</span> per dispatch
              </p>

              <Link
                href="/register"
                className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>

              <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 30 days free
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> No credit card
                </span>
              </div>

              {/* Included features */}
              <div className="mt-10 border-t border-gray-100 pt-8">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                  Everything included
                </h3>
                <ul className="space-y-3">
                  {included.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Volume note */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Managing 50+ dispatches per month?{" "}
            <a
              href="mailto:oleg@dispatchtogo.com"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Contact us for volume pricing
            </a>
          </p>
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
              <div
                key={faq.q}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
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
              <Link href="/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/register" className="hover:text-white transition-colors">
                Register
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
