"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  phone: string;
  skills: Array<{ category: string }>;
}

interface AssignModalProps {
  requestRef: string;
  requestId: string;
  vendors: Vendor[];
}

export default function AssignModal({ requestRef, requestId, vendors }: AssignModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedVendor) return;
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: selectedVendor }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to dispatch.");
        return;
      }

      setOpen(false);
      setSelectedVendor("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Send className="w-4 h-4" />
        Assign
      </Button>

      <Modal
        isOpen={open}
        onClose={() => { setOpen(false); setError(null); setSelectedVendor(""); }}
        title={`Assign ${requestRef}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select a vendor to dispatch this job to:</p>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {vendors.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No active vendors available.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {vendors.map((vendor) => (
                <label
                  key={vendor.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedVendor === vendor.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="vendor"
                    value={vendor.id}
                    checked={selectedVendor === vendor.id}
                    onChange={() => setSelectedVendor(vendor.id)}
                    className="text-blue-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-xs text-gray-500">
                      {vendor.skills.map((s) => s.category).join(", ")}
                      {vendor.skills.length > 0 && vendor.phone && " \u00b7 "}
                      {vendor.phone}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <Button variant="secondary" onClick={() => { setOpen(false); setError(null); setSelectedVendor(""); }} className="w-full sm:w-auto justify-center">
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedVendor}
              loading={assigning}
              onClick={handleAssign}
              className="w-full sm:w-auto justify-center"
            >
              Dispatch
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
