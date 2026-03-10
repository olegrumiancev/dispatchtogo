import { prisma } from "@/lib/prisma";

export interface AdminDispatchBoardSearchParams {
  status?: string;
  urgency?: string;
  category?: string;
  org?: string;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  page?: string;
}

export interface AdminDispatchBoardData {
  filters: {
    statusFilter: string;
    urgencyFilter: string;
    categoryFilter: string;
    orgFilter: string;
    searchFilter: string;
    sortBy: string;
    sortDir: "asc" | "desc";
  };
  page: number;
  total: number;
  totalPages: number;
  requests: Array<{
    id: string;
    referenceNumber: string;
    urgency: string;
    category: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    property: { name: string };
    organization: { id: string; name: string };
    job: {
      id: string;
      status: string;
      isPaused: boolean;
      vendor: { companyName: string; phone: string };
    } | null;
  }>;
  organizations: Array<{ id: string; name: string }>;
  disputedRequests: Array<{
    id: string;
    referenceNumber: string;
    urgency: string;
    property: { name: string };
    job: { vendor: { companyName: string } } | null;
  }>;
  vendorsForModal: Array<{
    id: string;
    companyName: string;
    phone: string;
    availabilityStatus: string;
    availabilityNote: string | null;
    skills: Array<{ category: string }>;
  }>;
  extraParams: Record<string, string>;
  queryString: string;
  version: string;
  lastCheckedAt: string;
}

interface NormalizedAdminDispatchBoardParams {
  statusFilter: string;
  urgencyFilter: string;
  categoryFilter: string;
  orgFilter: string;
  searchFilter: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  page: number;
}

const PAGE_SIZE = 25;
const TERMINAL_STATUSES = ["COMPLETED", "VERIFIED", "CANCELLED"];

function normalizeAdminDispatchBoardParams(
  params: AdminDispatchBoardSearchParams
): NormalizedAdminDispatchBoardParams {
  return {
    statusFilter: params.status ?? "",
    urgencyFilter: params.urgency ?? "",
    categoryFilter: params.category ?? "",
    orgFilter: params.org ?? "",
    searchFilter: params.search ?? "",
    sortBy: params.sortBy ?? "createdAt",
    sortDir: params.sortDir === "asc" ? "asc" : "desc",
    page: Math.max(1, parseInt(params.page ?? "1", 10) || 1),
  };
}

function buildDispatchWhere(params: NormalizedAdminDispatchBoardParams) {
  const where: any = {};

  if (params.statusFilter) {
    where.status = params.statusFilter;
  } else {
    where.status = { notIn: TERMINAL_STATUSES };
  }
  if (params.urgencyFilter) where.urgency = params.urgencyFilter;
  if (params.categoryFilter) where.category = params.categoryFilter;
  if (params.orgFilter) where.organizationId = params.orgFilter;
  if (params.searchFilter) {
    where.OR = [
      { referenceNumber: { contains: params.searchFilter, mode: "insensitive" } },
      { description: { contains: params.searchFilter, mode: "insensitive" } },
      { property: { name: { contains: params.searchFilter, mode: "insensitive" } } },
    ];
  }

  return where;
}

function buildDispatchQueryString(params: NormalizedAdminDispatchBoardParams) {
  const query = new URLSearchParams();

  if (params.statusFilter) query.set("status", params.statusFilter);
  if (params.urgencyFilter) query.set("urgency", params.urgencyFilter);
  if (params.categoryFilter) query.set("category", params.categoryFilter);
  if (params.orgFilter) query.set("org", params.orgFilter);
  if (params.searchFilter) query.set("search", params.searchFilter);
  if (params.sortBy !== "createdAt") query.set("sortBy", params.sortBy);
  if (params.sortDir !== "desc") query.set("sortDir", params.sortDir);
  if (params.page !== 1) query.set("page", String(params.page));

  return query.toString();
}

function buildDispatchExtraParams(params: NormalizedAdminDispatchBoardParams) {
  const extraParams: Record<string, string> = {};

  if (params.statusFilter) extraParams.status = params.statusFilter;
  if (params.urgencyFilter) extraParams.urgency = params.urgencyFilter;
  if (params.categoryFilter) extraParams.category = params.categoryFilter;
  if (params.orgFilter) extraParams.org = params.orgFilter;
  if (params.searchFilter) extraParams.search = params.searchFilter;
  if (params.sortBy !== "createdAt") extraParams.sortBy = params.sortBy;
  if (params.sortDir !== "desc") extraParams.sortDir = params.sortDir;

  return extraParams;
}

