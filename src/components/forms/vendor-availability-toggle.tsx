"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VENDOR_AVAILABILITY_STATUSES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

interface VendorAvailabilityToggleProps {
  vendorId: string;
  currentStatus: string;
  currentNote: string | null;
}

const STATUS_ICONS: Record<string, string> = {
  AVAILABLE: "🟢",
  BUSY: "🟡",
  OFF_DUTY: "⚫",
};

export function VendorAvailabilityToggle({
  vendorId,
  currentStatus,
  currentNote,
}: VendorAvailabilityToggleProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState(currentNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    setError(null);
    setSuccess(false);

    // If going to AVAILABLE, save immediately (clear note)
    if (newStatus === "AVAILABLE") {
      setSaving(true);
      try {
        const res = await fetch(`/api/vendors/${vendorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ availabilityStatus: newStatus, availabilityNote: null }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Failed to update");
        }
        setNote("");
        setSuccess(true);
        router.refresh();
      } catch (err: any) {
        setError(err.message ?? "Failed to update availability");
      } finally {
        setSaving(false);
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityStatus: status,
          availabilityNote: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to update");
      }
      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Failed to update availability");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Status selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {VENDOR_AVAILABILITY_STATUSES.map((opt) => {
          const isSelected = status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => handleStatusChange(opt.value)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                isSelected
                  ? opt.value === "AVAILABLE"
                    ? "border-emerald-400 bg-emerald-50"
                    : opt.value === "BUSY"
                    ? "border-amber-400 bg-amber-50"
                    : "border-gray-400 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              } ${saving ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span className="text-lg">{STATUS_ICONS[opt.value]}</span>
              <div>
                <span className="text-sm font-medium text-gray-900 block">{opt.label}</span>
                <span className="text-xs text-gray-500">{opt.description}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Note field — only shown for BUSY or OFF_DUTY */}
      {status !== "AVAILABLE" && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">
            Note (optional) — visible to operators and admin
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSuccess(false);
            }}
            placeholder={
              status === "BUSY"
                ? "e.g., Finishing a job at Ramada, back by 3pm"
                : "e.g., On vacation until March 10"
            }
            disabled={saving}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </button>
            {success && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>
      )}

      {/* Confirmation for AVAILABLE */}
      {status === "AVAILABLE" && success && (
        <p className="text-sm text-emerald-600 font-medium">
          You are available and will receive new dispatch offers.
        </p>
      )}
    </div>
  );
}
