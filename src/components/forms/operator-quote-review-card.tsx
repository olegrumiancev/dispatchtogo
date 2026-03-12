"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ImageIcon,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

interface QuoteSummarySnapshot {
  id: string;
  vendorId: string;
  status: string;
  source: string;
  amount: number;
  currency: string;
  scopeSummary: string;
  validUntil: string | Date | null;
  submittedAt: string | Date | null;
  decidedAt: string | Date | null;
  createdAt: string | Date;
  vendorNameSnapshot: string;
  _count: {
    requestPhotoLinks: number;
    jobPhotoLinks: number;
  };
}

interface CommercialSnapshot {
  quotePolicy: string;
  quoteDisposition: string | null;
  latestQuoteSummary: QuoteSummarySnapshot | null;
  latestSubmittedQuoteSummary: QuoteSummarySnapshot | null;
}

interface QuotePhoto {
  id: string;
  url: string;
  fullUrl?: string | null;
  thumbnailUrl?: string | null;
  type: string;
  caption?: string | null;
  takenAt?: string | Date | null;
}

interface QuotePhotoLink {
  quoteId: string;
  photoId: string;
  sortOrder: number;
  photo: QuotePhoto;
}

interface QuoteRecord {
  id: string;
  status: string;
  source: string;
  amount: number;
  currency: string;
  scopeSummary: string;
  assumptions: string | null;
  exclusions: string | null;
  validUntil: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  vendorNameSnapshot: string;
  requestPhotoLinks: QuotePhotoLink[];
  jobPhotoLinks: QuotePhotoLink[];
}

interface QuotesResponse {
  quotePolicy: string;
  quoteDisposition: string | null;
  requestStatus: string;
  quotes: QuoteRecord[];
}

interface OperatorQuoteReviewCardProps {
  requestId: string;
  requestStatus: string;
  commercialSnapshot: CommercialSnapshot;
  initialDispositionNote: string | null;
}

type DecisionAction = "approve" | "reject";

const CLOSED_REQUEST_STATUSES = new Set([
  "COMPLETED",
  "VERIFIED",
  "CANCELLED",
]);

