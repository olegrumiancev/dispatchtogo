"use client";

import { useEffect, useState, useCallback } from "react";
import { Settings, Mail, Loader2, CheckCircle2, AlertCircle, Copy, Wrench, KeyRound, Eye, EyeOff } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────────────────── */

interface SettingsData {
  emailVerification: boolean;
  emailPasswordReset: boolean;
  emailNewRegistration: boolean;
  emailAccountApproved: boolean;
  emailAccountRejected: boolean;
  emailVendorDispatch: boolean;
  emailOperatorStatusUpdate: boolean;
  emailJobCompletion: boolean;
  emailVendorRejection: boolean;
  emailAdminRejection: boolean;
  emailWelcome: boolean;
  bccEnabled: boolean;
  bccAddresses: string;
}

const DEFAULT_SETTINGS: SettingsData = {
  emailVerification: true,
  emailPasswordReset: true,
  emailNewRegistration: true,
  emailAccountApproved: true,
  emailAccountRejected: true,
  emailVendorDispatch: true,
  emailOperatorStatusUpdate: true,
  emailJobCompletion: true,
  emailVendorRejection: true,
  emailAdminRejection: true,
  emailWelcome: true,
  bccEnabled: false,
  bccAddresses: "",
};

/* ── Email event metadata ───────────────────────────────────────────────────────────────────────────── */

interface EventMeta {
  key: keyof SettingsData;
  label: string;
  description: string;
  recipient: string;
}

const EMAIL_EVENTS: EventMeta[] = [
  {
    key: "emailVerification",
    label: "Email Verification",
    description: "Verification link sent when a new user registers.",
    recipient: "New user",
  },
  {
    key: "emailPasswordReset",
    label: "Password Reset",
    description: "Reset link sent when a user requests a password change.",
    recipient: "Requesting user",
  },
  {
    key: "emailNewRegistration",
    label: "New Registration Notification",
    description: "Notifies admins when a new user verifies their email and awaits approval.",
    recipient: "All admins",
  },
  {
    key: "emailAccountApproved",
    label: "Account Approved",
    description: "Sent to the user when an admin approves their account.",
    recipient: "Approved user",
  },
  {
    key: "emailAccountRejected",
    label: "Account Rejected",
    description: "Sent to the user when an admin rejects their registration.",
    recipient: "Rejected user",
  },
  {
    key: "emailVendorDispatch",
    label: "Vendor Job Dispatch",
    description: "Notifies a vendor when a new job is dispatched to them.",
    recipient: "Assigned vendor",
  },
  {
    key: "emailOperatorStatusUpdate",
    label: "Operator Status Update",
    description: "Notifies the operator when a vendor accepts or starts a job.",
    recipient: "Property operator",
  },
  {
    key: "emailJobCompletion",
    label: "Job Completion",
    description: "Notifies the operator when a vendor marks a job as complete.",
    recipient: "Property operator",
  },
  {
    key: "emailVendorRejection",
    label: "Vendor Work Rejection",
    description: "Notifies the vendor when an operator rejects their completed work.",
    recipient: "Assigned vendor",
  },
  {
    key: "emailAdminRejection",
    label: "Admin Rejection Alert",
    description: "Notifies all admins when an operator rejects completed work (especially disputes).",
    recipient: "All admins",
  },
  {
    key: "emailWelcome",
    label: "Welcome Email",
    description: "Welcome message sent to new users after account creation.",
    recipient: "New user",
  },
];

/* ── Component ──────────────────────────────────────────────────────────────────────────── */

