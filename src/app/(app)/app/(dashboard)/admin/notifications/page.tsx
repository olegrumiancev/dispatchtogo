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
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage SMS notification settings and test delivery.
        </p>
      </div>

      {/* SMS Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">SMS Notifications</h2>
            <p className="text-xs text-gray-500">Powered by Twilio</p>
          </div>
          <div className="ml-auto">
            {smsEnabled ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                <XCircle className="w-3.5 h-3.5" />
                Disabled
              </span>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>
            SMS is currently{" "}
            <span className={smsEnabled ? "text-emerald-600 font-medium" : "text-gray-400 font-medium"}>
              {smsEnabled ? "active" : "inactive"}
            </span>
            . Configure{" "}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">TWILIO_*</code>{" "}
            environment variables to enable SMS delivery.
          </p>
        </div>
      </div>

      {/* Test SMS */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Send Test SMS</h2>
        <p className="text-sm text-gray-500 mb-4">
          Test the SMS pipeline by sending a message to any phone number.
        </p>

        <form onSubmit={handleSendTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+1 555 000 0000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={form.status === "sending"}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {form.status === "sending" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {form.status === "sending" ? "Sending..." : "Send Test"}
          </button>

          {form.feedback && (
            <div
              className={`text-sm px-3 py-2 rounded-lg ${
                form.status === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {form.feedback}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
