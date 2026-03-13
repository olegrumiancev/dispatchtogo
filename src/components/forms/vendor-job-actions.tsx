"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface VendorJobActionsProps {
  jobId: string;
  mode: "available";
  layout?: "stacked" | "inline" | "compact";
}

type DeclineKey = "capacity" | "wont_service" | "other";

const DECLINE_OPTIONS: { key: DeclineKey; label: string; value: string | null }[] = [
  {
    key: "capacity",
    label: "Over capacity",
    value: "Over capacity - currently unavailable to take on new jobs",
  },
  {
    key: "wont_service",
    label: "Won't service",
    value: "Unable to service this request",
  },
  {
    key: "other",
    label: "Other (provide reason)",
    value: null,
  },
];

export function VendorJobActions({
  jobId,
  mode,
  layout = "stacked",
}: VendorJobActionsProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
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
      router.push(`/app/vendor/jobs/${jobId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  const resetDecline = () => {
    setShowDeclineModal(false);
    setSelectedKey(null);
    setOtherReason("");
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
      resetDecline();
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

  const canConfirm =
    selectedKey !== null &&
    (selectedKey !== "other" || otherReason.trim().length > 0);

  const isInline = layout === "inline";
  const isCompact = layout === "compact";
  const declineLabel = isCompact ? "Pass" : "Decline";

  void mode;

  return (
    <div
      className={`flex flex-col gap-2 ${
        isInline ? "items-end" : isCompact ? "col-span-2" : ""
      }`}
    >
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div
        className={`gap-2 ${
          isInline
            ? "flex items-center"
            : isCompact
              ? "grid grid-cols-2"
              : "flex flex-col"
        }`}
      >
        <Button
          variant="primary"
          size="sm"
          loading={accepting}
          onClick={handleAccept}
          aria-label="Accept job"
          className={`${
            isInline
              ? "min-h-[38px]"
              : isCompact
                ? "w-full min-h-[40px] px-2"
                : "w-full min-h-[44px]"
          } justify-center`}
        >
          <Check className={isCompact ? "h-3.5 w-3.5" : "w-4 h-4"} />
          Accept
        </Button>

        <Button
          variant="secondary"
          size="sm"
          disabled={accepting}
          onClick={() => {
            setError(null);
            setShowDeclineModal(true);
          }}
          aria-label="Decline job"
          className={`${
            isInline
              ? "min-h-[38px]"
              : isCompact
                ? "w-full min-h-[40px] px-2"
                : "w-full min-h-[44px]"
          } ${
            isCompact
              ? "justify-center gap-1.5 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
              : "justify-between"
          }`}
        >
          {isCompact ? (
            <>
              <X className="h-3.5 w-3.5" />
              {declineLabel}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <X className="w-4 h-4" />
                {declineLabel}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </>
          )}
        </Button>
      </div>

      <Modal
        isOpen={showDeclineModal}
        onClose={() => {
          if (declining) return;
          resetDecline();
        }}
        title="Decline Job"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose a reason so the operator understands why you are passing on this job.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col gap-2">
            {DECLINE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setSelectedKey(opt.key);
                  setOtherReason("");
                }}
                className={`rounded-md border px-3 py-3 text-left text-sm transition-colors ${
                  selectedKey === opt.key
                    ? "border-red-400 bg-red-50 text-red-900 font-medium"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {selectedKey === "other" && (
            <textarea
              rows={3}
              placeholder="Describe the reason..."
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              size="sm"
              disabled={declining}
              onClick={resetDecline}
              className="justify-center"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={declining}
              disabled={!canConfirm}
              onClick={handleConfirmDecline}
              className="justify-center"
            >
              Confirm Decline
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
