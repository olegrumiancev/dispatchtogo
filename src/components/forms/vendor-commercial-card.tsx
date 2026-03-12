"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardList,
  ImageIcon,
  Info,
  MapPinned,
  RefreshCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { QuoteDisposition, QuoteSource } from "@/lib/quotes";

export interface QuoteSummary {
  id: string;
  vendorId: string;
  status: string;
  source: string;
  amount: number;
  currency: string;
  scopeSummary: string;
  validUntil: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  vendorNameSnapshot: string;
  _count: {
    requestPhotoLinks: number;
    jobPhotoLinks: number;
  };
}

export interface CommercialSnapshot {
  quotePolicy: string;
  quoteDisposition: string | null;
  latestQuoteSummary: QuoteSummary | null;
  latestSubmittedQuoteSummary: QuoteSummary | null;
}

export interface PhotoChoice {
  id: string;
  type: string;
  url: string;
  fullUrl?: string | null;
  thumbnailUrl?: string | null;
  caption?: string | null;
}

export interface VendorCommercialCardProps {
  jobId: string;
  requestId: string;
  requestStatus: string;
  hasAcceptedJob: boolean;
  commercialSnapshot: CommercialSnapshot;
  initialDispositionNote: string | null;
  requestPhotos: PhotoChoice[];
  workPhotos: PhotoChoice[];
}

interface QuoteDetailResponse {
  id: string;
  status: string;
  source: string;
  amount: number;
  currency: string;
  scopeSummary: string;
  assumptions: string | null;
  exclusions: string | null;
  validUntil: string | null;
  requestPhotoLinks: Array<{
    quoteId: string;
    photoId: string;
    sortOrder: number;
    photo: PhotoChoice;
  }>;
  jobPhotoLinks: Array<{
    quoteId: string;
    photoId: string;
    sortOrder: number;
    photo: PhotoChoice;
  }>;
}

interface QuoteComposerState {
  draftQuoteId: string | null;
  supersedesQuoteId: string | null;
  amount: string;
  currency: string;
  scopeSummary: string;
  assumptions: string;
  exclusions: string;
  validUntil: string;
  source: QuoteSource;
  requestPhotoIds: string[];
  jobPhotoIds: string[];
}

const CLOSED_REQUEST_STATUSES = new Set([
  "COMPLETED",
  "VERIFIED",
  "CANCELLED",
]);

const DISPOSITION_OPTIONS: Array<{
  value: QuoteDisposition;
  label: string;
  description: string;
}> = [
  {
    value: "QUOTE_NOW",
    label: "Quote Now",
    description: "The request is clear enough to price remotely.",
  },
  {
    value: "ASSESS_FIRST",
    label: "Assess First",
    description: "A site visit is needed before the quote can be priced.",
  },
  {
    value: "NO_QUOTE",
    label: "No Quote",
    description: "Proceed without a formal quote for this request.",
  },
  {
    value: "NEED_INFO",
    label: "Need Info",
    description: "More information is needed before pricing or dispatching.",
  },
];

const SOURCE_OPTIONS: Array<{
  value: QuoteSource;
  label: string;
  description: string;
}> = [
  {
    value: "REMOTE",
    label: "Remote",
    description: "Built directly from the request details and intake evidence.",
  },
  {
    value: "ASSESSMENT",
    label: "Assessment",
    description: "Built after visiting the site and reviewing conditions.",
  },
  {
    value: "CHANGE_ORDER",
    label: "Change Order",
    description: "Revised pricing for new scope or changed conditions.",
  },
];

