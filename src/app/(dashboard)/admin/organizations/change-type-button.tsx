"use client";

import { useState } from "react";
import { ORGANIZATION_TYPES } from "@/lib/constants";
import { useRouter } from "next/navigation";

interface Props {
  orgId: string;
  currentType: string;
}

export function ChangeTypeButton({ orgId, currentType }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleChange = async (type: string) => {
    if (type === currentType) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    try {
      await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className="ml-1.5 text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
      >
        {loading ? "\u2026" : "Edit"}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-6 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
            {ORGANIZATION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleChange(t.value)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                  t.value === currentType ? "font-semibold text-blue-600" : "text-gray-700"
                }`}
              >
                {t.label}
                {t.value === currentType && " \u2713"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
