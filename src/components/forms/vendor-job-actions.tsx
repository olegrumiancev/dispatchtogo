"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface VendorJobActionsProps {
  jobId: string;
  currentStatus: string;
}

export function VendorJobActions({ jobId, currentStatus }: VendorJobActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(action: "accept" | "reject" | "start" | "complete") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update job");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {currentStatus === "ASSIGNED" && (
          <>
            <Button
              onClick={() => updateStatus("accept")}
              loading={loading === "accept"}
            >
              Accept Job
            </Button>
            <Button
              variant="danger"
              onClick={() => updateStatus("reject")}
              loading={loading === "reject"}
            >
              Decline
            </Button>
          </>
        )}

        {currentStatus === "ACCEPTED" && (
          <Button
            onClick={() => updateStatus("start")}
            loading={loading === "start"}
          >
            Start Work
          </Button>
        )}

        {currentStatus === "IN_PROGRESS" && (
          <Button
            onClick={() => updateStatus("complete")}
            loading={loading === "complete"}
          >
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  );
}
