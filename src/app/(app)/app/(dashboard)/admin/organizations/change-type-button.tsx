"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangeTypeButton({
  orgId,
  currentType,
}: {
  orgId: string;
  currentType: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const types = ["PROPERTY_MANAGER", "HOA", "CORPORATE", "GOVERNMENT", "OTHER"];
  const otherTypes = types.filter((t) => t !== currentType);

  async function handleChange(newType: string) {
    setLoading(true);
    try {
      await fetch(`/api/admin/organizations/${orgId}/type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {otherTypes.map((type) => (
        <button
          key={type}
          onClick={() => handleChange(type)}
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded border border-purple-300 text-purple-600 hover:bg-purple-50 disabled:opacity-50 transition-colors"
        >
          → {type}
        </button>
      ))}
    </div>
  );
}
