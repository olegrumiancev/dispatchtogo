"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronDown } from "lucide-react";

interface VendorJobActionsProps {
  jobId: string;
  mode: "available";
}

type DeclineKey = "capacity" | "wont_service" | "other";

const DECLINE_OPTIONS: { key: DeclineKey; label: string; value: string | null }[] = [
  { key: "capacity",     label: "Over capacity",          value: "Over capacity — currently unavailable to take on new jobs" },
  { key: "wont_service", label: "Won't service",           value: "Unable to service this request" },
  { key: "other",        label: "Other (provide reason)",  value: null },
];

export function VendorJobActions({ jobId, mode }: VendorJobActionsProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decline expand state
  const [showDeclineOptions, setShowDeclineOptions] = useState(false);
  const [selectedKey, setSelectedKey] = useState<DeclineKey | null>(null);
  const [otherReason, setOtherReason] = useState("");

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
        const data = await res.json().catch(() => ({}));
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

  const doDecline = async (reason: string) => {
    setDeclining(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline", declineReason: reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to decline job.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeclining(false);
    }
  };

  const handleConfirmDecline = () => {
    if (!selectedKey) return;
    const reason =
      selectedKey === "other"
        ? otherReason.trim()
        : (DECLINE_OPTIONS.find((o) => o.key === selectedKey)?.value ?? "");
    if (!reason) return;
    doDecline(reason);
  };

  const resetDecline = () => {
    setShowDeclineOptions(false);
    setSelectedKey(null);
    setOtherReason("");
  };

  const canConfirm =
    selectedKey !== null &&
    (selectedKey !== "other" || otherReason.trim().length > 0);

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button
        variant="primary"
        size="sm"
        loading={accepting}
        disabled={showDeclineOptions}
        onClick={handleAccept}
        className="w-full justify-center min-h-[44px]"
      >
        <Check className="w-4 h-4" />
        Accept
      </Button>

      {/* Decline trigger */}
      {!showDeclineOptions && (
        <Button
          variant="secondary"
          size="sm"
          disabled={accepting}
          onClick={() => setShowDeclineOptions(true)}
          className="w-full justify-between min-h-[44px]"
        >
          <span className="flex items-center gap-1.5">
            <X className="w-4 h-4" />
            Decline
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </Button>
      )}

      {/* Expanded decline options */}
      {showDeclineOptions && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2.5">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
            Reason for declining
          </p>

          <div className="flex flex-col gap-1.5">
            {DECLINE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setSelectedKey(opt.key); setOtherReason(""); }}
                className={`text-left text-xs px-3 py-2.5 rounded-md border transition-colors ${
                  selectedKey === opt.key
                    ? "border-red-400 bg-red-100 text-red-900 font-medium"
                    : "border-red-200 bg-white text-red-700 hover:bg-red-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {selectedKey === "other" && (
            <textarea
              rows={2}
              placeholder="Describe the reason…"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          )}

          <div className="flex gap-2 pt-0.5">
            <Button
              variant="danger"
              size="sm"
              loading={declining}
              disabled={!canConfirm}
              onClick={handleConfirmDecline}
              className="flex-1 justify-center"
            >
              Confirm Decline
            </Button>
            <button
              type="button"
              disabled={declining}
              onClick={resetDecline}
              className="px-3 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

