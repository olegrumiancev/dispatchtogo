"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CancelRequestButtonProps {
  requestId: string;
  /** If provided, router.push() here on success. Otherwise router.refresh(). */
  redirectTo?: string;
  /** Renders a compact button suitable for table rows. */
  compact?: boolean;
}

export function CancelRequestButton({ requestId, redirectTo, compact }: CancelRequestButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to cancel request");
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel request");
      setCancelling(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={
          compact
            ? "text-xs font-medium text-red-600 hover:text-red-700"
            : "inline-flex items-center justify-center px-4 py-2 min-h-[44px] text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
        }
      >
        Cancel{compact ? "" : " Request"}
      </button>
    );
  }

  return (
    <div className={`flex flex-col items-end gap-1.5 ${compact ? "" : ""}`}>
      <div className="flex items-center gap-2">
        {!compact && <span className="text-sm text-gray-600">Cancel this request?</span>}
        <button
          type="button"
          disabled={cancelling}
          onClick={handleCancel}
          className={
            compact
              ? "text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              : "inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          }
        >
          {cancelling ? (compact ? "…" : "Cancelling…") : (compact ? "Confirm" : "Yes, cancel it")}
        </button>
        <button
          type="button"
          disabled={cancelling}
          onClick={() => { setConfirming(false); setError(null); }}
          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Keep
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
