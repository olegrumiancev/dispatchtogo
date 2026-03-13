"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardList,
  ImageIcon,
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

type EvidenceTab = "request" | "work";

const CLOSED_REQUEST_STATUSES = new Set([
  "COMPLETED",
  "VERIFIED",
  "CANCELLED",
]);

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
      return "Create a quote now, visit the site first, or proceed without one.";
  }
}

function getDispositionGuidance(
  disposition: string | null,
  hasAcceptedJob: boolean,
  workPhotoCount: number
) {
  switch (disposition) {
    case "QUOTE_NOW":
      return "Create or update the quote from the current request details and any attached intake photos.";
    case "ASSESS_FIRST":
      if (!hasAcceptedJob) {
        return "Accept the job when you are ready to visit the site, then build the quote from on-site evidence.";
      }
      if (workPhotoCount === 0) {
        return "Upload site photos in Work Proof, then build the quote from those existing photos.";
      }
      return "Use the existing work photos as quote evidence after your site assessment.";
    case "NO_QUOTE":
      return "No separate quote approval step will be captured unless scope changes later.";
    case "NEED_INFO":
      return "Use notes or direct operator communication to request the missing details.";
    default:
      return "Choose the next quote action that matches how you plan to proceed with this request.";
  }
}

function getDispositionLabel(disposition: string | null | undefined) {
  switch (disposition) {
    case "QUOTE_NOW":
      return "Quote";
    case "ASSESS_FIRST":
      return "Visit site first";
    case "NO_QUOTE":
      return "No quote needed";
    case "NEED_INFO":
      return "Info needed";
    default:
      return formatLabel(disposition);
  }
}

function getDispositionActionNotice(disposition: QuoteDisposition) {
  switch (disposition) {
    case "ASSESS_FIRST":
      return "Saved: visit site first.";
    case "NO_QUOTE":
      return "Saved: no quote needed.";
    case "NEED_INFO":
      return "Saved: waiting on more information.";
    default:
      return null;
  }
}