async function getAdminDispatchBoardVersionParts(params: NormalizedAdminDispatchBoardParams) {
  const where = buildDispatchWhere(params);
  const needsDispatchWhere: any = {
    AND: [where, { OR: [{ job: null }, { job: { status: "DECLINED" } }] }],
  };

  const [total, ndTotal, latestRequest, latestJob, disputedCount, latestDisputed] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.count({ where: needsDispatchWhere }),
    prisma.serviceRequest.findFirst({
      where,
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.job.findFirst({
      where: { serviceRequest: where },
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.serviceRequest.count({ where: { status: "DISPUTED" } }),
    prisma.serviceRequest.findFirst({
      where: { status: "DISPUTED" },
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    total,
    ndTotal,
    latestRequestUpdatedAt: latestRequest?.updatedAt?.toISOString() ?? "none",
    latestJobUpdatedAt: latestJob?.updatedAt?.toISOString() ?? "none",
    disputedCount,
    latestDisputedUpdatedAt: latestDisputed?.updatedAt?.toISOString() ?? "none",
  };
}

export async function getAdminDispatchBoardVersion(params: AdminDispatchBoardSearchParams) {
  const normalized = normalizeAdminDispatchBoardParams(params);
  const parts = await getAdminDispatchBoardVersionParts(normalized);

  return {
    version: [
      parts.total,
      parts.ndTotal,
      parts.latestRequestUpdatedAt,
      parts.latestJobUpdatedAt,
      parts.disputedCount,
      parts.latestDisputedUpdatedAt,
    ].join(":"),
    lastCheckedAt: new Date().toISOString(),
  };
}

export async function getAdminDispatchBoardData(
  params: AdminDispatchBoardSearchParams
): Promise<AdminDispatchBoardData> {
  const normalized = normalizeAdminDispatchBoardParams(params);
  const where = buildDispatchWhere(normalized);
  const skip = (normalized.page - 1) * PAGE_SIZE;

  const orderByMap: Record<string, any> = {
    referenceNumber: { referenceNumber: normalized.sortDir },
    org: { organization: { name: normalized.sortDir } },
    property: { property: { name: normalized.sortDir } },
    category: { category: normalized.sortDir },
    urgency: { urgency: normalized.sortDir },
    status: { status: normalized.sortDir },
    createdAt: { createdAt: normalized.sortDir },
  };
  const orderBy = orderByMap[normalized.sortBy] ?? { createdAt: "desc" };

  const needsDispatchWhere: any = {
    AND: [where, { OR: [{ job: null }, { job: { status: "DECLINED" } }] }],
  };
  const hasJobWhere: any = {
    AND: [where, { NOT: { OR: [{ job: null }, { job: { status: "DECLINED" } }] } }],
  };

  const reqInclude = {
    property: { select: { name: true } },
    organization: { select: { id: true, name: true } },
    job: {
      select: {
        id: true,
        status: true,
        isPaused: true,
        vendor: { select: { companyName: true, phone: true } },
      },
    },
  };

  const [
    total,
    ndTotal,
    organizations,
    disputedRequests,
    availableVendors,
    versionMeta,
  ] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.count({ where: needsDispatchWhere }),
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceRequest.findMany({
      where: { status: "DISPUTED" },
      select: {
        id: true,
        referenceNumber: true,
        urgency: true,
        property: { select: { name: true } },
        job: { select: { vendor: { select: { companyName: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.vendor.findMany({
      where: { status: "ACTIVE" },
      include: { skills: { select: { category: true } } },
      orderBy: { companyName: "asc" },
    }),
    getAdminDispatchBoardVersionParts(normalized),
  ]);

  const ndTake = Math.max(0, Math.min(ndTotal - skip, PAGE_SIZE));
  const ajTake = PAGE_SIZE - ndTake;
  const ajSkip = Math.max(0, skip - ndTotal);

  const [ndRequests, ajRequests] = await Promise.all([
    ndTake > 0
      ? prisma.serviceRequest.findMany({ where: needsDispatchWhere, skip, take: ndTake, orderBy, include: reqInclude })
      : Promise.resolve([] as any[]),
    ajTake > 0
      ? prisma.serviceRequest.findMany({ where: hasJobWhere, skip: ajSkip, take: ajTake, orderBy, include: reqInclude })
      : Promise.resolve([] as any[]),
  ]);

  return {
    filters: {
      statusFilter: normalized.statusFilter,
      urgencyFilter: normalized.urgencyFilter,
      categoryFilter: normalized.categoryFilter,
      orgFilter: normalized.orgFilter,
      searchFilter: normalized.searchFilter,
      sortBy: normalized.sortBy,
      sortDir: normalized.sortDir,
    },
    page: normalized.page,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
    requests: [...ndRequests, ...ajRequests].map((request) => ({
      id: request.id,
      referenceNumber: request.referenceNumber,
      urgency: request.urgency,
      category: request.category,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      property: { name: request.property.name },
      organization: {
        id: request.organization.id,
        name: request.organization.name,
      },
      job: request.job
        ? {
            id: request.job.id,
            status: request.job.status,
            isPaused: request.job.isPaused,
            vendor: {
              companyName: request.job.vendor.companyName,
              phone: request.job.vendor.phone,
            },
          }
        : null,
    })),
    organizations,
    disputedRequests,
    vendorsForModal: availableVendors.map((vendor) => ({
      id: vendor.id,
      companyName: vendor.companyName,
      phone: vendor.phone,
      availabilityStatus: vendor.availabilityStatus,
      availabilityNote: vendor.availabilityNote,
      skills: vendor.skills.map((skill) => ({ category: skill.category })),
    })),
    extraParams: buildDispatchExtraParams(normalized),
    queryString: buildDispatchQueryString(normalized),
    version: [
      versionMeta.total,
      versionMeta.ndTotal,
      versionMeta.latestRequestUpdatedAt,
      versionMeta.latestJobUpdatedAt,
      versionMeta.disputedCount,
      versionMeta.latestDisputedUpdatedAt,
    ].join(":"),
    lastCheckedAt: new Date().toISOString(),
  };
}
