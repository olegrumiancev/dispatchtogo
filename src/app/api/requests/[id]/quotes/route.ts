import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateQuotePhotoSelections } from "@/lib/quote-photo-links";
import {
  QUOTE_SOURCES,
  QUOTE_STATUSES,
  isQuoteSource,
  isQuoteStatus,
} from "@/lib/quotes";
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;
  const where: Record<string, unknown> = { id };

  if (user.role === "OPERATOR") {
    if (!user.organizationId) {
      return NextResponse.json(
        { error: "No organization linked to user" },
        { status: 400 }
      );
    }

    where.organizationId = user.organizationId;
  } else if (user.role === "VENDOR") {
    if (!user.vendorId) {
      return NextResponse.json(
        { error: "No vendor linked to user" },
        { status: 400 }
      );
    }

    where.job = { is: { vendorId: user.vendorId } };
  }

  const serviceRequest = await prisma.serviceRequest.findFirst({
    where,
    select: {
      id: true,
      quotePolicy: true,
      status: true,
      job: {
        select: {
          id: true,
          vendorId: true,
          quoteDisposition: true,
        },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        include: QUOTE_DETAIL_INCLUDE,
      },
    },
  });

  if (!serviceRequest) {
    return NextResponse.json(
      { error: "Service request not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    quotePolicy: serviceRequest.quotePolicy,
    requestStatus: serviceRequest.status,
    quoteDisposition: serviceRequest.job?.quoteDisposition ?? null,
    quotes: serviceRequest.quotes,
    allowedStatuses: QUOTE_STATUSES,
    allowedSources: QUOTE_SOURCES,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  if (user.role === "OPERATOR") {
    return NextResponse.json(
      { error: "Forbidden: operators cannot create vendor quotes." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const requestWhere: Record<string, unknown> = { id };

  if (user.role === "VENDOR") {
    if (!user.vendorId) {
      return NextResponse.json(
        { error: "No vendor linked to user" },
        { status: 400 }
      );
    }

    const guard = await ensureVendorIsActiveForMutation(user.vendorId);
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    requestWhere.job = { is: { vendorId: user.vendorId } };
  }

  const serviceRequest = await prisma.serviceRequest.findFirst({
    where: requestWhere,
    select: {
      id: true,
      title: true,
      status: true,
      organizationId: true,
      property: {
        select: {
          name: true,
          address: true,
        },
      },
      job: {
        select: {
          id: true,
          vendorId: true,
        },
      },
    },
  });

  if (!serviceRequest) {
    return NextResponse.json(
      { error: "Service request not found" },
      { status: 404 }
    );
  }

  if (
    user.role !== "ADMIN" &&
    MUTATION_BLOCKED_REQUEST_STATUSES.has(serviceRequest.status)
  ) {
    return NextResponse.json(
      { error: "Quotes cannot be created after the request is closed." },
      { status: 409 }
    );
  }

  const requestedStatus =
    typeof body.status === "string" ? body.status.toUpperCase() : "DRAFT";
  if (!isQuoteStatus(requestedStatus) || !["DRAFT", "SUBMITTED"].includes(requestedStatus)) {
    return NextResponse.json(
      { error: "Quotes can only be created as DRAFT or SUBMITTED." },
      { status: 400 }
    );
  }

  const requestedSource =
    typeof body.source === "string" ? body.source.toUpperCase() : "REMOTE";
  if (!isQuoteSource(requestedSource)) {
    return NextResponse.json({ error: "Invalid quote source." }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "Quote amount must be a positive number." },
      { status: 400 }
    );
  }

  const scopeSummary = parseOptionalText(body.scopeSummary);
  if (!scopeSummary) {
    return NextResponse.json(
      { error: "scopeSummary is required." },
      { status: 400 }
    );
  }

  const validUntil = parseOptionalDate(body.validUntil);
  if (validUntil === "invalid") {
    return NextResponse.json({ error: "validUntil is invalid." }, { status: 400 });
  }

  const requestPhotoIds = parseIdList(body.requestPhotoIds);
  const jobPhotoIds = parseIdList(body.jobPhotoIds);

  let validatedPhotoLinks: Awaited<
    ReturnType<typeof validateQuotePhotoSelections>
  >;
  try {
    validatedPhotoLinks = await validateQuotePhotoSelections({
      serviceRequestId: serviceRequest.id,
      jobId: serviceRequest.job?.id ?? null,
      requestPhotoIds,
      jobPhotoIds,
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

  const vendorId =
    user.role === "VENDOR"
      ? user.vendorId
      : typeof body.vendorId === "string" && body.vendorId.trim()
        ? body.vendorId.trim()
        : serviceRequest.job?.vendorId ?? null;

  if (!vendorId) {
    return NextResponse.json(
      { error: "A vendor must be associated with the quote." },
      { status: 400 }
    );
  }

  if (
    serviceRequest.job?.vendorId &&
    serviceRequest.job.vendorId !== vendorId
  ) {
    return NextResponse.json(
      { error: "Quotes can only be created for the currently assigned vendor." },
      { status: 409 }
    );
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      companyName: true,
    },
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const supersedesQuoteId =
    typeof body.supersedesQuoteId === "string" && body.supersedesQuoteId.trim()
      ? body.supersedesQuoteId.trim()
      : null;

  if (supersedesQuoteId) {
    const supersededQuote = await prisma.quote.findFirst({
      where: {
        id: supersedesQuoteId,
        serviceRequestId: serviceRequest.id,
        vendorId,
      },
      select: { id: true },
    });

    if (!supersededQuote) {
      return NextResponse.json(
        { error: "supersedesQuoteId is invalid for this request/vendor." },
        { status: 404 }
      );
    }
  }

  const assumptions = parseOptionalText(body.assumptions);
  const exclusions = parseOptionalText(body.exclusions);
  const currency =
    typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().toUpperCase().slice(0, 10)
      : "CAD";
  const submittedAt = requestedStatus === "SUBMITTED" ? new Date() : null;

  const createdQuote = await prisma.$transaction(async (tx) => {
    if (supersedesQuoteId) {
      await tx.quote.update({
        where: { id: supersedesQuoteId },
        data: { status: "SUPERSEDED" },
      });
    }

    return tx.quote.create({
      data: {
        serviceRequestId: serviceRequest.id,
        vendorId: vendor.id,
        createdByUserId: user.id,
        status: requestedStatus,
        source: requestedSource,
        supersedesQuoteId,
        amount,
        currency,
        scopeSummary,
        assumptions,
        exclusions,
        validUntil: validUntil ?? null,
        submittedAt,
        requestTitleSnapshot: serviceRequest.title || null,
        propertyNameSnapshot: serviceRequest.property.name,
        propertyAddressSnapshot: serviceRequest.property.address,
        vendorNameSnapshot: vendor.companyName,
        requestPhotoLinks: {
          create: validatedPhotoLinks.requestPhotoIds.map((photoId, index) => ({
            photoId,
            sortOrder: index,
          })),
        },
        jobPhotoLinks: {
          create: validatedPhotoLinks.jobPhotoIds.map((photoId, index) => ({
            photoId,
            sortOrder: index,
          })),
        },
      },
      include: QUOTE_DETAIL_INCLUDE,
    });
  });

  return NextResponse.json(createdQuote, { status: 201 });
}
