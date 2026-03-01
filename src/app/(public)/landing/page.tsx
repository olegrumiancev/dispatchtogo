import Link from "next/link";
import {
  Truck,
  Zap,
  Shield,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Building2,
  Wrench,
  Camera,
  Brain,
  Clock,
  FileText,
} from "lucide-react";

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
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
          <Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
        </div>
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

function Hero() {
  return (
    <section className="pt-32 pb-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            Built for Cornwall &amp; SDG Tourism Operators
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
            Dispatch vendors.{" "}
            <span className="text-blue-600">Track everything.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            DispatchToGo is a managed vendor network for hotels, marinas, and property operators.
            Submit a maintenance request, and we handle triage, dispatch, and proof of service — automatically.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-white text-gray-700 text-lg font-semibold px-8 py-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            30-day free trial &middot; No credit card required
          </p>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Triage",
      description:
        "Submit a request in plain language. Our AI classifies the issue, assesses urgency, and routes it to the right vendor category automatically.",
    },
    {
      icon: Zap,
      title: "Auto-Dispatch",
      description:
        "Jobs are dispatched to qualified, available vendors in your network — load-balanced by workload and skill match. No more phone tag.",
    },
    {
      icon: Camera,
      title: "Photo Documentation",
      description:
        "Before-and-after photos, GPS stamps, and time logs. Every job builds a complete proof-of-service packet for your records.",
    },
    {
      icon: Shield,
      title: "Vendor Credentials",
      description:
        "Track licenses, insurance, and certifications for every vendor. Get alerted before anything expires.",
    },
    {
      icon: BarChart3,
      title: "Real-Time Dashboard",
      description:
        "See every request, job, and vendor status at a glance. Filter by property, urgency, or category. Export reports anytime.",
    },
    {
      icon: FileText,
      title: "Proof Packets & Invoices",
      description:
        "Auto-generated proof-of-service PDFs and invoice tracking. Everything your accountant needs, without the paperwork.",
    },
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Everything you need to manage vendors
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            From the moment a maintenance issue is reported to the final proof of service — DispatchToGo handles the entire workflow.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-gray-50 rounded-2xl p-8 hover:bg-gray-100 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
                <f.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {f.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Building2,
      step: "1",
      title: "Operator Submits a Request",
      description:
        "A hotel manager notices a leaky faucet. They open DispatchToGo, describe the issue, snap a photo, and hit submit.",
    },
    {
      icon: Brain,
      step: "2",
      title: "AI Triages & Dispatches",
      description:
        'Our AI reads the description, classifies it as "Plumbing — Medium Urgency," and dispatches the nearest available plumber in your vendor network.',
    },
    {
      icon: Wrench,
      step: "3",
      title: "Vendor Completes the Job",
      description:
        "The vendor accepts on their phone, drives over, fixes the faucet, takes before/after photos, and logs their time.",
    },
    {
      icon: CheckCircle2,
      step: "4",
      title: "Proof Packet Delivered",
      description:
        "The operator gets a complete proof-of-service PDF with photos, timestamps, and materials used. Ready for the books.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            How it works
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Four steps. Zero phone calls.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/20">
                <s.icon className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-bold text-blue-600 mb-2">
                Step {s.step}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {s.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20 bg-blue-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Ready to streamline your maintenance?
        </h2>
        <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
          Join Cornwall &amp; SDG operators who are replacing phone calls and spreadsheets with automated dispatch and verified proof of service.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 text-lg font-semibold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-blue-100 text-sm">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> 30-day free trial
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> No credit card required
          </span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
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
            <Link href="/pricing" className="hover:text-white transition-colors">
              Pricing
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
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <Hero />
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}
