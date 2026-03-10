"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Truck, AlertCircle, CheckCircle, Mail, Globe } from "lucide-react";

function getDashboardUrl(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/app/admin";
    case "VENDOR":
      return "/app/vendor/jobs";
    case "OPERATOR":
    default:
      return "/app/operator";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const turnstileRef = useRef<TurnstileInstance>(null);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      if (searchParams.get("pending") === "true") {
        setInfo("Email verified successfully! Your account is now pending admin approval. You'll receive an email once approved.");
      } else {
        setInfo("Email verified successfully! You can now sign in.");
      }
    }
    if (searchParams.get("error") === "invalid-verification") {
      setError("Invalid or expired verification link.");
    }
    if (searchParams.get("error") === "verification-failed") {
      setError("Verification failed. Please try again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setShowResendVerification(false);
    setResendSent(false);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        turnstileToken: captchaToken,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "CAPTCHA_FAILED") {
          setError("CAPTCHA verification failed. Please try again.");
        } else if (result.error === "EMAIL_NOT_VERIFIED") {
          setError("Please verify your email before signing in.");
          setShowResendVerification(true);
        } else if (result.error === "ACCOUNT_PENDING_APPROVAL") {
          setError("Your account is pending admin approval. You'll receive an email once approved.");
        } else if (result.error === "ACCOUNT_REJECTED") {
          setError("Your account registration was not approved. Please contact support if you believe this is an error.");
        } else if (result.error === "ACCOUNT_DISABLED") {
          setError("Your account has been disabled. Please contact an administrator for assistance.");
        } else if (result.error === "ORG_SUSPENDED") {
          setError("Your organization is currently suspended. Please contact DispatchToGo support or your administrator.");
        } else if (result.error === "ORG_OFFBOARDED") {
          setError("Your organization has been offboarded and no longer has operational access.");
        } else if (result.error === "VENDOR_SUSPENDED") {
          setError("Your vendor account is suspended. Please contact DispatchToGo support or an administrator.");
        } else if (result.error === "VENDOR_OFFBOARDED") {
          setError("Your vendor account has been offboarded and no longer has operational access.");
        } else {
          setError("Invalid email or password. Please try again.");
        }
        setLoading(false);
        return;
      }

      const session = await getSession();
      const role = (session?.user as any)?.role ?? "OPERATOR";
      const dashboardUrl = getDashboardUrl(role);

      // Redirect to the originally requested URL if present and same-origin
      const callbackUrl = searchParams.get("callbackUrl");
      let destination = dashboardUrl;
      if (callbackUrl) {
        try {
          const parsed = new URL(callbackUrl);
          // Only follow the redirect if it points to the same origin
          if (parsed.origin === window.location.origin) {
            destination = parsed.pathname + parsed.search + parsed.hash;
          }
        } catch {
          // callbackUrl is already a relative path; ensure it is not protocol-relative (e.g. "//evil.com")
          if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
            destination = callbackUrl;
          }
        }
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      turnstileRef.current?.reset();
    }
  };

  const handleResendVerification = async () => {
    if (!captchaToken) return;
    setResendLoading(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), captchaToken }),
      });
      setResendSent(true);
    } catch {
      // silent fail
    } finally {
      setResendLoading(false);
      turnstileRef.current?.reset();
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Branding */}
      <div className="flex flex-col items-center mb-8">
        <a href={process.env.NEXT_PUBLIC_WWW_BASE_URL ?? "https://www.dispatchtogo.com"}>
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
        </a>
        <h1 className="text-3xl font-bold text-white">DispatchToGo</h1>
        <p className="text-slate-400 text-sm mt-1">Field service management</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign In</h2>

        {info && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {info}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <div>
              <p>{error}</p>
              {showResendVerification && !resendSent && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading || !captchaToken}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium underline text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading
                    ? "Sending..."
                    : !captchaToken
                    ? "Complete the CAPTCHA below to resend"
                    : "Resend verification email"}
                </button>
              )}
              {resendSent && (
                <p className="mt-2 text-emerald-600 text-xs flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Verification email sent! Check your inbox.
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={setCaptchaToken}
            onError={() => setCaptchaToken("")}
            onExpire={() => setCaptchaToken("")}
            options={{ theme: "light" }}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading || !captchaToken}
            className="w-full"
          >
            Sign In
          </Button>
        </form>

        <div className="text-center mt-4">
          <Link
            href="/app/forgot-password"
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            Forgot your password?
          </Link>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don&apos;t have an account?{" "}
          <Link
            href="/app/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Register here
          </Link>
        </p>
        
        <p className="text-center">
          <a href={process.env.NEXT_PUBLIC_WWW_BASE_URL ?? "https://www.dispatchtogo.com"} className="text-center mt-3 text-blue-600 text-xs inline-flex items-center gap-1">
            <Globe className="w-3 h-3" /> Dispatch To Go
          </a>
        </p>
        
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
