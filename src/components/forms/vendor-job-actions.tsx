"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptJobAction, declineJobAction } from "@/lib/actions";

interface VendorJobActionsProps {
  jobId: string;
  mode: "available" | "active";
}

export function VendorJobActions({ jobId, mode }: VendorJobActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    startTransition(async () => {
      setError(null);
      try {
        const result = await acceptJobAction(jobId);
        if (result?.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch {
        setError("Failed to accept job.");
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      setError(null);
      try {
        const result = await declineJobAction(jobId);
        if (result?.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch {
        setError("Failed to decline job.");
      }
    });
  };

  if (mode === "available") {
    return (
      <div className="flex flex-col gap-2 flex-shrink-0">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <Button
          variant="primary"
          onClick={handleAccept}
          loading={isPending}
          disabled={isPending}
          className="min-w-[100px] justify-center"
        >
          Accept
        </Button>
        <Button
          variant="secondary"
          onClick={handleDecline}
          loading={isPending}
          disabled={isPending}
          className="min-w-[100px] justify-center"
        >
          Decline
        </Button>
      </div>
    );
  }

  return null;
}
