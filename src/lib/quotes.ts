import { Prisma } from "@prisma/client";

export const QUOTE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
  "WITHDRAWN",
] as const;

export const QUOTE_SOURCES = [
  "REMOTE",
  "ASSESSMENT",
  "CHANGE_ORDER",
] as const;

export const QUOTE_DISPOSITIONS = [
  "QUOTE_NOW",
  "ASSESS_FIRST",
  "NO_QUOTE",
  "NEED_INFO",
] as const;

export const QUOTE_POLICIES = [
  "VENDOR_DECIDES",
  "REQUEST_BEFORE_WORK",
  "NOT_REQUIRED",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type QuoteSource = (typeof QUOTE_SOURCES)[number];
export type QuoteDisposition = (typeof QUOTE_DISPOSITIONS)[number];
export type QuotePolicy = (typeof QUOTE_POLICIES)[number];
export interface CommercialIndicator {
  label: string;
  className: string;
}

export function isQuoteStatus(value: string): value is QuoteStatus {
  return QUOTE_STATUSES.includes(value as QuoteStatus);
}

export function isQuoteSource(value: string): value is QuoteSource {
  return QUOTE_SOURCES.includes(value as QuoteSource);
}

export function isQuoteDisposition(value: string): value is QuoteDisposition {
  return QUOTE_DISPOSITIONS.includes(value as QuoteDisposition);
}

export const quoteSummarySelect = {
  id: true,
  vendorId: true,
  status: true,
  source: true,
  amount: true,
  currency: true,
  scopeSummary: true,
  validUntil: true,
  submittedAt: true,
  decidedAt: true,
  createdAt: true,
  vendorNameSnapshot: true,
  _count: {
    select: {
      requestPhotoLinks: true,
      jobPhotoLinks: true,
    },
  },
} satisfies Prisma.QuoteSelect;

export type QuoteSummary = Prisma.QuoteGetPayload<{
  select: typeof quoteSummarySelect;
}>;

export const latestQuoteSummaryRelationArgs = {
  orderBy: { createdAt: "desc" as const },
  take: 5,
  select: quoteSummarySelect,
} satisfies Prisma.QuoteFindManyArgs;

export function getLatestQuoteSummary(quotes: QuoteSummary[]): QuoteSummary | null {
  for (const quote of quotes) {
    if (quote.status !== "WITHDRAWN") {
      return quote;
    }
  }

  return quotes[0] ?? null;
}

export function getLatestSubmittedQuoteSummary(
  quotes: QuoteSummary[]
): QuoteSummary | null {
  for (const quote of quotes) {
    if (quote.submittedAt) {
      return quote;
    }
  }

  return null;
}

export function buildCommercialSnapshot(input: {
  quotePolicy: string;
  quoteDisposition?: string | null;
  quotes: QuoteSummary[];
}) {
  const latestQuoteSummary = getLatestQuoteSummary(input.quotes);
  const latestSubmittedQuoteSummary = getLatestSubmittedQuoteSummary(
    input.quotes
  );

  return {
    quotePolicy: input.quotePolicy,
    quoteDisposition: input.quoteDisposition ?? null,
    latestQuoteSummary,
    latestSubmittedQuoteSummary,
  };
}

export function getCommercialIndicator(input: {
  quotePolicy: string;
  quoteDisposition?: string | null;
  quotes: QuoteSummary[];
}): CommercialIndicator | null {
  const snapshot = buildCommercialSnapshot(input);
  const latestQuote = snapshot.latestQuoteSummary;

  switch (latestQuote?.status) {
    case "SUBMITTED":
      return {
        label: "Quote pending",
        className: "bg-amber-100 text-amber-800",
      };
    case "APPROVED":
      return {
        label: "Quote approved",
        className: "bg-emerald-100 text-emerald-800",
      };
    case "DRAFT":
      return {
        label: "Quote draft",
        className: "bg-slate-100 text-slate-700",
      };
    case "REJECTED":
      return {
        label: "Revise quote",
        className: "bg-rose-100 text-rose-800",
      };
  }

  switch (snapshot.quoteDisposition) {
    case "ASSESS_FIRST":
      return {
        label: "Assessment first",
        className: "bg-blue-50 text-blue-700",
      };
    case "NO_QUOTE":
      return {
        label: "No quote",
        className: "bg-gray-100 text-gray-700",
      };
    case "NEED_INFO":
      return {
        label: "Need info",
        className: "bg-orange-100 text-orange-800",
      };
    case "QUOTE_NOW":
      return {
        label: "Quote now",
        className: "bg-sky-100 text-sky-800",
      };
  }

  if (snapshot.quotePolicy === "REQUEST_BEFORE_WORK") {
    return {
      label: "Quote required",
      className: "bg-amber-100 text-amber-800",
    };
  }

  return null;
}
