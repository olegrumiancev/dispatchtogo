"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

interface OrganizationLifecycleActionsProps {
  orgId: string;
  orgName: string;
  status: string;
}

type LifecycleAction = "suspend" | "reactivate" | "offboard";

export function OrganizationLifecycleActions({
  orgId,
  orgName,
  status,
}: OrganizationLifecycleActionsProps) {
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
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
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
          const checks = data.checks as Record<string, number>;
          const details = Object.entries(checks)
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
            ? `Reactivate ${orgName}`
            : pendingAction === "suspend"
            ? `Suspend ${orgName}`
            : `Offboard ${orgName}`
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {pendingAction === "reactivate" &&
              "This restores the organization to active operational status."}
            {pendingAction === "suspend" &&
              "This blocks new operator logins and operational changes without deleting historical data."}
            {pendingAction === "offboard" &&
              "This disables org users, deactivates properties, and cancels pre-dispatch requests. Historical jobs, invoices, and records are preserved."}
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
