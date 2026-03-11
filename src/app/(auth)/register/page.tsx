"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { AlertCircle, Mail, Globe } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useCatalogOptions } from "@/hooks/use-catalog-options";

type Role = "OPERATOR" | "VENDOR" | "";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredCategories, setRegisteredCategories] = useState<string[]>([]);
  const [captchaToken, setCaptchaToken] = useState("");
  const turnstileRef = useRef<TurnstileInstance>(null);
  const { serviceCategories, organizationTypes } = useCatalogOptions();
  const categoryLabelMap = useMemo(
    () => Object.fromEntries(serviceCategories.map((item) => [item.value, item.label])),
    [serviceCategories]
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "" as Role,
    organizationName: "",
    organizationType: "",
    companyName: "",
    phone: "",
    categories: [] as string[],
    agreedToTerms: false,
  });

  const isOperator = form.role === "OPERATOR";
  const isVendor = form.role === "VENDOR";

  const pageSubtitle = isOperator
    ? "Create your organization account"
    : isVendor
    ? "Create your vendor account"
    : "Create your account";

  const cardTitle = isOperator
    ? "Create Organization Account"
    : isVendor
    ? "Create Vendor Account"
    : "Register";

  const submitLabel = isOperator
    ? "Create Organization Account"
    : isVendor
    ? "Create Vendor Account"
    : "Create Account";

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleCategory = (category: string) => {
    setForm((prev) => {
      const exists = prev.categories.includes(category);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== category)
          : [...prev.categories, category],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.role) {
      setError("Please select a role.");
      return;
    }
    if (form.role === "VENDOR" && form.categories.length === 0) {
      setError("Please select at least one service category.");
      return;
    }
    if (form.role === "OPERATOR" && !form.organizationType) {
      setError("Please select a property type.");
      return;
    }
    if (!form.agreedToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          tosAccepted: form.agreedToTerms,
          organizationName: form.role === "OPERATOR" ? form.organizationName : undefined,
          organizationType: form.role === "OPERATOR" ? form.organizationType : undefined,
          phone: form.phone || undefined,
          companyName: form.role === "VENDOR" ? form.companyName : undefined,
          categories: form.role === "VENDOR" ? form.categories : undefined,
          captchaToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
      } else {
        setRegisteredEmail(form.email);
        if (form.role === "VENDOR") {
          setRegisteredCategories(
            form.categories.map((value) => categoryLabelMap[value] ?? value)
          );
        } else {
          setRegisteredCategories([]);
        }
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      turnstileRef.current?.reset();
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-500 mb-2">
            We&apos;ve sent a verification link to:
          </p>
          <p className="text-sm font-medium text-gray-900 mb-6">
            {registeredEmail}
          </p>
          {registeredCategories.length > 0 && (
            <div className="text-left mb-6 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Selected service categories</p>
              <p className="text-sm text-gray-800">{registeredCategories.join(", ")}</p>
            </div>
          )}
          {isOperator && (
            <div className="text-left mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Organization account created</p>
              <p className="text-sm text-blue-900">
                Your organization profile and primary account holder login have been created.
              </p>
            </div>
          )}
          {isVendor && (
            <div className="text-left mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Vendor account created</p>
              <p className="text-sm text-blue-900">
                Your vendor profile and primary account holder login have been created.
              </p>
            </div>
          )}
          <p className="text-sm text-gray-500 mb-6">
            Click the link in the email to verify your account. After verification, an admin will review and approve your registration. You&apos;ll receive an email once approved.
          </p>
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Branding */}
      <div className="flex flex-col items-center mb-8">
        <BrandLogo
          href={process.env.NEXT_PUBLIC_WWW_BASE_URL ?? "https://www.dispatchtogo.com"}
          layout="stacked"
          size="lg"
          theme="dark"
          subtitle={pageSubtitle}
        />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{cardTitle}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {isOperator
            ? "Set up your organization and create the primary account holder login."
            : isVendor
            ? "Set up your vendor profile and create the primary account holder login."
            : "Choose your role to continue."}
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">I am registering as...</p>
            <div className="grid grid-cols-2 gap-3">
              {(["OPERATOR", "VENDOR"] as Role[]).map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.role === r
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={form.role === r}
                    onChange={() => set("role", r)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">
                    {r === "OPERATOR" ? "Property Operator" : "Service Vendor"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {(isOperator || isVendor) && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">
                {isOperator ? "Organization details" : "Vendor details"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isOperator
                  ? "This creates your organization record in DispatchToGo."
                  : "This creates your vendor company profile in DispatchToGo."}
              </p>
            </div>
          )}

          {/* Operator fields */}
          {isOperator && (
            <div className="space-y-4">
              <Input
                label="Organization Name"
                type="text"
                placeholder="Cornwall Properties Inc."
                value={form.organizationName}
                onChange={(e) => set("organizationName", e.target.value)}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="613-555-0000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                required
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">Property Type</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {organizationTypes.map((orgType) => (
                    <label
                      key={orgType.value}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                        form.organizationType === orgType.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="organizationType"
                        value={orgType.value}
                        checked={form.organizationType === orgType.value}
                        onChange={() => set("organizationType", orgType.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">{orgType.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Vendor fields */}
          {isVendor && (
            <div className="space-y-4">
              <Input
                label="Company Name"
                type="text"
                placeholder="Cornwall Electric Services"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="613-555-0000"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                required
              />

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Service Categories</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {serviceCategories.map((category) => {
                    const checked = form.categories.includes(category.value);
                    return (
                      <label
                        key={category.value}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                          checked
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(category.value)}
                          className="rounded border-gray-300"
                        />
                        <span>{category.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {(isOperator || isVendor) && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">Primary account holder</p>
              <p className="text-xs text-gray-500 mt-1">
                This person will sign in and manage the account. You can support additional users later.
              </p>
            </div>
          )}

          <Input
            label="Full Name"
            type="text"
            placeholder="Jane Smith"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              required
            />
          </div>

          {/* Terms & Privacy consent */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.agreedToTerms}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, agreedToTerms: e.target.checked }))
              }
              className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              I agree to the{" "}
              <a
                href={`${process.env.NEXT_PUBLIC_WWW_BASE_URL ?? "https://www.dispatchtogo.com"}/terms`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={`${process.env.NEXT_PUBLIC_WWW_BASE_URL ?? "https://www.dispatchtogo.com"}/privacy`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Privacy Policy
              </a>
            </span>
          </label>

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
            disabled={loading || !captchaToken || !form.agreedToTerms}
            className="w-full"
          >
            {submitLabel}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign in
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