type Tab = "email" | "toolbox";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("email");

  // Email settings state
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Toolbox state
  const [bulkPassword, setBulkPassword] = useState("");
  const [bulkConfirm, setBulkConfirm] = useState("");
  const [showBulkPass, setShowBulkPass] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkToast, setBulkToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch current settings on mount
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {
        setToast({ type: "error", message: "Failed to load settings." });
      })
      .finally(() => setLoading(false));
  }, []);

  // Debounced save helper
  const save = useCallback(async (patch: Partial<SettingsData>) => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSettings((prev) => ({ ...prev, ...updated }));
      setToast({ type: "success", message: "Settings saved." });
    } catch {
      setToast({ type: "error", message: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  }, []);

  // Auto-clear toasts
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!bulkToast) return;
    const t = setTimeout(() => setBulkToast(null), 4000);
    return () => clearTimeout(t);
  }, [bulkToast]);

  function toggleEvent(key: keyof SettingsData) {
    const next = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: next }));
    save({ [key]: next });
  }

  function toggleBcc() {
    const next = !settings.bccEnabled;
    setSettings((prev) => ({ ...prev, bccEnabled: next }));
    save({ bccEnabled: next });
  }

  async function handleBulkReset() {
    if (bulkPassword.length < 6) {
      setBulkToast({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    if (bulkPassword !== bulkConfirm) {
      setBulkToast({ type: "error", message: "Passwords do not match." });
      return;
    }
    setBulkLoading(true);
    setBulkToast(null);
    try {
      const res = await fetch("/api/admin/toolbox/bulk-reset-passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: bulkPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setBulkToast({ type: "success", message: `Done — ${data.updated} account(s) updated.` });
      setBulkPassword("");
      setBulkConfirm("");
      setShowConfirm(false);
    } catch (err: any) {
      setBulkToast({ type: "error", message: err.message || "Failed to reset passwords." });
    } finally {
      setBulkLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage email notifications and admin utilities.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("email")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "email"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("toolbox")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "toolbox"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Wrench className="w-4 h-4" />
          Toolbox
        </button>
      </div>

      {/* ── EMAIL TAB ── */}
      {activeTab === "email" && (
        <div className="space-y-6">
          {/* Email tab toast */}
          {toast && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {toast.message}
              {saving && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
            </div>
          )}

          {/* Email notification toggles */}
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                Email Notifications
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Toggle individual email events on or off. Disabled events will be silently skipped.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {EMAIL_EVENTS.map((evt) => (
                <div
                  key={evt.key}
                  className="flex items-center justify-between px-6 py-4 gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {evt.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {evt.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Recipient: {evt.recipient}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings[evt.key] as boolean}
                    onClick={() => toggleEvent(evt.key)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                      settings[evt.key] ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings[evt.key] ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* BCC Settings */}
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Copy className="w-4 h-4 text-slate-500" />
                Global BCC
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                When enabled, every outgoing system email will include these addresses as BCC recipients.
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* BCC toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Enable BCC on all system emails
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Copies will be sent to the addresses listed below.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.bccEnabled}
                  onClick={toggleBcc}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                    settings.bccEnabled ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.bccEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* BCC addresses input */}
              <div>
                <label
                  htmlFor="bccAddresses"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  BCC Email Addresses
                </label>
                <input
                  id="bccAddresses"
                  type="text"
                  value={settings.bccAddresses}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, bccAddresses: e.target.value }))
                  }
                  onBlur={() => save({ bccAddresses: settings.bccAddresses })}
                  placeholder="admin@example.com, manager@example.com"
                  disabled={saving}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Separate multiple addresses with commas.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── TOOLBOX TAB ── */}
      {activeTab === "toolbox" && (
        <div className="space-y-6">
          {/* Toolbox toast */}
          {bulkToast && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm ${
                bulkToast.type === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {bulkToast.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {bulkToast.message}
            </div>
          )}

          {/* Bulk Password Reset */}
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-500" />
                Bulk Password Reset
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Set a new password for every account in the system at once. Use with caution.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* New password */}
              <div>
                <label htmlFor="bulkPassword" className="block text-sm font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="bulkPassword"
                    type={showBulkPass ? "text" : "password"}
                    value={bulkPassword}
                    onChange={(e) => setBulkPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={bulkLoading}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBulkPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showBulkPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Minimum 6 characters.</p>
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="bulkConfirm" className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="bulkConfirm"
                  type={showBulkPass ? "text" : "password"}
                  value={bulkConfirm}
                  onChange={(e) => setBulkConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  disabled={bulkLoading}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              {/* Run button / confirm step */}
              {!showConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    if (bulkPassword.length < 6) {
                      setBulkToast({ type: "error", message: "Password must be at least 6 characters." });
                      return;
                    }
                    if (bulkPassword !== bulkConfirm) {
                      setBulkToast({ type: "error", message: "Passwords do not match." });
                      return;
                    }
                    setShowConfirm(true);
                  }}
                  disabled={bulkLoading || !bulkPassword || !bulkConfirm}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                  Reset All Passwords
                </button>
              ) : (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 space-y-3">
                  <p className="text-sm font-medium text-red-800">
                    Are you sure? This will overwrite the password for <strong>every account</strong> in the system and cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleBulkReset}
                      disabled={bulkLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {bulkLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      Yes, reset all passwords
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      disabled={bulkLoading}
                      className="px-4 py-2 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}