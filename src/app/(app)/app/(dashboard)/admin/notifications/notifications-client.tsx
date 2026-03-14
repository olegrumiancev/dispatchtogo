"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  MessageSquare,
  Mail,
  FileText,
  RotateCcw,
  Pencil,
  Copy,
} from "lucide-react";
import { SMS_TEMPLATE_META, type SmsTemplateKey } from "@/lib/sms-templates";

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  smsEnabled: boolean;
  emailEnabled: boolean;
  notifyVendorOnDispatch: boolean;
  notifyOperatorOnStatusChange: boolean;
  notifyOperatorOnCompletion: boolean;
  smsRedirectEnabled: boolean;
  smsRedirectNumber: string;
}

type Tab = "sms" | "email" | "templates";

interface EmailSettings {
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

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
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

const EMAIL_EVENTS: { key: keyof EmailSettings; label: string; description: string; recipient: string }[] = [
  { key: "emailVerification", label: "Email Verification", description: "Verification link sent when a new user registers.", recipient: "New user" },
  { key: "emailPasswordReset", label: "Password Reset", description: "Reset link sent when a user requests a password change.", recipient: "Requesting user" },
  { key: "emailNewRegistration", label: "New Registration Notification", description: "Notifies admins when a new user verifies their email and awaits approval.", recipient: "All admins" },
  { key: "emailAccountApproved", label: "Account Approved", description: "Sent to the user when an admin approves their account.", recipient: "Approved user" },
  { key: "emailAccountRejected", label: "Account Rejected", description: "Sent to the user when an admin rejects their registration.", recipient: "Rejected user" },
  { key: "emailVendorDispatch", label: "Vendor Job Dispatch", description: "Notifies a vendor when a new job is dispatched to them.", recipient: "Assigned vendor" },
  { key: "emailOperatorStatusUpdate", label: "Operator Status Update", description: "Notifies the operator when a vendor accepts or starts a job.", recipient: "Property operator" },
  { key: "emailJobCompletion", label: "Job Completion", description: "Notifies the operator when a vendor marks a job as complete.", recipient: "Property operator" },
  { key: "emailVendorRejection", label: "Vendor Work Rejection", description: "Notifies the vendor when an operator rejects their completed work.", recipient: "Assigned vendor" },
  { key: "emailAdminRejection", label: "Admin Rejection Alert", description: "Notifies all admins when an operator rejects completed work.", recipient: "All admins" },
  { key: "emailWelcome", label: "Welcome Email", description: "Welcome message sent to new users after account creation.", recipient: "New user" },
];

interface TemplateEntry {
  key: SmsTemplateKey;
  value: string;
  isDefault: boolean;
}

// ── Main component ───────────────────────────────────────────────────────────

export function NotificationsClient({
  smsEnabled,
  emailEnabled,
  notifyVendorOnDispatch,
  notifyOperatorOnStatusChange,
  notifyOperatorOnCompletion,
  smsRedirectEnabled: initialSmsRedirectEnabled,
  smsRedirectNumber,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("sms");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "sms" || tab === "email" || tab === "templates") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [redirectEnabled, setRedirectEnabled] = useState(initialSmsRedirectEnabled);

  // ── Test SMS state ─────────────────────────────────────────────────────────
  const [testForm, setTestForm] = useState({
    phone: "",
    message: "DispatchToGo: This is a test message from your admin panel.",
    status: "idle" as "idle" | "sending" | "success" | "error",
    feedback: "",
  });

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testForm.phone.trim() || !testForm.message.trim()) return;
    setTestForm((p) => ({ ...p, status: "sending", feedback: "" }));
    try {
      const res = await fetch("/api/admin/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testForm.phone, message: testForm.message }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestForm((p) => ({
          ...p,
          status: "success",
          feedback: data.sid ? `Sent! Message ID: ${data.sid}` : "Message logged to console (textbee not configured).",
        }));
      } else {
        setTestForm((p) => ({ ...p, status: "error", feedback: data.error ?? "Unknown error" }));
      }
    } catch {
      setTestForm((p) => ({ ...p, status: "error", feedback: "Network error — check console" }));
    }
  }

  // ── Email settings state ───────────────────────────────────────────────────
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(DEFAULT_EMAIL_SETTINGS);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailToast, setEmailToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (activeTab !== "email") return;
    setEmailLoading(true);
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => setEmailSettings((prev) => ({ ...prev, ...data })))
      .catch(() => setEmailToast({ type: "error", message: "Failed to load email settings." }))
      .finally(() => setEmailLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (!emailToast) return;
    const t = setTimeout(() => setEmailToast(null), 3000);
    return () => clearTimeout(t);
  }, [emailToast]);

  const saveEmailSettings = useCallback(async (patch: Partial<EmailSettings>) => {
    setEmailSaving(true);
    setEmailToast(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setEmailSettings((prev) => ({ ...prev, ...updated }));
      setEmailToast({ type: "success", message: "Saved." });
    } catch {
      setEmailToast({ type: "error", message: "Failed to save." });
    } finally {
      setEmailSaving(false);
    }
  }, []);

  function toggleEmailEvent(key: keyof EmailSettings) {
    const next = !emailSettings[key];
    setEmailSettings((prev) => ({ ...prev, [key]: next }));
    saveEmailSettings({ [key]: next });
  }

  // ── Template state ─────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<SmsTemplateKey | null>(null);
  const [editValue, setEditValue] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateToast, setTemplateToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (activeTab !== "templates") return;
    setTemplatesLoading(true);
    fetch("/api/admin/settings?section=sms-templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data))
      .catch(() => setTemplateToast({ type: "error", message: "Failed to load templates." }))
      .finally(() => setTemplatesLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (!templateToast) return;
    const t = setTimeout(() => setTemplateToast(null), 3000);
    return () => clearTimeout(t);
  }, [templateToast]);

  function startEdit(entry: TemplateEntry) {
    setEditingKey(entry.key);
    setEditValue(entry.value);
  }

  async function saveTemplate(key: SmsTemplateKey, value: string) {
    setTemplateSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsTemplate: { key, value } }),
      });
      if (!res.ok) throw new Error();
      setTemplates((prev) =>
        prev.map((t) => (t.key === key ? { ...t, value, isDefault: false } : t))
      );
      setEditingKey(null);
      setTemplateToast({ type: "success", message: "Template saved." });
    } catch {
      setTemplateToast({ type: "error", message: "Failed to save template." });
    } finally {
      setTemplateSaving(false);
    }
  }

  async function resetTemplate(key: SmsTemplateKey) {
    setTemplateSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsTemplate: { key, value: null } }),
      });
      if (!res.ok) throw new Error();
      // Re-fetch to get the default value
      const refreshed = await fetch("/api/admin/settings?section=sms-templates").then((r) => r.json());
      setTemplates(refreshed);
      setEditingKey(null);
      setTemplateToast({ type: "success", message: "Reset to default." });
    } catch {
      setTemplateToast({ type: "error", message: "Failed to reset template." });
    } finally {
      setTemplateSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <TabButton active={activeTab === "sms"} onClick={() => setActiveTab("sms")} icon={<MessageSquare className="w-4 h-4" />} label="SMS" />
        <TabButton active={activeTab === "email"} onClick={() => setActiveTab("email")} icon={<Mail className="w-4 h-4" />} label="Email" />
        <TabButton active={activeTab === "templates"} onClick={() => setActiveTab("templates")} icon={<FileText className="w-4 h-4" />} label="Message Templates" />
      </div>

      {/* ── SMS Tab ── */}
      {activeTab === "sms" && (
        <div className="space-y-6">
          {/* Configuration Status */}
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Configuration Status</h2>
            <div className="space-y-3">
              <StatusRow
                label="textbee Integration"
                enabled={smsEnabled}
                description={
                  smsEnabled
                    ? "Credentials detected — SMS will be delivered via textbee."
                    : "TEXTBEE_API_KEY / TEXTBEE_DEVICE_ID not set — messages are logged to console only."
                }
              />
              <StatusRow label="Notify vendor on dispatch" enabled={notifyVendorOnDispatch} />
              <StatusRow label="Notify operator on status change" enabled={notifyOperatorOnStatusChange} />
              <StatusRow label="Notify operator on job completion" enabled={notifyOperatorOnCompletion} />
            </div>
          </section>

          {/* SMS Redirect Failsafe */}
          <section className={`rounded-lg border p-6 ${redirectEnabled ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
            <h2 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${redirectEnabled ? "text-amber-500" : "text-slate-400"}`} />
              SMS Redirect
              {redirectEnabled && (
                <span className="ml-1 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold tracking-wide">ACTIVE</span>
              )}
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              When enabled, <strong>all outbound SMS</strong> are re-routed to the number below instead of real recipients. Use during system testing only.
            </p>
            <RedirectForm
              initialEnabled={redirectEnabled}
              initialNumber={smsRedirectNumber}
              onEnabledChange={setRedirectEnabled}
              onSaved={() => router.refresh()}
            />
          </section>

          {/* Test SMS */}
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Send a Test SMS</h2>
            <p className="text-sm text-slate-500 mb-4">Verify your textbee credentials by sending a test message.</p>
            <form onSubmit={handleSendTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={testForm.phone}
                  onChange={(e) => setTestForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+16135550000"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={testForm.message}
                  onChange={(e) => setTestForm((p) => ({ ...p, message: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={testForm.status === "sending"}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {testForm.status === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {testForm.status === "sending" ? "Sending…" : "Send Test SMS"}
              </button>
              {testForm.feedback && (
                <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${testForm.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                  {testForm.status === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  {testForm.feedback}
                </div>
              )}
            </form>
          </section>
        </div>
      )}

      {/* ── Email Tab ── */}
      {activeTab === "email" && (
        <div className="space-y-6">
          {/* Config status */}
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Configuration Status</h2>
            <StatusRow
              label="SMTP Integration"
              enabled={emailEnabled}
              description={
                emailEnabled
                  ? "SMTP credentials detected — emails will be delivered."
                  : "SMTP_HOST / SMTP_USER / SMTP_PASS not set — emails are logged to console only."
              }
            />
          </section>

          {emailToast && <Toast toast={emailToast} saving={emailSaving} />}

          {emailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {/* Email notification toggles */}
              <section className="rounded-lg border border-slate-200 bg-white">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    Email Notifications
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">Toggle individual email events on or off. Disabled events will be silently skipped.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {EMAIL_EVENTS.map((evt) => (
                    <div key={evt.key} className="flex items-center justify-between px-6 py-4 gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{evt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{evt.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Recipient: {evt.recipient}</p>
                      </div>
                      <Toggle
                        checked={emailSettings[evt.key] as boolean}
                        onChange={() => toggleEmailEvent(evt.key)}
                        disabled={emailSaving}
                      />
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
                  <p className="text-sm text-slate-500 mt-0.5">When enabled, every outgoing system email will include these addresses as BCC recipients.</p>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Enable BCC on all system emails</p>
                      <p className="text-xs text-slate-500 mt-0.5">Copies will be sent to the addresses listed below.</p>
                    </div>
                    <Toggle
                      checked={emailSettings.bccEnabled}
                      onChange={() => {
                        const next = !emailSettings.bccEnabled;
                        setEmailSettings((prev) => ({ ...prev, bccEnabled: next }));
                        saveEmailSettings({ bccEnabled: next });
                      }}
                      disabled={emailSaving}
                    />
                  </div>
                  <div>
                    <label htmlFor="bccAddresses" className="block text-sm font-medium text-slate-700 mb-1">BCC Email Addresses</label>
                    <input
                      id="bccAddresses"
                      type="text"
                      value={emailSettings.bccAddresses}
                      onChange={(e) => setEmailSettings((prev) => ({ ...prev, bccAddresses: e.target.value }))}
                      onBlur={() => saveEmailSettings({ bccAddresses: emailSettings.bccAddresses })}
                      placeholder="admin@example.com, manager@example.com"
                      disabled={emailSaving}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <p className="text-xs text-slate-400 mt-1">Separate multiple addresses with commas.</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ── Templates Tab ── */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Customise the text sent in each SMS notification. Use <code className="bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-mono">{"{variable}"}</code> placeholders — they will be replaced with real values when the message is sent. Editing a template marks it as custom; you can reset to the built-in default at any time.
          </div>

          {templateToast && <Toast toast={templateToast} saving={templateSaving} />}

          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {SMS_TEMPLATE_META.map((meta) => {
                const entry = templates.find((t) => t.key === meta.key);
                const isEditing = editingKey === meta.key;

                return (
                  <section key={meta.key} className="rounded-lg border border-slate-200 bg-white">
                    <div className="px-5 py-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                            {entry && !entry.isDefault && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Custom</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Recipient: {meta.recipient}</p>
                        </div>
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => entry && startEdit(entry)}
                            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white text-slate-600 text-xs font-medium rounded-md hover:bg-slate-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        )}
                      </div>

                      {/* Variables hint */}
                      <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                        {meta.variables.map((v) => (
                          <code key={v} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{v}</code>
                        ))}
                      </div>

                      {/* Current value / edit area */}
                      {isEditing ? (
                        <div className="space-y-3">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            rows={Math.max(3, editValue.split("\n").length + 1)}
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveTemplate(meta.key, editValue)}
                              disabled={templateSaving}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {templateSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              Save
                            </button>
                            {entry && !entry.isDefault && (
                              <button
                                type="button"
                                onClick={() => resetTemplate(meta.key)}
                                disabled={templateSaving}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white text-slate-600 text-xs font-medium rounded-md hover:bg-slate-50 disabled:opacity-50"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset to default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingKey(null)}
                              disabled={templateSaving}
                              className="px-3 py-1.5 border border-slate-200 bg-white text-slate-500 text-xs font-medium rounded-md hover:bg-slate-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 font-mono whitespace-pre-wrap break-words">
                          {entry?.value ?? "Loading…"}
                        </pre>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Toast({
  toast,
  saving,
}: {
  toast: { type: "success" | "error"; message: string };
  saving?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm ${
        toast.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {toast.message}
      {saving && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
    </div>
  );
}

function RedirectForm({
  initialEnabled,
  initialNumber,
  onEnabledChange,
  onSaved,
}: {
  initialEnabled: boolean;
  initialNumber: string;
  onEnabledChange: (val: boolean) => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [number, setNumber] = useState(initialNumber);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function handleEnabledChange(val: boolean) {
    setEnabled(val);
    onEnabledChange(val);
  }

  async function save() {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsRedirectEnabled: enabled, smsRedirectNumber: number }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        onSaved();
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus("idle"), 2500);
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleEnabledChange(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
        />
        <span className="text-sm font-medium text-slate-700">Redirect all SMS to test number</span>
      </label>
      <div className="flex gap-2">
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+16135550000"
          className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={save}
          disabled={saveStatus === "saving"}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:opacity-50"
        >
          {saveStatus === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Error" : "Save"}
        </button>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  enabled,
  description,
}: {
  label: string;
  enabled: boolean;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {enabled ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
      )}
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}


interface TestSMSState {
  phone: string;
  message: string;
  status: "idle" | "sending" | "success" | "error";
  feedback: string;
}

export function NotificationsClient({
  smsEnabled,
  notifyVendorOnDispatch,
  notifyOperatorOnStatusChange,
  notifyOperatorOnCompletion,
  smsRedirectEnabled: initialSmsRedirectEnabled,
  smsRedirectNumber,
}: Props) {
  const router = useRouter();
  const [redirectEnabled, setRedirectEnabled] = useState(initialSmsRedirectEnabled);
  const [form, setForm] = useState<TestSMSState>({
    phone: "",
    message: "DispatchToGo: This is a test message from your admin panel.",
    status: "idle",
    feedback: "",
  });

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!form.phone.trim() || !form.message.trim()) return;

    setForm((prev) => ({ ...prev, status: "sending", feedback: "" }));

    try {
      const res = await fetch("/api/admin/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, message: form.message }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setForm((prev) => ({
          ...prev,
          status: "success",
          feedback: data.sid
            ? `Sent! Message ID: ${data.sid}`
            : "Message logged to console (textbee not configured).",
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          status: "error",
          feedback: data.error ?? "Unknown error",
        }));
      }
    } catch {
      setForm((prev) => ({
        ...prev,
        status: "error",
        feedback: "Network error — check console",
      }));
    }
  }

  return (
    <>
      {/* Configuration Status */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Configuration Status
        </h2>
        <div className="space-y-3">
          <StatusRow
            label="textbee Integration"
            enabled={smsEnabled}
            description={
              smsEnabled
                ? "Credentials detected — SMS will be delivered via textbee."
                : "TEXTBEE_API_KEY / TEXTBEE_DEVICE_ID not set — messages are logged to console only."
            }
          />
          <StatusRow
            label="Notify vendor on dispatch"
            enabled={notifyVendorOnDispatch}
          />
          <StatusRow
            label="Notify operator on status change"
            enabled={notifyOperatorOnStatusChange}
          />
          <StatusRow
            label="Notify operator on job completion"
            enabled={notifyOperatorOnCompletion}
          />
        </div>
      </section>

      {/* SMS Redirect Failsafe */}
      <section className={`rounded-lg border p-6 ${redirectEnabled ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
        <h2 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${redirectEnabled ? "text-amber-500" : "text-slate-400"}`} />
          SMS Redirect
          {redirectEnabled && (
            <span className="ml-1 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold tracking-wide">
              ACTIVE
            </span>
          )}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          When enabled, <strong>all outbound SMS</strong> are re-routed to the number below
          instead of real recipients. Use during system testing only.
        </p>
        <RedirectForm
          initialEnabled={redirectEnabled}
          initialNumber={smsRedirectNumber}
          onEnabledChange={setRedirectEnabled}
          onSaved={() => router.refresh()}
        />
      </section>

      {/* Test SMS */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-1">
          Send a Test SMS
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Verify your textbee credentials by sending a test message.
        </p>

        <form onSubmit={handleSendTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+16135550000"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Message
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              rows={3}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={form.status === "sending"}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {form.status === "sending" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {form.status === "sending" ? "Sending…" : "Send Test SMS"}
          </button>

          {form.feedback && (
            <div
              className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                form.status === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {form.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              {form.feedback}
            </div>
          )}
        </form>
      </section>
    </>
  );
}

function RedirectForm({
  initialEnabled,
  initialNumber,
  onEnabledChange,
  onSaved,
}: {
  initialEnabled: boolean;
  initialNumber: string;
  onEnabledChange: (val: boolean) => void;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [number, setNumber] = useState(initialNumber);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function handleEnabledChange(val: boolean) {
    setEnabled(val);
    onEnabledChange(val);
  }

  async function save() {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smsRedirectEnabled: enabled, smsRedirectNumber: number }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        onSaved();
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus("idle"), 2500);
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleEnabledChange(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
        />
        <span className="text-sm font-medium text-slate-700">
          Redirect all SMS to test number
        </span>
      </label>
      <div className="flex gap-2">
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+16135550000"
          className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={save}
          disabled={saveStatus === "saving"}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:opacity-50"
        >
          {saveStatus === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Error" : "Save"}
        </button>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  enabled,
  description,
}: {
  label: string;
  enabled: boolean;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {enabled ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
      )}
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
