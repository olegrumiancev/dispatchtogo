"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CheckCircle, XCircle } from "lucide-react";

interface UserApprovalActionsProps {
  userId: string;
  userName: string;
  userEmail: string;
  isApproved: boolean;
  isRejected: boolean;
}

export function UserApprovalActions({
  userId,
  userName,
  userEmail,
  isApproved,
  isRejected,
}: UserApprovalActionsProps) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to approve");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionNote: rejectionNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to reject");
        return;
      }
      setShowRejectModal(false);
      setRejectionNote("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setRejecting(false);
    }
  };

  // Already approved — show option to revoke
  if (isApproved) {
    return (
      <span className="text-xs text-gray-400">Approved</span>
    );
  }

  // Rejected — show option to re-approve
  if (isRejected) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          loading={approving}
          onClick={handleApprove}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Re-approve
        </Button>
      </div>
    );
  }

  // Pending — show approve + reject buttons
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          loading={approving}
          onClick={handleApprove}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Approve
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowRejectModal(true)}
        >
          <XCircle className="w-3.5 h-3.5" />
          Reject
        </Button>
        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>

      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectionNote("");
          setError(null);
        }}
        title="Reject Registration"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Reject the registration for <strong>{userName || userEmail}</strong>?
            They will not be able to log in.
          </p>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="e.g., Could not verify business identity..."
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionNote("");
                setError(null);
              }}
              className="w-full sm:w-auto justify-center"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={rejecting}
              onClick={handleReject}
              className="w-full sm:w-auto justify-center"
            >
              Reject Registration
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
