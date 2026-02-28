"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface VerifyCompletionButtonProps {
  requestId: string;
}

export function VerifyCompletionButton({ requestId }: VerifyCompletionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_completion" }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to verify completion");
      }
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <p className="text-sm text-green-600 font-medium">
        ✓ Completion verified
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleVerify} loading={loading}>
        Verify Completion
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
