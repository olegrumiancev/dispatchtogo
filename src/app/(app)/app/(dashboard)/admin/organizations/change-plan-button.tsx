"use client";

import { useState } from "react";
import { BILLING_PLANS } from "@/lib/constants";
import { useRouter } from "next/navigation";

interface Props {
  orgId: string;
  currentPlan: string;
}

export function ChangePlanButton({ orgId, currentPlan }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const plans = Object.keys(BILLING_PLANS);

  const handleChange = async (plan: string) => {
    if (plan === currentPlan) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    try {
      await fetch(`/api/admin/organizations/${orgId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
      >
        {loading ? "Saving…" : "Change"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
            {plans.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleChange(p)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                  p === currentPlan ? "font-semibold text-blue-600" : "text-gray-700"
                }`}
              >
                {BILLING_PLANS[p].label}
                {p === currentPlan && " ✓"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
