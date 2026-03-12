"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PersonalDetailsFormProps {
  initialName: string | null;
}

export function PersonalDetailsForm({
  initialName,
}: PersonalDetailsFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedInitialName = initialName ?? "";
  const unchanged = name.trim() === normalizedInitialName.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update account details");
      }

      await update({
        name: data.name ?? null,
        email: data.email,
      });
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Details</CardTitle>
        <p className="text-sm text-gray-500">
          Update your personal display name. Login email changes are managed in the separate Change Login Email section.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
              setError(null);
            }}
            placeholder="Your name"
            maxLength={100}
          />

          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving} disabled={saving || unchanged}>
              Save Details
            </Button>
            {saved && <p className="text-sm text-green-600">Saved successfully.</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
