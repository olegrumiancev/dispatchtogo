"use client";

import { useState } from "react";
import { Bell, CheckCircle2, XCircle, Send, Loader2 } from "lucide-react";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";

interface TestSMSState {
  phone: string;
  message: string;
  status: "idle" | "sending" | "success" | "error";
  feedback: string;
}

export default function NotificationsPage() {
  const [form, setForm] = useState<TestSMSState>({
    phone: "",
    message: "DispatchToGo: This is a test message from your admin panel.",
    status: "idle",
    feedback: "",
  });

  const smsEnabled = NOTIFICATION_SETTINGS.smsEnabled;

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
            ? `Sent! Twilio SID: ${data.sid}`
            : "Message logged to console (Twilio not configured).",
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          status: "error",
          feedback: data.error ?? "Unknown error",
        }));
      }
    } catch (err) {
      setForm((prev) => ({
        ...prev,
        status: "error",
        feedback: "Network error — check console",
      }));
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-600" />
          SMS Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage Twilio SMS configuration and send test messages.
        </p>
      </div>

      {/* Configuration Status */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Configuration Status
        </h2>
        <div className="space-y-3">
          <StatusRow
            label="Twilio Integration"
            enabled={smsEnabled}
            description={
              smsEnabled
                ? "Credentials detected — SMS will be delivered via Twilio."
                : "TWILIO_ACCOUNT_SID not set — messages are logged to console only."
            }
          />
          <StatusRow
            label="Notify vendor on dispatch"
            enabled={NOTIFICATION_SETTINGS.notifyVendorOnDispatch}
          />
          <StatusRow
            label="Notify operator on status change"
            enabled={NOTIFICATION_SETTINGS.notifyOperatorOnStatusChange}
          />
          <StatusRow
            label="Notify operator on job completion"
            enabled={NOTIFICATION_SETTINGS.notifyOperatorOnCompletion}
          />
        </div>
      </section>

      {/* Test SMS */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-1">
          Send a Test SMS
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Verify your Twilio credentials by sending a test message.
        </p>

        <form onSubmit={handleSendTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
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
              onChange={(e) =>
                setForm((p) => ({ ...p, message: e.target.value }))
              }
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

      {/* Events legend */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Automatic Notification Events
        </h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>
            <strong>Vendor dispatched</strong> — SMS sent to vendor when a job is assigned.
          </li>
          <li>
            <strong>Job accepted / rejected</strong> — SMS sent to operator when vendor responds.
          </li>
          <li>
            <strong>Job started</strong> — SMS sent to operator when vendor begins work.
          </li>
          <li>
            <strong>Job completed</strong> — SMS sent to operator when vendor marks work done.
          </li>
        </ul>
      </section>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

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