function formatCommercialLabel(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(amount: number, currency: string) {
  if (currency === "CAD") {
    return formatCurrency(amount);
  }

  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getPolicySummary(policy: string) {
  switch (policy) {
    case "REQUEST_BEFORE_WORK":
      return "This request expects quote approval before repair work proceeds.";
    case "NOT_REQUIRED":
      return "A quote is optional unless scope changes or you need explicit approval.";
    default:
      return "Vendor may quote immediately, assess first, or continue without a quote.";
  }
}

function getDefaultSelectedQuoteId(
  quotes: QuoteRecord[],
  snapshot: CommercialSnapshot
) {
  return (
    snapshot.latestSubmittedQuoteSummary?.id ??
    snapshot.latestQuoteSummary?.id ??
    quotes[0]?.id ??
    null
  );
}

function QuoteHistoryItem({
  quote,
  selected,
  onClick,
}: {
  quote: QuoteRecord;
  selected: boolean;
  onClick: () => void;
}) {
  const evidenceCount =
    quote.requestPhotoLinks.length + quote.jobPhotoLinks.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-blue-300 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">
            {formatMoney(quote.amount, quote.currency)}
          </p>
          <p className="text-xs text-gray-500">
            {quote.submittedAt
              ? `Submitted ${formatDate(quote.submittedAt)}`
              : `Created ${formatDate(quote.createdAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="bg-slate-100 text-slate-800">
            {formatCommercialLabel(quote.status)}
          </Badge>
          <Badge variant="bg-white text-slate-700 ring-1 ring-gray-200">
            {formatCommercialLabel(quote.source)}
          </Badge>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-gray-700">
        {quote.scopeSummary}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        {evidenceCount} linked photo{evidenceCount === 1 ? "" : "s"}
      </p>
    </button>
  );
}

export function OperatorQuoteReviewCard({
  requestId,
  requestStatus,
  commercialSnapshot,
  initialDispositionNote,
}: OperatorQuoteReviewCardProps) {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [quotePolicy, setQuotePolicy] = useState(commercialSnapshot.quotePolicy);
  const [quoteDisposition, setQuoteDisposition] = useState<string | null>(
    commercialSnapshot.quoteDisposition
  );
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(
    getDefaultSelectedQuoteId([], commercialSnapshot)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionMode, setDecisionMode] = useState<DecisionAction | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

  const canMutate = !CLOSED_REQUEST_STATUSES.has(requestStatus);

  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === selectedQuoteId) ?? quotes[0] ?? null,
    [quotes, selectedQuoteId]
  );

  const activeCommercialSummary =
    commercialSnapshot.latestSubmittedQuoteSummary ??
    commercialSnapshot.latestQuoteSummary;
  const selectedQuoteEvidence = selectedQuote
    ? [...selectedQuote.requestPhotoLinks, ...selectedQuote.jobPhotoLinks]
    : [];
  const actionableQuote =
    selectedQuote && selectedQuote.status === "SUBMITTED" ? selectedQuote : null;

  async function loadQuotes(preserveSelection = true) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/requests/${requestId}/quotes`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as
        | QuotesResponse
        | { error?: string };

      if (!response.ok) {
        const message =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to load quote details.";
        setError(message);
        return;
      }

      const payload = data as QuotesResponse;
      setQuotes(payload.quotes);
      setQuotePolicy(payload.quotePolicy);
      setQuoteDisposition(payload.quoteDisposition);
      setSelectedQuoteId((current) => {
        if (
          preserveSelection &&
          current &&
          payload.quotes.some((quote) => quote.id === current)
        ) {
          return current;
        }

        return getDefaultSelectedQuoteId(payload.quotes, commercialSnapshot);
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuotes(false);
  }, [requestId]);

  async function handleDecision(action: DecisionAction) {
    if (!selectedQuote) return;

    setDecisionLoading(true);
    setDecisionError(null);

    try {
      const response = await fetch(`/api/quotes/${selectedQuote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          decisionNote: decisionNote.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setDecisionError(
          data.error ??
            (action === "approve"
              ? "Failed to approve quote."
              : "Failed to request revision.")
        );
        return;
      }

      setDecisionMode(null);
      setDecisionNote("");
      await loadQuotes(true);
      router.refresh();
    } catch {
      setDecisionError("Network error. Please try again.");
    } finally {
      setDecisionLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Quote Review</CardTitle>
              <p className="text-sm text-gray-600">
                {getPolicySummary(quotePolicy)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="bg-slate-100 text-slate-800">
                {formatCommercialLabel(quotePolicy)}
              </Badge>
              {quoteDisposition && (
                <Badge variant="bg-white text-slate-700 ring-1 ring-gray-200">
                  {formatCommercialLabel(quoteDisposition)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {initialDispositionNote && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Vendor Quote Note
              </p>
              <p className="mt-1 text-sm text-gray-700">{initialDispositionNote}</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {selectedQuote ? (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Selected Quote
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatMoney(selectedQuote.amount, selectedQuote.currency)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedQuote.vendorNameSnapshot}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="bg-slate-100 text-slate-800">
                    {formatCommercialLabel(selectedQuote.status)}
                  </Badge>
                  <Badge variant="bg-white text-slate-700 ring-1 ring-gray-200">
                    {formatCommercialLabel(selectedQuote.source)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Submitted
                  </p>
                  <p className="mt-1 text-gray-800">
                    {selectedQuote.submittedAt
                      ? formatDate(selectedQuote.submittedAt)
                      : "Draft only"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Valid Until
                  </p>
                  <p className="mt-1 text-gray-800">
                    {selectedQuote.validUntil
                      ? formatDate(selectedQuote.validUntil)
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Evidence
                  </p>
                  <p className="mt-1 text-gray-800">
                    {selectedQuoteEvidence.length} linked photo
                    {selectedQuoteEvidence.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scope Summary
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {selectedQuote.scopeSummary}
                </p>
              </div>

              {(selectedQuote.assumptions || selectedQuote.exclusions) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedQuote.assumptions && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        Assumptions
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                        {selectedQuote.assumptions}
                      </p>
                    </div>
                  )}
                  {selectedQuote.exclusions && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        Exclusions
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                        {selectedQuote.exclusions}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedQuote.decisionNote && (
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Decision Note
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                    {selectedQuote.decisionNote}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-medium text-gray-900">
                    Supporting Evidence
                  </p>
                </div>

                {selectedQuoteEvidence.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {selectedQuoteEvidence.map((link) => (
                      <a
                        key={`${link.quoteId}-${link.photoId}`}
                        href={link.photo.fullUrl ?? link.photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group overflow-hidden rounded-lg border border-gray-200 bg-white"
                      >
                        <img
                          src={link.photo.thumbnailUrl ?? link.photo.url}
                          alt="Quote evidence"
                          className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="space-y-1 px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {link.photo.type}
                          </p>
                          <p className="line-clamp-2 text-xs text-gray-600">
                            {link.photo.caption ?? "Open evidence"}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-500">
                    No supporting evidence was linked to this quote.
                  </div>
                )}
              </div>

              {actionableQuote && canMutate && (
                <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                    <p>Review the selected submitted quote and either approve it or request a revision.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setDecisionError(null);
                        setDecisionNote("");
                        setDecisionMode("reject");
                      }}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Request Revision
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setDecisionError(null);
                        setDecisionNote("");
                        setDecisionMode("approve");
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve Quote
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Loading quote details...
            </div>
          ) : activeCommercialSummary ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Quote history could not be loaded. Refresh to see the latest details.
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              No quote has been created for this request yet.
            </div>
          )}

          {quotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-medium text-gray-900">Quote History</p>
              </div>
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <QuoteHistoryItem
                    key={quote.id}
                    quote={quote}
                    selected={quote.id === selectedQuote?.id}
                    onClick={() => setSelectedQuoteId(quote.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={decisionMode !== null}
        onClose={() => {
          if (decisionLoading) return;
          setDecisionMode(null);
          setDecisionError(null);
        }}
        title={decisionMode === "approve" ? "Approve Quote" : "Request Revision"}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {decisionMode === "approve" ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                <p>
                  Approve the selected quote so the vendor can proceed under this
                  pricing.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <p>
                  Request a revision if pricing, scope, or assumptions need to be
                  changed before approval.
                </p>
              </div>
            )}
          </div>

          {selectedQuote && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">
                {formatMoney(selectedQuote.amount, selectedQuote.currency)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {selectedQuote.scopeSummary}
              </p>
            </div>
          )}

          <Textarea
            label="Decision Note"
            value={decisionNote}
            onChange={(event) => setDecisionNote(event.target.value)}
            placeholder={
              decisionMode === "approve"
                ? "Optional approval note for the vendor."
                : "Explain what should change before the quote is resubmitted."
            }
          />

          {decisionError && (
            <p className="text-sm text-red-600">{decisionError}</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDecisionMode(null)}
              disabled={decisionLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={decisionLoading}
              onClick={() => {
                if (decisionMode) {
                  void handleDecision(decisionMode);
                }
              }}
            >
              {decisionMode === "approve" ? "Approve Quote" : "Request Revision"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