function formatLabel(value: string | null | undefined) {
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

function getQuotePolicySummary(policy: string) {
  switch (policy) {
    case "REQUEST_BEFORE_WORK":
      return "Operator approval is expected before repair work proceeds.";
    case "NOT_REQUIRED":
      return "A quote is optional unless scope changes or extra approval is needed.";
    default:
      return "Vendor can decide whether to quote remotely, assess first, or proceed without one.";
  }
}

function getDispositionGuidance(
  disposition: string | null,
  hasAcceptedJob: boolean,
  workPhotoCount: number
) {
  switch (disposition) {
    case "QUOTE_NOW":
      return "Submit a lightweight quote from the current request details and any attached intake photos.";
    case "ASSESS_FIRST":
      if (!hasAcceptedJob) {
        return "Accept the job when you are ready to perform the site assessment, then build the quote from on-site evidence.";
      }
      if (workPhotoCount === 0) {
        return "Upload your site assessment photos in Work Proof, then create the quote from those existing photos.";
      }
      return "Use the existing work photos as quote evidence after your site assessment.";
    case "NO_QUOTE":
      return "No separate quote approval step will be captured unless scope changes later.";
    case "NEED_INFO":
      return "Use notes or direct operator communication to request the missing details.";
    default:
      return "Choose the quote path that matches how you plan to proceed with this request.";
  }
}

function getDefaultSource(
  quoteDisposition: string | null,
  hasExistingSubmittedQuote: boolean
): QuoteSource {
  if (hasExistingSubmittedQuote) return "CHANGE_ORDER";
  if (quoteDisposition === "ASSESS_FIRST") return "ASSESSMENT";
  return "REMOTE";
}

function getDefaultQuoteComposerState(input: {
  quoteDisposition: string | null;
  latestQuoteSummary: QuoteSummary | null;
  latestSubmittedQuoteSummary: QuoteSummary | null;
  requestPhotos: PhotoChoice[];
  workPhotos: PhotoChoice[];
}): QuoteComposerState {
  const source = getDefaultSource(
    input.quoteDisposition,
    Boolean(input.latestSubmittedQuoteSummary)
  );
  const hasWorkEvidence = input.workPhotos.length > 0;

  return {
    draftQuoteId: null,
    supersedesQuoteId:
      input.latestQuoteSummary && input.latestQuoteSummary.status !== "DRAFT"
        ? input.latestQuoteSummary.id
        : null,
    amount: input.latestSubmittedQuoteSummary
      ? String(input.latestSubmittedQuoteSummary.amount)
      : "",
    currency: input.latestSubmittedQuoteSummary?.currency ?? "CAD",
    scopeSummary: input.latestSubmittedQuoteSummary?.scopeSummary ?? "",
    assumptions: "",
    exclusions: "",
    validUntil: "",
    source,
    requestPhotoIds:
      source === "REMOTE" || !hasWorkEvidence
        ? input.requestPhotos.map((photo) => photo.id)
        : [],
    jobPhotoIds:
      source === "ASSESSMENT" || source === "CHANGE_ORDER"
        ? input.workPhotos.map((photo) => photo.id)
        : [],
  };
}

function QuotePhotoTile({
  photo,
  selected,
  onToggle,
}: {
  photo: PhotoChoice;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group overflow-hidden rounded-lg border text-left transition-colors ${
        selected
          ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="relative">
        <img
          src={photo.thumbnailUrl ?? photo.url}
          alt={`${photo.type} evidence`}
          className="aspect-square w-full object-cover"
        />
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            selected ? "bg-blue-600 text-white" : "bg-black/65 text-white"
          }`}
        >
          {selected ? "Selected" : "Use"}
        </span>
      </div>
      <div className="space-y-1 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {photo.type}
        </p>
        {photo.caption ? (
          <p className="line-clamp-2 text-xs text-gray-600">{photo.caption}</p>
        ) : (
          <p className="text-xs text-gray-500">Open existing evidence</p>
        )}
      </div>
    </button>
  );
}

function QuoteSummaryPanel({
  title,
  quote,
}: {
  title: string;
  quote: QuoteSummary;
}) {
  const evidenceCount =
    quote._count.requestPhotoLinks + quote._count.jobPhotoLinks;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {title}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {formatMoney(quote.amount, quote.currency)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="bg-slate-100 text-slate-800">
            {formatLabel(quote.status)}
          </Badge>
          <Badge variant="bg-white text-slate-700 ring-1 ring-gray-200">
            {formatLabel(quote.source)}
          </Badge>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-700">{quote.scopeSummary}</p>

      <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-gray-500 sm:grid-cols-3">
        <div>
          <p className="font-medium uppercase tracking-wider text-gray-500">
            Submitted
          </p>
          <p className="mt-1 text-gray-700">
            {quote.submittedAt ? formatDate(quote.submittedAt) : "Draft only"}
          </p>
        </div>
        <div>
          <p className="font-medium uppercase tracking-wider text-gray-500">
            Valid Until
          </p>
          <p className="mt-1 text-gray-700">
            {quote.validUntil ? formatDate(quote.validUntil) : "Not specified"}
          </p>
        </div>
        <div>
          <p className="font-medium uppercase tracking-wider text-gray-500">
            Evidence
          </p>
          <p className="mt-1 text-gray-700">
            {evidenceCount} linked photo{evidenceCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function VendorCommercialCard({
  jobId,
  requestId,
  requestStatus,
  hasAcceptedJob,
  commercialSnapshot,
  initialDispositionNote,
  requestPhotos,
  workPhotos,
}: VendorCommercialCardProps) {
  const router = useRouter();
  const [quoteDisposition, setQuoteDisposition] = useState<string | null>(
    commercialSnapshot.quoteDisposition
  );
  const [quoteDispositionNote, setQuoteDispositionNote] = useState(
    initialDispositionNote ?? ""
  );
  const [savingDisposition, setSavingDisposition] = useState(false);
  const [dispositionError, setDispositionError] = useState<string | null>(null);
  const [dispositionNotice, setDispositionNotice] = useState<string | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteComposerLoading, setQuoteComposerLoading] = useState(false);
  const [quoteSaving, setQuoteSaving] = useState<"draft" | "submit" | null>(
    null
  );
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState<QuoteComposerState>(() =>
    getDefaultQuoteComposerState({
      quoteDisposition: commercialSnapshot.quoteDisposition,
      latestQuoteSummary: commercialSnapshot.latestQuoteSummary,
      latestSubmittedQuoteSummary: commercialSnapshot.latestSubmittedQuoteSummary,
      requestPhotos,
      workPhotos,
    })
  );
  const canMutate = !CLOSED_REQUEST_STATUSES.has(requestStatus);
  const latestQuoteSummary = commercialSnapshot.latestQuoteSummary;
  const latestSubmittedQuoteSummary =
    commercialSnapshot.latestSubmittedQuoteSummary;
  const latestDraftQuote =
    latestQuoteSummary?.status === "DRAFT" ? latestQuoteSummary : null;
  const showLatestSubmittedPanel =
    latestSubmittedQuoteSummary &&
    latestSubmittedQuoteSummary.id !== latestDraftQuote?.id;
  const selectedEvidenceCount =
    quoteForm.requestPhotoIds.length + quoteForm.jobPhotoIds.length;
  const quoteActionLabel = latestDraftQuote
    ? "Resume Draft"
    : latestSubmittedQuoteSummary
      ? "Submit Revised Quote"
      : "Create Quote";
  const quoteActionVariant =
    quoteDisposition === "NO_QUOTE" ? "secondary" : "primary";
  const quoteGuidance = useMemo(
    () =>
      getDispositionGuidance(
        quoteDisposition,
        hasAcceptedJob,
        workPhotos.length
      ),
    [hasAcceptedJob, quoteDisposition, workPhotos.length]
  );

  useEffect(() => {
    setQuoteDisposition(commercialSnapshot.quoteDisposition);
  }, [commercialSnapshot.quoteDisposition]);

  useEffect(() => {
    setQuoteDispositionNote(initialDispositionNote ?? "");
  }, [initialDispositionNote]);

  function setDefaultQuoteComposerState() {
    setQuoteForm(
      getDefaultQuoteComposerState({
        quoteDisposition,
        latestQuoteSummary,
        latestSubmittedQuoteSummary,
        requestPhotos,
        workPhotos,
      })
    );
  }

  function updateQuoteForm<K extends keyof QuoteComposerState>(
    key: K,
    value: QuoteComposerState[K]
  ) {
    setQuoteForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSelectedPhoto(
    kind: "requestPhotoIds" | "jobPhotoIds",
    photoId: string
  ) {
    setQuoteForm((current) => {
      const selectedIds = current[kind];
      const nextIds = selectedIds.includes(photoId)
        ? selectedIds.filter((id) => id !== photoId)
        : [...selectedIds, photoId];

      return {
        ...current,
        [kind]: nextIds,
      };
    });
  }

  async function handleSaveDisposition() {
    if (!canMutate) return;

    setSavingDisposition(true);
    setDispositionError(null);
    setDispositionNotice(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteDisposition,
          quoteDispositionNote: quoteDispositionNote.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDispositionError(data.error ?? "Failed to save quote path.");
        return;
      }

      setDispositionNotice("Quote path saved.");
      router.refresh();
    } catch {
      setDispositionError("Network error. Please try again.");
    } finally {
      setSavingDisposition(false);
    }
  }

  async function openQuoteComposer() {
    setQuoteComposerLoading(true);
    setQuoteError(null);
    setDispositionNotice(null);
    setShowQuoteModal(true);

    try {
      if (latestDraftQuote) {
        const response = await fetch(`/api/quotes/${latestDraftQuote.id}`);
        const data = (await response.json().catch(() => ({}))) as
          | QuoteDetailResponse
          | { error?: string };
        const errorMessage =
          "error" in data && typeof data.error === "string"
            ? data.error
            : undefined;

        if (!response.ok) {
          setQuoteError(errorMessage ?? "Failed to load the draft quote.");
          setDefaultQuoteComposerState();
          return;
        }

        const draft = data as QuoteDetailResponse;
        setQuoteForm({
          draftQuoteId: draft.id,
          supersedesQuoteId: null,
          amount: String(draft.amount),
          currency: draft.currency,
          scopeSummary: draft.scopeSummary,
          assumptions: draft.assumptions ?? "",
          exclusions: draft.exclusions ?? "",
          validUntil: draft.validUntil
            ? new Date(draft.validUntil).toISOString().split("T")[0]
            : "",
          source: draft.source as QuoteSource,
          requestPhotoIds: draft.requestPhotoLinks.map((link) => link.photoId),
          jobPhotoIds: draft.jobPhotoLinks.map((link) => link.photoId),
        });
        return;
      }

      setDefaultQuoteComposerState();
    } catch {
      setQuoteError("Network error. Please try again.");
      setDefaultQuoteComposerState();
    } finally {
      setQuoteComposerLoading(false);
    }
  }

  async function persistQuote(mode: "draft" | "submit") {
    const amount = Number(quoteForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setQuoteError("Enter a valid quote amount.");
      return;
    }

    if (!quoteForm.scopeSummary.trim()) {
      setQuoteError("Scope summary is required.");
      return;
    }

    setQuoteSaving(mode);
    setQuoteError(null);

    try {
      const payload = {
        amount,
        currency: quoteForm.currency,
        scopeSummary: quoteForm.scopeSummary.trim(),
        assumptions: quoteForm.assumptions.trim() || null,
        exclusions: quoteForm.exclusions.trim() || null,
        validUntil: quoteForm.validUntil || null,
        source: quoteForm.source,
        requestPhotoIds: quoteForm.requestPhotoIds,
        jobPhotoIds: quoteForm.jobPhotoIds,
        ...(quoteForm.supersedesQuoteId
          ? { supersedesQuoteId: quoteForm.supersedesQuoteId }
          : {}),
      };

      let response: Response;
      if (quoteForm.draftQuoteId) {
        response = await fetch(`/api/quotes/${quoteForm.draftQuoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            ...(mode === "submit" ? { action: "submit" } : {}),
          }),
        });
      } else {
        response = await fetch(`/api/requests/${requestId}/quotes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            status: mode === "submit" ? "SUBMITTED" : "DRAFT",
          }),
        });
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setQuoteError(data.error ?? "Failed to save quote.");
        return;
      }

      setShowQuoteModal(false);
      router.refresh();
    } catch {
      setQuoteError("Network error. Please try again.");
    } finally {
      setQuoteSaving(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Work Quote</CardTitle>
              <p className="text-sm text-gray-600">
                {getQuotePolicySummary(commercialSnapshot.quotePolicy)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="bg-slate-100 text-slate-800">
                {formatLabel(commercialSnapshot.quotePolicy)}
              </Badge>
              {quoteDisposition && (
                <Badge variant="bg-white text-slate-700 ring-1 ring-gray-200">
                  {formatLabel(quoteDisposition)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {commercialSnapshot.quotePolicy === "REQUEST_BEFORE_WORK" &&
            !latestSubmittedQuoteSummary && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold">Quote expected before work</p>
                    <p className="mt-1 text-amber-800">
                      The operator requested a quote before repair work proceeds.
                    </p>
                  </div>
                </div>
              </div>
            )}

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {DISPOSITION_OPTIONS.map((option) => {
              const active = quoteDisposition === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!canMutate || savingDisposition}
                  onClick={() => {
                    setQuoteDisposition(option.value);
                    setDispositionNotice(null);
                  }}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-blue-300 bg-blue-50 text-blue-950"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="mt-1 text-xs leading-5 text-current/80">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          <Textarea
            label="Quote Note"
            value={quoteDispositionNote}
            onChange={(event) => setQuoteDispositionNote(event.target.value)}
            placeholder="Optional context for the operator, such as why a site visit is needed or what information is missing."
            disabled={!canMutate || savingDisposition}
          />

          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900">
                <Info className="h-4 w-4 text-blue-600" />
                Quote path guidance
              </div>
              <p className="text-sm text-gray-600">{quoteGuidance}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              loading={savingDisposition}
              disabled={!canMutate}
              onClick={handleSaveDisposition}
              className="sm:shrink-0"
            >
              Save Path
            </Button>
          </div>

          {(dispositionError || dispositionNotice) && (
            <p
              className={`text-sm ${
                dispositionError ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {dispositionError ?? dispositionNotice}
            </p>
          )}

          {latestDraftQuote && (
            <QuoteSummaryPanel title="Draft Quote" quote={latestDraftQuote} />
          )}

          {showLatestSubmittedPanel && latestSubmittedQuoteSummary && (
            <QuoteSummaryPanel
              title="Latest Submitted Quote"
              quote={latestSubmittedQuoteSummary}
            />
          )}

          {!latestDraftQuote && !latestSubmittedQuoteSummary && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600">
              No quote has been created yet. Use the existing intake or work
              photos when you are ready to price the request.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              {requestPhotos.length + workPhotos.length > 0 ? (
                <span>
                  {requestPhotos.length} request photo
                  {requestPhotos.length === 1 ? "" : "s"} and {workPhotos.length} work
                  photo{workPhotos.length === 1 ? "" : "s"} are available to
                  link.
                </span>
              ) : (
                <span>No existing evidence has been uploaded yet.</span>
              )}
            </div>
            <Button
              type="button"
              variant={quoteActionVariant}
              onClick={openQuoteComposer}
              disabled={!canMutate || quoteComposerLoading}
              loading={quoteComposerLoading}
            >
              {latestDraftQuote ? (
                <RefreshCcw className="h-4 w-4" />
              ) : latestSubmittedQuoteSummary ? (
                <MapPinned className="h-4 w-4" />
              ) : (
                <CircleDollarSign className="h-4 w-4" />
              )}
              {quoteActionLabel}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showQuoteModal}
        onClose={() => {
          if (quoteSaving) return;
          setShowQuoteModal(false);
          setQuoteError(null);
        }}
        title={latestDraftQuote ? "Resume Draft Quote" : quoteActionLabel}
        className="max-w-4xl"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Build a lightweight quote from the request details and existing
            evidence. Photos are linked from the current request and job record,
            not uploaded a second time.
          </p>

          {quoteError && <p className="text-sm text-red-600">{quoteError}</p>}

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={quoteForm.amount}
              onChange={(event) =>
                updateQuoteForm("amount", event.target.value)
              }
              placeholder="0.00"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">
                Source
              </label>
              <select
                value={quoteForm.source}
                onChange={(event) =>
                  updateQuoteForm("source", event.target.value as QuoteSource)
                }
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {
                  SOURCE_OPTIONS.find((option) => option.value === quoteForm.source)
                    ?.description
                }
              </p>
            </div>
            <Input
              label="Valid Until"
              type="date"
              value={quoteForm.validUntil}
              onChange={(event) =>
                updateQuoteForm("validUntil", event.target.value)
              }
            />
          </div>

          <Textarea
            label="Scope Summary"
            value={quoteForm.scopeSummary}
            onChange={(event) =>
              updateQuoteForm("scopeSummary", event.target.value)
            }
            placeholder="Summarize the proposed scope, what is included, and what the operator should approve."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Textarea
              label="Assumptions"
              value={quoteForm.assumptions}
              onChange={(event) =>
                updateQuoteForm("assumptions", event.target.value)
              }
              placeholder="Optional assumptions, access expectations, or conditions."
            />
            <Textarea
              label="Exclusions"
              value={quoteForm.exclusions}
              onChange={(event) =>
                updateQuoteForm("exclusions", event.target.value)
              }
              placeholder="Optional exclusions or follow-up items not included in this quote."
            />
          </div>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Supporting Evidence
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedEvidenceCount} linked photo
                  {selectedEvidenceCount === 1 ? "" : "s"} selected
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    updateQuoteForm(
                      "requestPhotoIds",
                      requestPhotos.map((photo) => photo.id)
                    )
                  }
                >
                  <ClipboardList className="h-4 w-4" />
                  Use Intake
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    updateQuoteForm(
                      "jobPhotoIds",
                      workPhotos.map((photo) => photo.id)
                    )
                  }
                >
                  <ImageIcon className="h-4 w-4" />
                  Use Work
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateQuoteForm("requestPhotoIds", []);
                    updateQuoteForm("jobPhotoIds", []);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Request Photos
                    </p>
                    <p className="text-xs text-gray-500">
                      Intake evidence already attached to the service request.
                    </p>
                  </div>
                </div>

                {requestPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {requestPhotos.map((photo) => (
                      <QuotePhotoTile
                        key={photo.id}
                        photo={photo}
                        selected={quoteForm.requestPhotoIds.includes(photo.id)}
                        onToggle={() =>
                          toggleSelectedPhoto("requestPhotoIds", photo.id)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                    No request photos are available yet.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Work Photos
                    </p>
                    <p className="text-xs text-gray-500">
                      Before and after photos already saved in work proof.
                    </p>
                  </div>
                </div>

                {workPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {workPhotos.map((photo) => (
                      <QuotePhotoTile
                        key={photo.id}
                        photo={photo}
                        selected={quoteForm.jobPhotoIds.includes(photo.id)}
                        onToggle={() =>
                          toggleSelectedPhoto("jobPhotoIds", photo.id)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-gray-500">
                    No work photos are available yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              {quoteForm.draftQuoteId
                ? "Save updates to keep this draft, or submit it for operator review."
                : "Save a draft if you are not ready to submit yet."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => persistQuote("draft")}
                disabled={quoteSaving === "submit"}
                loading={quoteSaving === "draft"}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={() => persistQuote("submit")}
                disabled={quoteSaving === "draft"}
                loading={quoteSaving === "submit"}
              >
                Submit Quote
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
