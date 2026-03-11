import Link from "next/link";
import type { Metadata } from "next";
import {
  Truck,
  ArrowRight,
  Building2,
  Brain,
  ShieldCheck,
  Camera,
  Zap,
  FileText,
  Users,
  CheckCircle2,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

export const metadata: Metadata = {
  title: "About Us | DispatchToGo",
  description:
    "Learn how DispatchToGo helps hospitality and property operators streamline vendor dispatch, accountability, and proof of service.",
};

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo href="/" size="sm" hideWordmarkOnMobile />
        <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
          <Link href="/" className="transition-colors hover:text-gray-900">
            Home
          </Link>
          <Link href="/#features" className="transition-colors hover:text-gray-900">
            Features
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-gray-900">
            How It Works
          </Link>
          <Link href="/about" className="text-gray-900">
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
  return (
    <section className="bg-gradient-to-b from-slate-50 to-white pb-20 pt-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <Users className="h-4 w-4" />
            Built for operators, vendors, and dispatch teams
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            About DispatchToGo
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            DispatchToGo helps property operators move maintenance work from
            request to completion with less coordination overhead, better vendor
            accountability, and clearer proof of service.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/40">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Our Mission
            </p>
            <p className="mt-4 text-2xl font-semibold leading-tight text-gray-900">
              Help hospitality and property operators streamline maintenance
              coordination by turning service requests into fast, qualified
              dispatches with clear visibility and verified proof of work.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              Our Vision
            </p>
            <p className="mt-4 text-xl font-semibold leading-tight">
              Become the trusted operating system for local service dispatch,
              where every property issue is routed intelligently, every vendor
              is accountable, and every completed job is documented and easy to
              reconcile.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            Why We Exist
          </p>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Property maintenance coordination should not depend on phone tag.
          </h2>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-gray-600">
          <p>
            Too many teams still manage urgent service issues through calls,
            texts, spreadsheets, and memory. That slows response time, creates
            uncertainty for operators, and leaves vendors without a clean system
            for updates, documentation, and follow-through.
          </p>
          <p>
            DispatchToGo brings those moving parts into one workflow. Operators
            can submit a request once. The platform helps classify the issue,
            route it to a qualified vendor, track progress in real time, and
            produce a proof packet with photos, timestamps, and completion
            details.
          </p>
          <p>
            The result is a dispatch process that is faster to manage, easier
            to trust, and far more useful for operations, compliance, and
            billing.
          </p>
        </div>
      </div>
    </section>
  );
}

function BuiltFor() {
  const audiences = [
    {
      icon: Building2,
      title: "Operators",
      description:
        "Hotels, marinas, campgrounds, and property teams that need service work handled quickly and documented properly.",
    },
    {
      icon: Truck,
      title: "Vendors",
      description:
        "Tradespeople and local service providers who need a lightweight way to accept work, update job status, and submit completion records.",
    },
    {
      icon: Users,
      title: "Admins",
      description:
        "Dispatch managers and platform operators who need oversight across requests, vendors, credentials, notifications, and exceptions.",
    },
  ];

  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            Who We Serve
          </p>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            One workflow for everyone involved in the job lifecycle
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {audiences.map((audience) => (
            <div
              key={audience.title}
              className="rounded-3xl border border-gray-200 bg-white p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <audience.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {audience.title}
              </h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Principles() {
  const principles = [
    {
      icon: Brain,
      title: "Intelligent intake",
      description:
        "Plain-language requests should be easy to submit and easier to route, with AI assisting triage without replacing human judgment.",
    },
    {
      icon: Zap,
      title: "Faster dispatch",
      description:
        "Qualified, available vendors should receive work quickly, with less manual coordination and less waiting for the next update.",
    },
    {
      icon: ShieldCheck,
      title: "Operational trust",
      description:
        "Credential oversight, job status transparency, and verifiable records make it easier to trust the work and stand behind the outcome.",
    },
    {
      icon: Camera,
      title: "Proof by default",
      description:
        "Photos, timestamps, notes, and job details should be part of the process, not an afterthought after the work is done.",
    },
    {
      icon: FileText,
      title: "Ready for records",
      description:
        "Completed work should flow naturally into proof packets, invoice support, and internal reporting without duplicate admin work.",
    },
    {
      icon: CheckCircle2,
      title: "Built for real operations",
      description:
        "The platform should support practical field workflows across mobile vendors, busy operators, and admins managing exceptions.",
    },
  ];

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            What Guides Us
          </p>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            The principles behind the product
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {principles.map((principle) => (
            <div
              key={principle.title}
              className="rounded-3xl bg-gray-50 p-8 transition-colors hover:bg-gray-100"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <principle.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {principle.title}
              </h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                {principle.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BusinessDescriptor() {
  return (
    <section className="bg-slate-900 py-20 text-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
            Business Descriptor
          </p>
          <p className="mt-5 text-lg leading-relaxed text-slate-200">
            DispatchToGo is a B2B field service dispatch platform for hotels,
            marinas, campgrounds, short-term rental operators, and other
            property-based businesses that need maintenance work coordinated,
            completed, and documented with less friction.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-slate-200">
            The platform replaces fragmented workflows built around phone calls,
            text messages, spreadsheets, and manual follow-up. Operators can
            submit service requests, use AI-assisted triage to classify urgency
            and category, dispatch work to qualified vendors, monitor progress,
            track credentials, and generate proof-of-service records when the
            job is complete.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-slate-200">
            Its core value is operational clarity: faster dispatch, better
            accountability, stronger documentation, and a cleaner path from
            issue intake to completion, verification, and billing.
          </p>
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
          Ready to replace manual coordination with a better dispatch workflow?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
          Start with the free tier and see how DispatchToGo helps your team move
          from intake to proof of service with less friction.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/app/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
          >
            View Pricing
          </Link>
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
            <Link href="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <Link href="/about" className="transition-colors hover:text-white">
              About
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-white">
              Pricing
            </Link>
            <Link href="/app/login" className="transition-colors hover:text-white">
              Sign In
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

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <Hero />
      <Story />
      <BuiltFor />
      <Principles />
      <BusinessDescriptor />
      <CTA />
      <Footer />
    </div>
  );
}
