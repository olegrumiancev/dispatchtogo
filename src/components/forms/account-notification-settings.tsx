"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare } from "lucide-react";

interface Prefs {
  digestEnabled: boolean;
  digestFrequency: string;
  smsOptOut: boolean;
  emailOptOut: boolean;
  emailDispatchEnabled: boolean;
  emailStatusEnabled: boolean;
  emailCompletionEnabled: boolean;
  emailIssueEnabled: boolean;
  smsDispatchEnabled: boolean;
  smsStatusEnabled: boolean;
  smsCompletionEnabled: boolean;
  smsIssueEnabled: boolean;
}

interface Props {
  initialPrefs: Prefs;
}

export default function AccountNotificationSettings({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save preferences");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message ?? "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  const Toggle = ({
    label,
    description,
    checked,
    onChange,
    disabled,
    icon: Icon,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    icon: React.ElementType;
  }) => (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${checked ? "bg-blue-600" : "bg-gray-200"}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <p className="text-sm text-gray-500">
          Control non-mandatory email and SMS notifications for your account. Security, access,
          and billing messages remain enabled.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
            <div className="mt-2 space-y-0">
              <Toggle
                label="Opt out of email notifications"
                description="Disable all non-mandatory email updates for this account."
                checked={prefs.emailOptOut}
                onChange={(value) => setPrefs((current) => ({ ...current, emailOptOut: value }))}
                icon={Mail}
              />
              <Toggle
                label="Daily digest email"
                description="Receive a daily summary of job activity."
                checked={prefs.digestEnabled && prefs.digestFrequency !== "NONE"}
                disabled={prefs.emailOptOut}
                onChange={(value) =>
                  setPrefs((current) => ({
                    ...current,
                    digestEnabled: value,
                    digestFrequency: value ? "DAILY" : "NONE",
                  }))
                }
                icon={Mail}
              />
              <Toggle
                label="Dispatch emails"
                description="Receive job offer and assignment emails."
                checked={prefs.emailDispatchEnabled}
                disabled={prefs.emailOptOut}
                onChange={(value) =>
                  setPrefs((current) => ({ ...current, emailDispatchEnabled: value }))
                }
                icon={Mail}
              />
              <Toggle
                label="Status update emails"
                description="Receive progress updates such as accepted, in progress, and resumed work."
                checked={prefs.emailStatusEnabled}
                disabled={prefs.emailOptOut}
                onChange={(value) =>
                  setPrefs((current) => ({ ...current, emailStatusEnabled: value }))
                }
                icon={Mail}
              />
              <Toggle
                label="Completion emails"
                description="Receive completion and work approval emails."
                checked={prefs.emailCompletionEnabled}
                disabled={prefs.emailOptOut}
                onChange={(value) =>
                  setPrefs((current) => ({ ...current, emailCompletionEnabled: value }))
                }
                icon={Mail}
              />
              <Toggle
                label="Issue emails"
                description="Receive alerts for rejections, declines, and cancellations."
                checked={prefs.emailIssueEnabled}
                disabled={prefs.emailOptOut}
                onChange={(value) =>
                  setPrefs((current) => ({ ...current, emailIssueEnabled: value }))
                }
                icon={Mail}
              />
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">SMS</p>
            <div className="mt-2 space-y-0">
              <Toggle
                label="Opt out of SMS notifications"
                description="Disable all non-mandatory text messages for this account."
                checked={prefs.smsOptOut}
                onChange={(value) => setPrefs((current) => ({ ...current, smsOptOut: value }))}
                icon={MessageSquare}
              />
              <Toggle
                label="Dispatch SMS"
                description="Receive job offer and assignment texts."
                checked={prefs.smsDispatchEnabled}
                disabled={prefs.smsOptOut}
                onChange={(value) =>
                  setPrefs((current) => ({ ...current, smsDispatchEnabled: value }))
                }
                icon={MessageSquare}
              />
              <Toggle
                label="Status update SMS"
                description="Receive progress texts such as accepted, in progress, en route, paused, and resumed work."
                checked={prefs.smsStatusEnabled}
                disabled={prefs.smsOptOut}
                onChange={(value) =>
                  setPrefs((current) => ({ ...current, smsStatusEnabled: value }))
                }
                icon={MessageSquare}
              />
              <Toggle
                label="Completion SMS"
                description="Receive texts when work is completed."
                checked={prefs.smsCompletionEnabled}
                disabled={prefs.smsOptOut}
                onChange={(value) =>
                  setPrefs((current) => ({ ...current, smsCompletionEnabled: value }))
                }
                icon={MessageSquare}
              />
              <Toggle
                label="Issue SMS"
                description="Receive texts for rejections, declines, and cancellations."
                checked={prefs.smsIssueEnabled}
                disabled={prefs.smsOptOut}
                onChange={(value) =>
                  setPrefs((current) => ({ ...current, smsIssueEnabled: value }))
                }
                icon={MessageSquare}
              />
            </div>
          </section>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Mandatory account, security, and billing messages are not controlled here.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Preferences"}
          </Button>
          {saved && <p className="text-sm text-green-600">Saved successfully.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
