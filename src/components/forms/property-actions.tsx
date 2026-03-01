"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PowerOff, Power, Trash2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyActionsProps {
  propertyId: string;
  propertyName: string;
  isActive: boolean;
  activeRequestCount: number;
}

type DialogType = "disable" | "enable" | "delete" | null;

export function PropertyActions({
  propertyId,
  propertyName,
  isActive,
  activeRequestCount,
}: PropertyActionsProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog(type: DialogType) {
    setError(null);
    setDialog(type);
  }

  function closeDialog() {
    if (loading) return;
    setDialog(null);
    setError(null);
  }

  // If there are active requests, show a blocking message instead of an action dialog
  function handleDisableClick() {
    if (isActive && activeRequestCount > 0) {
      openDialog("disable"); // we'll show the blocked state inside the dialog
    } else {
      openDialog(isActive ? "disable" : "enable");
    }
  }

  function handleDeleteClick() {
    if (activeRequestCount > 0) {
      openDialog("delete"); // blocked state shown inside
    } else {
      openDialog("delete");
    }
  }

  async function handleConfirm() {
    setError(null);
    setLoading(true);

    try {
      if (dialog === "disable" || dialog === "enable") {
        const res = await fetch(`/api/properties/${propertyId}`, { method: "PATCH" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update property.");
        }
      } else if (dialog === "delete") {
        const res = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to delete property.");
        }
      }

      setDialog(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const isBlocked =
    (dialog === "disable" && isActive && activeRequestCount > 0) ||
    (dialog === "delete" && activeRequestCount > 0);

  return (
    <>
      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisableClick}
          title={isActive ? "Disable property" : "Enable property"}
        >
          {isActive ? (
            <>
              <PowerOff className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline text-amber-600">Disable</span>
            </>
          ) : (
            <>
              <Power className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline text-emerald-600">Enable</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteClick}
          title="Delete property"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline text-red-500">Delete</span>
        </Button>
      </div>

      {/* Confirmation / blocked dialog */}
      {dialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isBlocked
                      ? "bg-amber-100"
                      : dialog === "delete"
                      ? "bg-red-100"
                      : "bg-amber-100"
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      isBlocked
                        ? "text-amber-600"
                        : dialog === "delete"
                        ? "text-red-600"
                        : "text-amber-600"
                    }`}
                  />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {isBlocked
                    ? "Cannot " + (dialog === "delete" ? "delete" : "disable") + " property"
                    : dialog === "delete"
                    ? "Delete property?"
                    : dialog === "enable"
                    ? "Enable property?"
                    : "Disable property?"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            {isBlocked ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  <strong className="font-medium">{propertyName}</strong> has{" "}
                  <strong className="font-medium text-amber-700">
                    {activeRequestCount} active service request{activeRequestCount !== 1 ? "s" : ""}
                  </strong>{" "}
                  that must be closed out first.
                </p>
                <p className="text-sm text-gray-500">
                  Please cancel, complete, or verify all open requests for this property before{" "}
                  {dialog === "delete" ? "deleting" : "disabling"} it.
                </p>
              </div>
            ) : dialog === "delete" ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Are you sure you want to permanently delete{" "}
                  <strong className="font-medium">{propertyName}</strong>? This cannot be undone.
                </p>
                <p className="text-sm text-gray-500">
                  You will need to create a new property if you want to use this address again.
                </p>
              </div>
            ) : dialog === "enable" ? (
              <p className="text-sm text-gray-700">
                Re-enable <strong className="font-medium">{propertyName}</strong>? Operators will be
                able to create new service requests against it again.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Disable <strong className="font-medium">{propertyName}</strong>? The property will
                  remain visible but new service requests cannot be created against it.
                </p>
              </div>
            )}

            {/* API error */}
            {error && (
              <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={closeDialog} disabled={loading}>
                {isBlocked ? "OK" : "Cancel"}
              </Button>
              {!isBlocked && (
                <Button
                  variant={dialog === "delete" ? "danger" : "primary"}
                  size="sm"
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading
                    ? "Please wait…"
                    : dialog === "delete"
                    ? "Delete"
                    : dialog === "enable"
                    ? "Enable"
                    : "Disable"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
