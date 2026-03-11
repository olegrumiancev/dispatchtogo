"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AiTriageBadge, AiTriageData } from "@/components/ui/ai-triage-badge";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const AI_MAX_RETRIES = Math.max(1, parseInt(process.env.AI_TRIAGE_MAX_RETRIES ?? "3", 10));

interface TriageSectionProps {
  requestId: string;
  initialTriage?: AiTriageData | null;
  requestStatus?: string;
  allowClarificationSubmit?: boolean;
}

function buildClarificationPayload(
  questions: string[],
  answers: Record<string, string>
) {
  return questions
    .map((question, index) => {
      const answer = answers[question]?.trim() ?? "";
      return `${index + 1}. ${question}\nAnswer: ${answer}`;
    })
    .join("\n\n");
}

/**
 * Displays the AI triage panel for a service request and lets the user
 * trigger a re-triage from the browser.
 */
export function TriageSection({
  requestId,
  initialTriage,
  requestStatus,
  allowClarificationSubmit = false,
}: TriageSectionProps) {
  const router = useRouter();
  const [triage, setTriage] = useState<AiTriageData | null>(initialTriage ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retriageStatus, setRetriageStatus] = useState<string | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const [clarificationSuccess, setClarificationSuccess] = useState<string | null>(null);
  const [submittingClarification, setSubmittingClarification] = useState(false);

  const triageNeedsClarification =
    triage?.statusSuggestion === "NEEDS_CLARIFICATION" &&
    (triage.clarifyingQuestions?.length ?? 0) > 0;
  const requestStillNeedsClarification = requestStatus
    ? requestStatus === "NEEDS_CLARIFICATION"
    : true;
  const needsClarification =
    triageNeedsClarification && requestStillNeedsClarification;
  const displayTriage = triage
    ? {
        ...triage,
        clarifyingQuestions: needsClarification ? triage.clarifyingQuestions : [],
        statusSuggestion:
          needsClarification || triage.statusSuggestion !== "NEEDS_CLARIFICATION"
            ? triage.statusSuggestion
            : "READY_TO_DISPATCH",
      }
    : null;

  useEffect(() => {
    if (!needsClarification || !triage) {
      setClarificationAnswers({});
      return;
    }

    setClarificationAnswers((currentAnswers) =>
      Object.fromEntries(
        triage.clarifyingQuestions.map((question) => [
          question,
          currentAnswers[question] ?? "",
        ])
      )
    );
  }, [needsClarification, triage]);

  const updateClarificationAnswer = useCallback((question: string, value: string) => {
    setClarificationAnswers((currentAnswers) => ({
      ...currentAnswers,
      [question]: value,
    }));
  }, []);

  // Kick off re-triage via POST /api/triage (with automatic retries on AI failure)
  const handleRetriage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRetriageStatus(null);

    let lastError = "Triage request failed";

    for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
      if (attempt === 1) {
        setRetriageStatus("Running AI triage...");
      } else {
        setRetriageStatus(
          `AI returned unexpected data - retrying... (attempt ${attempt} of ${AI_MAX_RETRIES})`
        );
        await sleep(1000);
      }

      try {
        const res = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceRequestId: requestId }),
        });

        // Don't retry client errors - they won't be fixed by retrying
        if (res.status >= 400 && res.status < 500) {
          const json = await res.json().catch(() => ({}));
          lastError = json.error ?? "Triage request failed";
          break;
        }

        if (!res.ok) {
          // 5xx - retry
          const json = await res.json().catch(() => ({}));
          lastError = json.error ?? "Triage request failed";
          continue;
        }

        const json = await res.json();
        setRetriageStatus(null);
        setLoading(false);
        setTriage(json.triage);
        startTransition(() => router.refresh());
        return true;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        // Network error - retry unless last attempt
      }
    }

    // All attempts exhausted
    setRetriageStatus(null);
    setError(lastError);
    setLoading(false);
    return false;
  }, [requestId, router]);

  const handleClarificationSubmit = useCallback(async () => {
    if (!triage) return;

    const unansweredQuestions = triage.clarifyingQuestions.filter(
      (question) => !clarificationAnswers[question]?.trim()
    );

    if (unansweredQuestions.length > 0) {
      setClarificationError(
        'Answer each clarification question before re-triaging. If something is unavailable, type "unknown".'
      );
      return;
    }

    setSubmittingClarification(true);
    setClarificationError(null);
    setClarificationSuccess(null);
    setError(null);

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_clarification",
          clarificationAnswers: buildClarificationPayload(
            triage.clarifyingQuestions,
            clarificationAnswers
          ),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClarificationError(json.error ?? "Unable to save clarification");
        return;
      }

      setClarificationAnswers({});

      const retriageSucceeded = await handleRetriage();
      if (retriageSucceeded) {
        setClarificationSuccess("Clarification saved and AI triage refreshed.");
      } else {
        setClarificationSuccess("Clarification saved. Re-triage still needs attention.");
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setClarificationError(
        err instanceof Error ? err.message : "Unable to save clarification"
      );
    } finally {
      setSubmittingClarification(false);
    }
  }, [clarificationAnswers, handleRetriage, requestId, router, triage]);

  if (!displayTriage) {
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
          Run AI triage
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
    <div className="space-y-3">
      <AiTriageBadge
        triage={displayTriage}
        onRetriage={handleRetriage}
        defaultExpanded={needsClarification}
      />

      {needsClarification && allowClarificationSubmit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">
              This request is waiting on a few answers before dispatch.
            </p>
            <p className="text-sm text-amber-800">
              Each AI question has its own answer field so the operator can respond quickly and
              clearly before re-running triage.
            </p>
          </div>

          <div className="space-y-3">
            {triage.clarifyingQuestions.map((question, index) => (
              <div
                key={`${index}-${question}`}
                className="rounded-md border border-amber-200 bg-white px-4 py-3"
              >
                <p className="text-sm font-medium text-slate-900">
                  {index + 1}. {question}
                </p>
                <Textarea
                  label="Answer"
                  value={clarificationAnswers[question] ?? ""}
                  onChange={(event) =>
                    updateClarificationAnswer(question, event.target.value)
                  }
                  placeholder='Type the answer here. If not confirmed, enter "unknown".'
                  rows={3}
                  disabled={submittingClarification || loading}
                  wrapperClassName="mt-3"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-amber-800">
              Tip: short direct answers work best, and "unknown" is fine when the detail is not yet confirmed.
            </p>
            <Button
              type="button"
              onClick={handleClarificationSubmit}
              loading={submittingClarification}
              disabled={loading}
            >
              Save clarification and re-triage
            </Button>
          </div>

          {clarificationError && <p className="text-xs text-red-600">{clarificationError}</p>}
          {clarificationSuccess && (
            <p className="text-xs text-emerald-700">{clarificationSuccess}</p>
          )}
        </div>
      )}

      {needsClarification && !allowClarificationSubmit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            This request is still blocked on operator clarification.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Collect answers to the questions above, update the request details, then run re-triage.
          </p>
        </div>
      )}

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
