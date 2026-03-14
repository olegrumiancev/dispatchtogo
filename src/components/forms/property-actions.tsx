"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PowerOff, Power, Trash2, AlertTriangle, X, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyActionsProps {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  propertyDescription: string | null;
  isActive: boolean;
  activeRequestCount: number;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

type DialogType = "disable" | "enable" | "delete" | "edit" | null;

export function PropertyActions({
  propertyId,
  propertyName,
  propertyAddress,
  propertyDescription,
  isActive,
  activeRequestCount,
  contactName,
  contactPhone,
  contactEmail,
}: PropertyActionsProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyForm, setPropertyForm] = useState({
    name: propertyName,
    address: propertyAddress,
    description: propertyDescription ?? "",
    contactName: contactName ?? "",
    contactPhone: contactPhone ?? "",
    contactEmail: contactEmail ?? "",
  });

  function openDialog(type: DialogType) {
    setError(null);
    if (type === "edit") {
      setPropertyForm({
        name: propertyName,
        address: propertyAddress,
        description: propertyDescription ?? "",
        contactName: contactName ?? "",
        contactPhone: contactPhone ?? "",
        contactEmail: contactEmail ?? "",
      });
    }
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
      if (dialog === "edit") {
        const res = await fetch(`/api/properties/${propertyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(propertyForm),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to update property.");
        }
      } else if (dialog === "disable" || dialog === "enable") {
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
          onClick={() => openDialog("edit")}
          title="Edit property"
        >
          <PencilLine className="w-4 h-4 text-blue-500" />
          <span className="hidden sm:inline text-blue-600">Edit</span>
        </Button>
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
                    dialog === "edit"
                      ? "bg-blue-100"
                      : isBlocked
                      ? "bg-amber-100"
                      : dialog === "delete"
                      ? "bg-red-100"
                      : "bg-amber-100"
                  }`}
                >
                  {dialog === "edit" ? (
                    <PencilLine className="w-5 h-5 text-blue-600" />
                  ) : (
                    <AlertTriangle
                      className={`w-5 h-5 ${
                        isBlocked
                          ? "text-amber-600"
                          : dialog === "delete"
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    />
                  )}
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {dialog === "edit"
                    ? "Edit Property"
                    : isBlocked
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
            {dialog === "edit" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Property Name
                  </label>
                  <input
                    type="text"
                    value={propertyForm.name}
                    onChange={(e) =>
                      setPropertyForm((current) => ({
                        ...current,
                        name: e.target.value,
                      }))
                    }
                    disabled={loading}
                    placeholder="e.g. Riverside Inn"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    value={propertyForm.address}
                    onChange={(e) =>
                      setPropertyForm((current) => ({
                        ...current,
                        address: e.target.value,
                      }))
                    }
                    disabled={loading}
                    placeholder="123 Main St, Cornwall, ON"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={propertyForm.description}
                    onChange={(e) =>
                      setPropertyForm((current) => ({
                        ...current,
                        description: e.target.value,
                      }))
                    }
                    disabled={loading}
                    placeholder="Optional notes about this property..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-700">
                    Site contact is optional. If you fill it in, vendors will see this person first when they need help on site.
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave it blank to fall back to your organization dispatch contact.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Site Contact Name
                  </label>
                  <input
                    type="text"
                    value={propertyForm.contactName}
                    onChange={(e) =>
                      setPropertyForm((current) => ({
                        ...current,
                        contactName: e.target.value,
                      }))
                    }
                    disabled={loading}
                    placeholder="e.g. Front Desk"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={propertyForm.contactPhone}
                      onChange={(e) =>
                        setPropertyForm((current) => ({
                          ...current,
                          contactPhone: e.target.value,
                        }))
                      }
                      disabled={loading}
                      placeholder="613-555-0000"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={propertyForm.contactEmail}
                      onChange={(e) =>
                        setPropertyForm((current) => ({
                          ...current,
                          contactEmail: e.target.value,
                        }))
                      }
                      disabled={loading}
                      placeholder="desk@property.com"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : isBlocked ? (
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
                    : dialog === "edit"
                    ? "Save Changes"
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
