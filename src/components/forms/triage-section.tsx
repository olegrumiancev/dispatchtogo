"use client";

import { useState, useCallback } from "react";
import { AiTriageBadge, AiTriageData } from "@/components/ui/ai-triage-badge";

interface TriageSectionProps {
  requestId: string;
  initialTriage?: AiTriageData | null;
}

/**
 * Displays the AI triage panel for a service request and lets the user
 * trigger a re-triage from the browser.
 */
export function TriageSection({ requestId, initialTriage }: TriageSectionProps) {
  const [triage, setTriage] = useState<AiTriageData | null>(initialTriage ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kick off re-triage via POST /api/triage
  const handleRetriage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Triage request failed");
      }

      const json = await res.json();
      setTriage(json.triage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  if (!triage) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-500">
          No AI triage data available for this request.
        </p>
        <button
          onClick={handleRetriage}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {loading ? "Running triage…" : "Run AI Triage"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AiTriageBadge triage={triage} onRetriage={handleRetriage} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
