import { prisma } from "@/lib/prisma";

export const VENDOR_STATUSES = [
  { value: "ACTIVE", label: "Active", color: "bg-emerald-100 text-emerald-800" },
  { value: "SUSPENDED", label: "Suspended", color: "bg-amber-100 text-amber-800" },
  { value: "OFFBOARDED", label: "Offboarded", color: "bg-gray-200 text-gray-700" },
] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number]["value"];

export const VENDOR_RELEASEABLE_JOB_STATUSES = ["OFFERED"] as const;
export const VENDOR_ACTIVE_WORK_JOB_STATUSES = ["ACCEPTED", "IN_PROGRESS", "PAUSED"] as const;

export function isVendorActive(status: string | null | undefined) {
  return status === "ACTIVE";
}

export function getVendorStatusMeta(status: string) {
  return (
    VENDOR_STATUSES.find((item) => item.value === status) ?? {
      value: status,
      label: status,
      color: "bg-gray-100 text-gray-700",
    }
  );
}

export function getInactiveVendorMessage(status: string, name?: string | null) {
  const vendorName = name ? ` for ${name}` : "";
  if (status === "SUSPENDED") {
    return `This vendor${vendorName} is suspended and cannot take operational actions.`;
  }
  if (status === "OFFBOARDED") {
    return `This vendor${vendorName} has been offboarded and is read-only.`;
  }
  return `This vendor${vendorName} is not active.`;
}

export async function getVendorLifecycle(vendorId: string) {
  return prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      companyName: true,
      status: true,
      statusReason: true,
      suspendedAt: true,
      offboardedAt: true,
    },
  });
}

export async function ensureVendorIsActiveForMutation(vendorId: string) {
  const vendor = await getVendorLifecycle(vendorId);

  if (!vendor) {
    return {
      ok: false as const,
      status: 404,
      error: "Vendor not found",
    };
  }

  if (!isVendorActive(vendor.status)) {
    return {
      ok: false as const,
      status: 409,
      error: getInactiveVendorMessage(vendor.status, vendor.companyName),
      vendor,
    };
  }

  return {
    ok: true as const,
    vendor,
  };
}
