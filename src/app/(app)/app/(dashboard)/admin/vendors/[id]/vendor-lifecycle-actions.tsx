"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

interface VendorLifecycleActionsProps {
  vendorId: string;
  vendorName: string;
  status: string;
}

type LifecycleAction = "suspend" | "reactivate" | "offboard";

export function VendorLifecycleActions({
  vendorId,
  vendorName,
  status,
}: VendorLifecycleActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeModal = () => {
    if (loading) return;
    setPendingAction(null);
    setReason("");
    setError(null);
  };

  const submit = async () => {
    if (!pendingAction) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pendingAction,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.checks) {
          const details = Object.entries(data.checks as Record<string, number>)
            .filter(([, count]) => Number(count) > 0)
            .map(([label, count]) => `${label}: ${count}`)
            .join(", ");
          setError(`${data.error ?? "Action failed"}${details ? ` (${details})` : ""}`);
        } else {
          setError(data.error ?? "Action failed");
        }
        return;
      }

      closeModal();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {status === "ACTIVE" && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setPendingAction("suspend")}>
              Suspend
            </Button>
            <Button variant="danger" size="sm" onClick={() => setPendingAction("offboard")}>
              Offboard
            </Button>
          </>
        )}

        {status === "SUSPENDED" && (
          <>
            <Button variant="primary" size="sm" onClick={() => setPendingAction("reactivate")}>
              Reactivate
            </Button>
            <Button variant="danger" size="sm" onClick={() => setPendingAction("offboard")}>
              Offboard
            </Button>
          </>
        )}
      </div>

      <Modal
        isOpen={pendingAction !== null}
        onClose={closeModal}
        title={
          pendingAction === "reactivate"
            ? `Reactivate ${vendorName}`
            : pendingAction === "suspend"
            ? `Suspend ${vendorName}`
            : `Offboard ${vendorName}`
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {pendingAction === "reactivate" &&
              "This restores the vendor to active platform status. Availability remains under vendor control."}
            {pendingAction === "suspend" &&
              "This blocks vendor logins and new dispatches. Offered jobs are released back for re-dispatch."}
            {pendingAction === "offboard" &&
              "This disables vendor users, removes preferred-vendor mappings, and releases offered jobs. Historical jobs and records are preserved."}
          </p>

          <Textarea
            label="Reason"
            placeholder="Optional internal note for why this status change is being made..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeModal} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant={pendingAction === "reactivate" ? "primary" : pendingAction === "suspend" ? "secondary" : "danger"}
              onClick={submit}
              loading={loading}
            >
              {pendingAction === "reactivate"
                ? "Reactivate"
                : pendingAction === "suspend"
                ? "Suspend"
                : "Offboard"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
