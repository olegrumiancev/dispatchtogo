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
    icon: Icon,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    icon: React.ElementType;
  }) => (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
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
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
        <p className="text-sm text-gray-500">
          Control how and when you receive notifications. Transactional alerts (dispatch, completion,
          urgent changes) are always sent and cannot be disabled.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          <Toggle
            label="Daily digest email"
            description="Receive a daily summary of job activity. Sent each evening."
            checked={prefs.digestEnabled && prefs.digestFrequency !== "NONE"}
            onChange={(v) =>
              setPrefs((p) => ({
                ...p,
                digestEnabled: v,
                digestFrequency: v ? "DAILY" : "NONE",
              }))
            }
            icon={Mail}
          />
          <Toggle
            label="Opt out of SMS notifications"
            description="Disable all SMS messages. You will still receive email notifications."
            checked={prefs.smsOptOut}
            onChange={(v) => setPrefs((p) => ({ ...p, smsOptOut: v }))}
            icon={MessageSquare}
          />
          <Toggle
            label="Opt out of email notifications"
            description="Disable all email messages (including digests). In-app notifications remain active."
            checked={prefs.emailOptOut}
            onChange={(v) => setPrefs((p) => ({ ...p, emailOptOut: v }))}
            icon={Mail}
          />
        </div>

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