function getDispositionNoteConfig(disposition: string | null) {
  switch (disposition) {
    case "ASSESS_FIRST":
      return {
        label: "Site Visit Note",
        placeholder: "Optional context for the operator, such as access issues or what you need to confirm on site.",
        help: "Saved automatically when you leave the field.",
      };
    case "NEED_INFO":
      return {
        label: "What Do You Need?",
        placeholder: "Describe the information you need from the operator before you can quote this work.",
        help: "Saved automatically when you leave the field.",
      };
    default:
      return null;
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

function getPreferredEvidenceTab(
  source: QuoteSource,
  workPhotoCount: number
): EvidenceTab {
  return (source === "ASSESSMENT" || source === "CHANGE_ORDER") &&
    workPhotoCount > 0
    ? "work"
    : "request";
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
      className={`group overflow-hidden rounded-xl border text-left transition-colors ${
        selected
          ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="relative">
        <img
          src={photo.thumbnailUrl ?? photo.url}
          alt={`${photo.type} evidence`}
          className="aspect-[4/3] w-full object-cover"
        />
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            selected ? "bg-blue-600 text-white" : "bg-black/65 text-white"
          }`}
        >
          {selected ? "Selected" : "Use"}
        </span>
      </div>
      <div className="space-y-1 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {photo.type}
        </p>
        {photo.caption ? (
          <p className="line-clamp-2 text-sm text-gray-600">{photo.caption}</p>
        ) : (
          <p className="text-sm text-gray-500">Open existing evidence</p>
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
  const [savedDisposition, setSavedDisposition] = useState<string | null>(
    commercialSnapshot.quoteDisposition
  );
  const [savedDispositionNote, setSavedDispositionNote] = useState(
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
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<EvidenceTab>(() =>
    getPreferredEvidenceTab(
      getDefaultSource(
        commercialSnapshot.quoteDisposition,
        Boolean(commercialSnapshot.latestSubmittedQuoteSummary)
      ),
      workPhotos.length
    )
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
  const selectedRequestCount = quoteForm.requestPhotoIds.length;
  const selectedWorkCount = quoteForm.jobPhotoIds.length;
  const quoteActionLabel = latestDraftQuote
    ? "Resume Draft"
    : latestSubmittedQuoteSummary
      ? "Submit Revised Quote"
      : "Create Quote";
  const quoteActionDescription = latestDraftQuote
    ? "Finish the saved draft and send it for review."
    : latestSubmittedQuoteSummary
      ? "Create a revised quote if the scope or price changed."
      : "Price this request now from the current details and existing photos.";
  const noteConfig =
    getDispositionNoteConfig(quoteDisposition) ??
    (quoteDispositionNote.trim()
      ? {
          label: "Note",
          placeholder: "Add context for the operator.",
          help: "Saved automatically when you leave the field.",
        }
      : null);
  const currentQuoteState = latestDraftQuote
    ? {
        badge: "Draft saved",
        badgeClass: "bg-blue-100 text-blue-800",
        title: "Draft quote ready",
        detail: "Finish the draft quote when you are ready to send it for review.",
      }
    : latestSubmittedQuoteSummary?.status === "SUBMITTED"
      ? {
          badge: "Submitted",
          badgeClass: "bg-blue-100 text-blue-800",
          title: "Quote awaiting review",
          detail: "The latest quote is waiting for operator review.",
        }
      : latestSubmittedQuoteSummary?.status === "APPROVED"
        ? {
            badge: "Approved",
            badgeClass: "bg-emerald-100 text-emerald-800",
            title: "Quote approved",
            detail: "The latest submitted quote has been approved.",
          }
        : latestSubmittedQuoteSummary?.status === "REJECTED"
          ? {
              badge: "Revision needed",
              badgeClass: "bg-amber-100 text-amber-800",
              title: "Quote needs revision",
              detail: "Update the quote and resubmit it when you are ready.",
            }
          : quoteDisposition === "ASSESS_FIRST"
            ? {
                badge: "Visit site first",
                badgeClass: "bg-slate-100 text-slate-800",
                title: "Quote after site visit",
                detail: getDispositionGuidance(
                  quoteDisposition,
                  hasAcceptedJob,
                  workPhotos.length
                ),
              }
            : quoteDisposition === "NO_QUOTE"
              ? {
                  badge: "No quote needed",
                  badgeClass: "bg-slate-100 text-slate-800",
                  title: "Proceed without a separate quote",
                  detail: getDispositionGuidance(
                    quoteDisposition,
                    hasAcceptedJob,
                    workPhotos.length
                  ),
                }
              : quoteDisposition === "NEED_INFO"
                ? {
                    badge: "Info needed",
                    badgeClass: "bg-amber-100 text-amber-800",
                    title: "Waiting on more information",
                    detail: getDispositionGuidance(
                      quoteDisposition,
                      hasAcceptedJob,
                      workPhotos.length
                    ),
                  }
                : commercialSnapshot.quotePolicy === "REQUEST_BEFORE_WORK"
                  ? {
                      badge: "Quote required",
                      badgeClass: "bg-amber-100 text-amber-800",
                      title: "Quote still needs to be created",
                      detail: "The operator expects a quote before repair work proceeds.",
                    }
                  : {
                      badge: "No decision yet",
                      badgeClass: "bg-slate-100 text-slate-800",
                      title: "No quote decision recorded yet",
                      detail: "Create a quote now, visit the site first, or proceed without one.",
                    };
  const showQuoteStatusAction =
    canMutate &&
    quoteDisposition !== "NO_QUOTE" &&
    quoteDisposition !== "NEED_INFO";
  const quoteStatusActionLabel = latestDraftQuote
    ? "Resume Draft"
    : latestSubmittedQuoteSummary
      ? "Revise Quote"
      : quoteDisposition === "ASSESS_FIRST"
        ? "Start Quote"
        : "Create Quote";

  useEffect(() => {
    setQuoteDisposition(commercialSnapshot.quoteDisposition);
    setSavedDisposition(commercialSnapshot.quoteDisposition);
  }, [commercialSnapshot.quoteDisposition]);

  useEffect(() => {
    setQuoteDispositionNote(initialDispositionNote ?? "");
    setSavedDispositionNote(initialDispositionNote ?? "");
  }, [initialDispositionNote]);

  function setDefaultQuoteComposerState() {
    const nextForm = getDefaultQuoteComposerState({
      quoteDisposition,
      latestQuoteSummary,
      latestSubmittedQuoteSummary,
      requestPhotos,
      workPhotos,
    });
    setQuoteForm(nextForm);
    setActiveEvidenceTab(
      getPreferredEvidenceTab(nextForm.source, workPhotos.length)
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

  async function persistDisposition(input: {
    nextDisposition: string | null;
    nextNote: string;
    refresh?: boolean;
    successMessage?: string | null;
  }) {
    if (!canMutate) return false;

    setSavingDisposition(true);
    setDispositionError(null);
    setDispositionNotice(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteDisposition: input.nextDisposition,
          quoteDispositionNote: input.nextNote.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDispositionError(data.error ?? "Failed to save quote update.");
        return false;
      }

      setSavedDisposition(input.nextDisposition);
      setSavedDispositionNote(input.nextNote);
      if (input.successMessage) {
        setDispositionNotice(input.successMessage);
      }
      if (input.refresh !== false) {
        router.refresh();
      }
      return true;
    } catch {
      setDispositionError("Network error. Please try again.");
      return false;
    } finally {
      setSavingDisposition(false);
    }
  }

  async function handleDispositionAction(nextDisposition: QuoteDisposition) {
    const previousDisposition = quoteDisposition;
    const previousNote = quoteDispositionNote;
    const nextNote =
      nextDisposition === "ASSESS_FIRST" || nextDisposition === "NEED_INFO"
        ? quoteDispositionNote
        : "";

    setQuoteDisposition(nextDisposition);
    setQuoteDispositionNote(nextNote);

    const success = await persistDisposition({
      nextDisposition,
      nextNote,
      successMessage: getDispositionActionNotice(nextDisposition),
    });

    if (!success) {
      setQuoteDisposition(previousDisposition);
      setQuoteDispositionNote(previousNote);
    }
  }

  async function handleDispositionNoteBlur() {
    if (!canMutate || !quoteDisposition) return;
    if (
      quoteDisposition === savedDisposition &&
      quoteDispositionNote === savedDispositionNote
    ) {
      return;
    }

    await persistDisposition({
      nextDisposition: quoteDisposition,
      nextNote: quoteDispositionNote,
      refresh: false,
      successMessage: "Note saved.",
    });
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
        const nextForm = {
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
        };
        setQuoteForm(nextForm);
        setActiveEvidenceTab(
          getPreferredEvidenceTab(nextForm.source, workPhotos.length)
        );
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

  async function handleQuoteAction() {
    const previousDisposition = quoteDisposition;
    const previousNote = quoteDispositionNote;

    if (quoteDisposition !== "QUOTE_NOW") {
      setQuoteDisposition("QUOTE_NOW");
      setQuoteDispositionNote("");

      const success = await persistDisposition({
        nextDisposition: "QUOTE_NOW",
        nextNote: "",
        refresh: false,
      });

      if (!success) {
        setQuoteDisposition(previousDisposition);
        setQuoteDispositionNote(previousNote);
        return;
      }
    }

    await openQuoteComposer();
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
                  {getDispositionLabel(quoteDisposition)}
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

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                What do you need to do?
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Pick the next quote action for this request.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                disabled={!canMutate || savingDisposition || quoteComposerLoading}
                onClick={handleQuoteAction}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  quoteDisposition === "QUOTE_NOW" ||
                  latestDraftQuote ||
                  latestSubmittedQuoteSummary
                    ? "border-blue-300 bg-blue-50 text-blue-950"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-start gap-2">
                  {latestDraftQuote || latestSubmittedQuoteSummary ? (
                    <RefreshCcw className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  ) : (
                    <CircleDollarSign className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{quoteActionLabel}</p>
                    <p className="text-xs leading-5 text-current/80">
                      {quoteActionDescription}
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={!canMutate || savingDisposition}
                onClick={() => handleDispositionAction("ASSESS_FIRST")}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  quoteDisposition === "ASSESS_FIRST"
                    ? "border-blue-300 bg-blue-50 text-blue-950"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <p className="text-sm font-semibold">Visit Site First</p>
                <p className="mt-1 text-xs leading-5 text-current/80">
                  Save that a site visit is needed before pricing this work.
                </p>
              </button>

              <button
                type="button"
                disabled={!canMutate || savingDisposition}
                onClick={() => handleDispositionAction("NO_QUOTE")}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  quoteDisposition === "NO_QUOTE"
                    ? "border-blue-300 bg-blue-50 text-blue-950"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <p className="text-sm font-semibold">No Quote Needed</p>
                <p className="mt-1 text-xs leading-5 text-current/80">
                  Record that work can proceed without a separate quote.
                </p>
              </button>

              <button
                type="button"
                disabled={!canMutate || savingDisposition}
                onClick={() => handleDispositionAction("NEED_INFO")}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  quoteDisposition === "NEED_INFO"
                    ? "border-blue-300 bg-blue-50 text-blue-950"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <p className="text-sm font-semibold">Ask for Info</p>
                <p className="mt-1 text-xs leading-5 text-current/80">
                  Record that you need more detail before you can quote.
                </p>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Current quote status
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {currentQuoteState.title}
                </p>
                <p className="text-sm text-gray-600">{currentQuoteState.detail}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Badge variant={currentQuoteState.badgeClass}>
                  {currentQuoteState.badge}
                </Badge>
                {showQuoteStatusAction && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleQuoteAction}
                    disabled={quoteComposerLoading || savingDisposition}
                    loading={quoteComposerLoading}
                    className="sm:min-w-[140px]"
                  >
                    {quoteStatusActionLabel}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {noteConfig && (
            <div className="space-y-2">
              <Textarea
                label={noteConfig.label}
                value={quoteDispositionNote}
                onChange={(event) => setQuoteDispositionNote(event.target.value)}
                onBlur={handleDispositionNoteBlur}
                placeholder={noteConfig.placeholder}
                disabled={!canMutate || savingDisposition}
              />
              <p className="text-xs text-gray-500">{noteConfig.help}</p>
            </div>
          )}

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
        className="max-w-5xl"
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

          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Supporting Evidence
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedEvidenceCount} linked photo
                  {selectedEvidenceCount === 1 ? "" : "s"} selected
                </p>
              </div>
              <div className="inline-flex w-full rounded-xl border border-gray-200 bg-white p-1 lg:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveEvidenceTab("request")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:flex-none ${
                    activeEvidenceTab === "request"
                      ? "bg-blue-50 text-blue-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  Request Photos ({requestPhotos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEvidenceTab("work")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:flex-none ${
                    activeEvidenceTab === "work"
                      ? "bg-blue-50 text-blue-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  Work Photos ({workPhotos.length})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeEvidenceTab === "request" ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActiveEvidenceTab("request");
                      updateQuoteForm(
                        "requestPhotoIds",
                        requestPhotos.map((photo) => photo.id)
                      );
                    }}
                    disabled={requestPhotos.length === 0}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Select All Request
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateQuoteForm("requestPhotoIds", [])}
                    disabled={selectedRequestCount === 0}
                  >
                    Clear Request
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActiveEvidenceTab("work");
                      updateQuoteForm(
                        "jobPhotoIds",
                        workPhotos.map((photo) => photo.id)
                      );
                    }}
                    disabled={workPhotos.length === 0}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Select All Work
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateQuoteForm("jobPhotoIds", [])}
                    disabled={selectedWorkCount === 0}
                  >
                    Clear Work
                  </Button>
                </>
              )}
              {selectedEvidenceCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateQuoteForm("requestPhotoIds", []);
                    updateQuoteForm("jobPhotoIds", []);
                  }}
                >
                  Clear All
                </Button>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              {activeEvidenceTab === "request" ? (
                <>
                  <div className="flex items-start gap-2">
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
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>{selectedRequestCount} selected in this set</span>
                    <span>{requestPhotos.length} available</span>
                  </div>
                  {requestPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
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
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                      No request photos are available yet.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2">
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
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>{selectedWorkCount} selected in this set</span>
                    <span>{workPhotos.length} available</span>
                  </div>
                  {workPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
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
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                      No work photos are available yet.
                    </div>
                  )}
                </>
              )}
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
