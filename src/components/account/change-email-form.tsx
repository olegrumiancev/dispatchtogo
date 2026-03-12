"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ChangeEmailFormProps {
  currentEmail: string;
}

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps) {
  const searchParams = useSearchParams();
  const { update } = useSession();
  const syncedEmailRef = useRef<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmed = searchParams.get("emailChange") === "confirmed";
  const confirmedEmail = searchParams.get("email");

  useEffect(() => {
    if (!confirmed || !confirmedEmail || syncedEmailRef.current === confirmedEmail) {
      return;
    }

    syncedEmailRef.current = confirmedEmail;
    setSuccess(`Login email changed successfully to ${confirmedEmail}.`);
    setError(null);
    update({ email: confirmedEmail }).catch((sessionError) => {
      console.error("[ChangeEmailForm] session update failed", sessionError);
    });
  }, [confirmed, confirmedEmail, update]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/account/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail,
          currentPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start email change");
      }

      setSuccess(data.message ?? "Confirmation email sent.");
      setCurrentPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Login Email</CardTitle>
        <p className="text-sm text-gray-500">
          Confirm the new email from your inbox before the login address changes. This does not update organization or company contact emails.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current Login Email"
            value={currentEmail}
            readOnly
            disabled
          />

          <Input
            label="New Login Email"
            type="email"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setSuccess(null);
              setError(null);
            }}
            autoComplete="email"
            required
          />

          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setSuccess(null);
              setError(null);
            }}
            autoComplete="current-password"
            required
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving} disabled={saving}>
              Send Confirmation Email
            </Button>
            <Link
              href="/app/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Forgot your password?
            </Link>
          </div>

          {success && <p className="text-sm text-green-600">{success}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
