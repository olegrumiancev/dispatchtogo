"use client";

import { useState, useCallback } from "react";
import { AiTriageBadge, AiTriageData } from "@/components/ui/ai-triage-badge";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const AI_MAX_RETRIES = Math.max(1, parseInt(process.env.AI_TRIAGE_MAX_RETRIES ?? "3", 10));

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
  const [retriageStatus, setRetriegeStatus] = useState<string | null>(null);

  // Kick off re-triage via POST /api/triage (with automatic retries on AI failure)
  const handleRetriage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRetriegeStatus(null);

    let lastError = "Triage request failed";

    for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
      if (attempt === 1) {
        setRetriegeStatus("Running AI triage\u2026");
      } else {
        setRetriegeStatus(
          `AI returned unexpected data \u2014 retrying\u2026 (attempt ${attempt} of ${AI_MAX_RETRIES})`
        );
        await sleep(1000);
      }

      try {
        const res = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceRequestId: requestId }),
        });

        // Don't retry client errors — they won't be fixed by retrying
        if (res.status >= 400 && res.status < 500) {
          const json = await res.json().catch(() => ({}));
          lastError = json.error ?? "Triage request failed";
          break;
        }

        if (!res.ok) {
          // 5xx — retry
          const json = await res.json().catch(() => ({}));
          lastError = json.error ?? "Triage request failed";
          continue;
        }

        const json = await res.json();
        setRetriegeStatus(null);
        setLoading(false);
        setTriage(json.triage);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        // Network error — retry unless last attempt
      }
    }

    // All attempts exhausted
    setRetriegeStatus(null);
    setError(lastError);
    setLoading(false);
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
          Run AI Triage
        </button>
        {retriageStatus && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <svg className="w-3 h-3 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {retriageStatus}
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AiTriageBadge triage={triage} onRetriage={handleRetriage} />
      {retriageStatus && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
          <svg className="w-3 h-3 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {retriageStatus}
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
