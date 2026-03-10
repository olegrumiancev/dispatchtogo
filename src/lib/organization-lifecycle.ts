import { prisma } from "@/lib/prisma";

export const ORGANIZATION_STATUSES = [
  { value: "ACTIVE", label: "Active", color: "bg-emerald-100 text-emerald-800" },
  { value: "SUSPENDED", label: "Suspended", color: "bg-amber-100 text-amber-800" },
  { value: "OFFBOARDED", label: "Offboarded", color: "bg-gray-200 text-gray-700" },
] as const;

export type OrganizationStatus =
  (typeof ORGANIZATION_STATUSES)[number]["value"];

export const ORG_PRE_DISPATCH_STATUSES = [
  "SUBMITTED",
  "TRIAGING",
  "NEEDS_CLARIFICATION",
  "READY_TO_DISPATCH",
] as const;

export function isOrganizationActive(status: string | null | undefined) {
  return status === "ACTIVE";
}

export function getOrganizationStatusMeta(status: string) {
  return (
    ORGANIZATION_STATUSES.find((item) => item.value === status) ?? {
      value: status,
      label: status,
      color: "bg-gray-100 text-gray-700",
    }
  );
}

export function getInactiveOrganizationMessage(status: string, name?: string | null) {
  const orgName = name ? ` for ${name}` : "";
  if (status === "SUSPENDED") {
    return `This organization${orgName} is suspended and cannot make operational changes.`;
  }
  if (status === "OFFBOARDED") {
    return `This organization${orgName} has been offboarded and is read-only.`;
  }
  return `This organization${orgName} is not active.`;
}

export async function getOrganizationLifecycle(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      status: true,
      statusReason: true,
      suspendedAt: true,
      offboardedAt: true,
    },
  });
}

export async function ensureOrganizationIsActiveForMutation(orgId: string) {
  const org = await getOrganizationLifecycle(orgId);

  if (!org) {
    return {
      ok: false as const,
      status: 404,
      error: "Organization not found",
    };
  }

  if (!isOrganizationActive(org.status)) {
    return {
      ok: false as const,
      status: 409,
      error: getInactiveOrganizationMessage(org.status, org.name),
      organization: org,
    };
  }

  return {
    ok: true as const,
    organization: org,
  };
}
