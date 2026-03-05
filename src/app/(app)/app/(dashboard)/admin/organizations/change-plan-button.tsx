"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePlanButton({
  orgId,
  currentPlan,
}: {
  orgId: string;
  currentPlan: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const plans = ["FREE", "BASIC", "PROFESSIONAL", "ENTERPRISE"];
  const otherPlans = plans.filter((p) => p !== currentPlan);

  async function handleChange(newPlan: string) {
    setLoading(true);
    try {
      await fetch(`/api/admin/organizations/${orgId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {otherPlans.map((plan) => (
        <button
          key={plan}
          onClick={() => handleChange(plan)}
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
        >
          → {plan}
        </button>
      ))}
    </div>
  );
}
