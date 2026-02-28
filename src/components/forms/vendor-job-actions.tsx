"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface VendorJobActionsProps {
  jobId: string;
  mode: "available";
}

export function VendorJobActions({ jobId, mode }: VendorJobActionsProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to accept job.");
        return;
      }
      router.push(`/vendor/jobs/${jobId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    // For now, declining just removes from view by refreshing
    // (no explicit "decline" API action — vendor just doesn't accept)
    setDeclining(true);
    router.refresh();
    setDeclining(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-col gap-2">
        <Button variant="primary" size="sm" loading={accepting} onClick={handleAccept} className="w-full justify-center min-h-[44px]">
          <Check className="w-4 h-4" />
          Accept
        </Button>
        <Button variant="secondary" size="sm" loading={declining} onClick={handleDecline} className="w-full justify-center min-h-[44px]">
          <X className="w-4 h-4" />
          Decline
        </Button>
      </div>
    </div>
  );
}
