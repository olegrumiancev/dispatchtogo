"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, UserX } from "lucide-react";

interface CompletionReviewActionsProps {
  requestId: string;
}

type RejectionType = "send_back" | "redispatch" | "dispute";

const REJECTION_OPTIONS: {
  value: RejectionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "send_back",
    label: "Send back for rework",
    description: "Work is incomplete or needs touch-ups. The same vendor must go back and finish the job.",
    icon: <RefreshCw className="w-4 h-4" />,
    color: "border-amber-400 bg-amber-50",
  },
  {
    value: "redispatch",
    label: "Remove vendor & re-dispatch",
    description: "Fire the vendor from this job. The request is re-opened and offered to another vendor.",
    icon: <UserX className="w-4 h-4" />,
    color: "border-orange-400 bg-orange-50",
  },
  {
    value: "dispute",
    label: "Escalate to admin",
    description: "Neither side can resolve this. Flag the job as disputed — an admin will mediate.",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "border-rose-400 bg-rose-50",
  },
];

export function CompletionReviewActions({ requestId }: CompletionReviewActionsProps) {
  const router = useRouter();

  // Verify state
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionType, setRejectionType] = useState<RejectionType | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<{ type: RejectionType } | null>(null);

  async function handleVerify() {
    setVerifying(true);
    setVerifyError(null);
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
      setVerified(true);
      router.refresh();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setVerifying(false);
    }
  }

  async function handleReject() {
    if (!rejectionType || !rejectionReason.trim()) return;
    setRejecting(true);
    setRejectError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject_completion",
          rejectionType,
          rejectionReason: rejectionReason.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to reject");
      }
      setRejected({ type: rejectionType });
      setShowRejectModal(false);
      router.refresh();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRejecting(false);
    }
  }

  function openRejectModal() {
    setRejectionType(null);
    setRejectionReason("");
    setRejectError(null);
    setShowRejectModal(true);
  }

  if (verified) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
        <CheckCircle className="w-4 h-4" />
        Completion verified
      </div>
    );
  }

  if (rejected) {
    const labels: Record<RejectionType, string> = {
      send_back: "Sent back for rework",
      redispatch: "Re-dispatched to new vendor",
      dispute: "Escalated to admin",
    };
    return (
      <div className="flex items-center gap-1.5 text-sm text-amber-700 font-medium">
        <XCircle className="w-4 h-4" />
        {labels[rejected.type]}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Button
          onClick={handleVerify}
          loading={verifying}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="w-4 h-4 mr-1.5" />
          Verify Completion
        </Button>
        <button
          onClick={openRejectModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Reject Work
        </button>
      </div>
      {verifyError && <p className="text-xs text-red-600 mt-1">{verifyError}</p>}

      {/* Rejection modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRejectModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Reject Completed Work</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Review the vendor&apos;s work and choose how to proceed.
                </p>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Rejection type selection */}
            <fieldset>
              <legend className="text-sm font-medium text-gray-700 mb-2">
                What should happen next? <span className="text-red-500">*</span>
              </legend>
              <div className="space-y-2">
                {REJECTION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      rejectionType === opt.value
                        ? opt.color
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectionType"
                      value={opt.value}
                      checked={rejectionType === opt.value}
                      onChange={() => setRejectionType(opt.value)}
                      className="mt-0.5 accent-current"
                    />
                    <span className="mt-0.5 text-gray-500">{opt.icon}</span>
                    <span>
                      <span className="text-sm font-medium text-gray-900 block">{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Rejection reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason for rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Describe what was unsatisfactory or what needs to be corrected…"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                This reason will be sent to the vendor via SMS and email.
              </p>
            </div>

            {rejectError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {rejectError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionType || !rejectionReason.trim() || rejecting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {rejecting ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
