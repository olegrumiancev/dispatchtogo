import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import {
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
import { BrandLogo } from "@/components/brand/brand-logo";
import { getRandomHeroVariant, HeroCopy } from "./hero-copy";

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo href="/" size="sm" hideWordmarkOnMobile />
        <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
          <Link href="/" className="text-gray-900">
            Home
          </Link>
          <a href="#features" className="transition-colors hover:text-gray-900">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-gray-900">
            How It Works
          </a>
          <Link href="/about" className="transition-colors hover:text-gray-900">
            About
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-gray-900">
            Pricing
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/app/login"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            Sign In
          </Link>
          <Link
            href="/app/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  noStore();
  const heroVariant = getRandomHeroVariant();

  return (
    <section className="bg-gradient-to-b from-slate-50 to-white pb-20 pt-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <Zap className="h-4 w-4" />
            Built for Cornwall &amp; SDG Tourism Operators
          </div>
          <HeroCopy variant={heroVariant} />
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/app/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Free tier included &middot; 15 requests/month &middot; No credit
            card to start
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
    <section id="features" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Everything you need to manage vendors
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            From the moment a maintenance issue is reported to the final proof
            of service — DispatchToGo handles the entire workflow.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl bg-gray-50 p-8 transition-colors hover:bg-gray-100"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="leading-relaxed text-gray-600">
                {feature.description}
              </p>
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
    <section id="how-it-works" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-gray-600">Four steps. Zero phone calls.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.step} className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
                <step.icon className="h-8 w-8 text-white" />
              </div>
              <div className="mb-2 text-sm font-bold text-blue-600">
                Step {step.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {step.description}
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
    <section className="bg-blue-600 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Ready to streamline your maintenance?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
          Join Cornwall &amp; SDG operators who are replacing phone calls and
          spreadsheets with automated dispatch and verified proof of service.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/app/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-blue-100">
          <span className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" /> 15 requests/month free
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> $0.25 CAD per additional completion
          </span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 py-12 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <BrandLogo href="/" size="sm" theme="dark" />
          <div className="flex items-center gap-6 text-sm">
            <Link href="/pricing" className="transition-colors hover:text-white">
              Pricing
            </Link>
            <Link href="/about" className="transition-colors hover:text-white">
              About
            </Link>
            <Link href="/app/login" className="transition-colors hover:text-white">
              Sign In
            </Link>
            <Link href="/app/register" className="transition-colors hover:text-white">
              Register
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} DispatchToGo. Cornwall &amp; SDG,
            Ontario.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
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
