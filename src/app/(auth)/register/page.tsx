"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Truck, AlertCircle, Mail } from "lucide-react";

type Role = "OPERATOR" | "VENDOR" | "";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "" as Role,
    organizationName: "",
    companyName: "",
    phone: "",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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
          organizationName: form.role === "OPERATOR" ? form.organizationName : undefined,
          companyName: form.role === "VENDOR" ? form.companyName : undefined,
          phone: form.role === "VENDOR" ? form.phone : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
      } else {
        setRegisteredEmail(form.email);
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
          <p className="text-sm text-gray-500 mb-6">
            Click the link in the email to verify your account, then you can sign in.
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
        <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <Truck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">DispatchToGo</h1>
        <p className="text-slate-400 text-sm mt-1">Create your account</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Register</h2>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              required
            />
          </div>

          {/* Role selector */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">I am a...</p>
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

          {/* Operator fields */}
          {form.role === "OPERATOR" && (
            <Input
              label="Organization Name"
              type="text"
              placeholder="Cornwall Properties Inc."
              value={form.organizationName}
              onChange={(e) => set("organizationName", e.target.value)}
              required
            />
          )}

          {/* Vendor fields */}
          {form.role === "VENDOR" && (
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
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            Create Account
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
      </div>
    </div>
  );
}
