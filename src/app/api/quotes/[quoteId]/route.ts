import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuotePhotoSelections } from "@/lib/quote-photo-links";
import { ensureVendorIsActiveForMutation } from "@/lib/vendor-lifecycle";

const QUOTE_DETAIL_INCLUDE = {
  requestPhotoLinks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      photo: {
        select: {
          id: true,
          url: true,
          fullUrl: true,
          thumbnailUrl: true,
          type: true,
          takenAt: true,
        },
      },
    },
  },
  jobPhotoLinks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      photo: {
        select: {
          id: true,
          url: true,
          fullUrl: true,
          thumbnailUrl: true,
          type: true,
          caption: true,
          takenAt: true,
        },
      },
    },
  },
  request: {
    select: {
      id: true,
      organizationId: true,
      status: true,
      job: {
        select: {
          id: true,
          vendorId: true,
        },
      },
    },
  },
};

const MUTATION_BLOCKED_REQUEST_STATUSES = new Set([
  "COMPLETED",
  "VERIFIED",
  "CANCELLED",
]);

function parseIdList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function parseOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalDate(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return "invalid";
  }

  return parsed;
}

async function getAuthorizedQuote(quoteId: string, user: any) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: QUOTE_DETAIL_INCLUDE,
  });

  if (!quote) {
    return { error: "Quote not found", status: 404, quote: null };
  }

  if (user.role === "VENDOR" && quote.vendorId !== user.vendorId) {
    return { error: "Forbidden", status: 403, quote: null };
  }

  if (
    user.role === "OPERATOR" &&
    quote.request.organizationId !== user.organizationId
  ) {
    return { error: "Forbidden", status: 403, quote: null };
  }

  return { error: null, status: 200, quote };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { quoteId } = await params;
  const authorized = await getAuthorizedQuote(quoteId, user);

  if (!authorized.quote) {
    return NextResponse.json(
      { error: authorized.error },
      { status: authorized.status }
    );
  }

  return NextResponse.json(authorized.quote);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { quoteId } = await params;
  const authorized = await getAuthorizedQuote(quoteId, user);

  if (!authorized.quote) {
    return NextResponse.json(
      { error: authorized.error },
      { status: authorized.status }
    );
  }

  const quote = authorized.quote;
  if (user.role === "VENDOR") {
    const guard = await ensureVendorIsActiveForMutation(quote.vendorId);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
  }

  const body = await request.json();
  const action = typeof body.action === "string" ? body.action : null;
  const amountProvided = body.amount !== undefined;
  const currencyProvided = body.currency !== undefined;
  const scopeSummaryProvided = body.scopeSummary !== undefined;
  const assumptionsProvided = body.assumptions !== undefined;
  const exclusionsProvided = body.exclusions !== undefined;
  const validUntilProvided = body.validUntil !== undefined;
  const requestPhotoIdsProvided = body.requestPhotoIds !== undefined;
  const jobPhotoIdsProvided = body.jobPhotoIds !== undefined;
  const hasDraftFieldUpdates =
    amountProvided ||
    currencyProvided ||
    scopeSummaryProvided ||
    assumptionsProvided ||
    exclusionsProvided ||
    validUntilProvided ||
    requestPhotoIdsProvided ||
    jobPhotoIdsProvided;

  if (
    user.role !== "ADMIN" &&
    MUTATION_BLOCKED_REQUEST_STATUSES.has(quote.request.status)
  ) {
    return NextResponse.json(
      { error: "Quotes cannot be changed after the request is closed." },
      { status: 409 }
    );
  }

  if (hasDraftFieldUpdates && user.role === "OPERATOR") {
    return NextResponse.json(
      { error: "Operators cannot edit quote contents." },
      { status: 403 }
    );
  }

  if (hasDraftFieldUpdates && action && action !== "submit") {
    return NextResponse.json(
      { error: "Quote contents can only be edited on a draft or draft submission." },
      { status: 400 }
    );
  }

  if (hasDraftFieldUpdates && quote.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft quotes can be edited." },
      { status: 409 }
    );
  }

  const data: Record<string, unknown> = {};

  if (amountProvided) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Quote amount must be a positive number." },
        { status: 400 }
      );
    }

    data.amount = amount;
  }

  if (currencyProvided) {
    if (typeof body.currency !== "string" || !body.currency.trim()) {
      return NextResponse.json(
        { error: "currency must be a non-empty string." },
        { status: 400 }
      );
    }

    data.currency = body.currency.trim().toUpperCase().slice(0, 10);
  }

  if (scopeSummaryProvided) {
    const scopeSummary = parseOptionalText(body.scopeSummary);
    if (!scopeSummary) {
      return NextResponse.json(
        { error: "scopeSummary must be a non-empty string." },
        { status: 400 }
      );
    }

    data.scopeSummary = scopeSummary;
  }

  if (assumptionsProvided) {
    data.assumptions = parseOptionalText(body.assumptions);
  }

  if (exclusionsProvided) {
    data.exclusions = parseOptionalText(body.exclusions);
  }

  if (validUntilProvided) {
    const validUntil = parseOptionalDate(body.validUntil);
    if (validUntil === "invalid") {
      return NextResponse.json(
        { error: "validUntil is invalid." },
        { status: 400 }
      );
    }

    data.validUntil = validUntil ?? null;
  }

  let validatedPhotoLinks:
    | Awaited<ReturnType<typeof validateQuotePhotoSelections>>
    | null = null;
  if (requestPhotoIdsProvided || jobPhotoIdsProvided) {
    try {
      validatedPhotoLinks = await validateQuotePhotoSelections({
        serviceRequestId: quote.request.id,
        jobId: quote.request.job?.id ?? null,
        requestPhotoIds: requestPhotoIdsProvided
          ? parseIdList(body.requestPhotoIds)
          : quote.requestPhotoLinks.map((link) => link.photoId),
        jobPhotoIds: jobPhotoIdsProvided
          ? parseIdList(body.jobPhotoIds)
          : quote.jobPhotoLinks.map((link) => link.photoId),
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "One or more selected quote photos are invalid.",
        },
        { status: 400 }
      );
    }
  }

  if (action === "submit") {
    if (user.role === "OPERATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (quote.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft quotes can be submitted." },
        { status: 409 }
      );
    }

    data.status = "SUBMITTED";
    data.submittedAt = new Date();
  } else if (action === "approve") {
    if (user.role === "VENDOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (quote.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Only submitted quotes can be approved." },
        { status: 409 }
      );
    }

    data.status = "APPROVED";
    data.decidedAt = new Date();
    data.decidedByUserId = user.id;
    data.decisionNote = parseOptionalText(body.decisionNote);
  } else if (action === "reject") {
    if (user.role === "VENDOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (quote.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Only submitted quotes can be rejected." },
        { status: 409 }
      );
    }

    data.status = "REJECTED";
    data.decidedAt = new Date();
    data.decidedByUserId = user.id;
    data.decisionNote = parseOptionalText(body.decisionNote);
  } else if (action === "withdraw") {
    if (user.role === "OPERATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (["APPROVED", "SUPERSEDED", "WITHDRAWN"].includes(quote.status)) {
      return NextResponse.json(
        { error: "This quote can no longer be withdrawn." },
        { status: 409 }
      );
    }

    data.status = "WITHDRAWN";
  } else if (action) {
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  }

  const updatedQuote = await prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id: quote.id },
      data,
    });

    if (validatedPhotoLinks) {
      await tx.quoteRequestPhoto.deleteMany({ where: { quoteId: quote.id } });
      if (validatedPhotoLinks.requestPhotoIds.length > 0) {
        await tx.quoteRequestPhoto.createMany({
          data: validatedPhotoLinks.requestPhotoIds.map((photoId, index) => ({
            quoteId: quote.id,
            photoId,
            sortOrder: index,
          })),
        });
      }

      await tx.quoteJobPhoto.deleteMany({ where: { quoteId: quote.id } });
      if (validatedPhotoLinks.jobPhotoIds.length > 0) {
        await tx.quoteJobPhoto.createMany({
          data: validatedPhotoLinks.jobPhotoIds.map((photoId, index) => ({
            quoteId: quote.id,
            photoId,
            sortOrder: index,
          })),
        });
      }
    }

    return tx.quote.findUnique({
      where: { id: quote.id },
      include: QUOTE_DETAIL_INCLUDE,
    });
  });

  return NextResponse.json(updatedQuote);
}
