"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle, Send, Loader2 } from "lucide-react";

interface Props {
  smsEnabled: boolean;
  notifyVendorOnDispatch: boolean;
  notifyOperatorOnStatusChange: boolean;
  notifyOperatorOnCompletion: boolean;
  smsRedirectEnabled: boolean;
  smsRedirectNumber: string;
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
