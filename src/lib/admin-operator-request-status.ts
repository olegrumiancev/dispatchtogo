import { REQUEST_STATUSES } from "@/lib/constants";

const ADMIN_OPERATOR_STATUS_OVERRIDES: Record<string, { label: string; color: string }> = {
  DISPATCHED: {
    label: "Offered",
    color: "bg-blue-100 text-blue-800",
  },
  ACCEPTED: {
    label: "Dispatched",
    color: "bg-indigo-100 text-indigo-800",
  },
};

export function getAdminOperatorRequestStatusMeta(status: string) {
  const base = REQUEST_STATUSES.find((item) => item.value === status);
  const override = ADMIN_OPERATOR_STATUS_OVERRIDES[status];

  return {
    label: override?.label ?? base?.label ?? status,
    color: override?.color ?? base?.color ?? "bg-gray-100 text-gray-800",
  };
}

export function getAdminOperatorRequestStatusLabel(status: string) {
  return getAdminOperatorRequestStatusMeta(status).label;
}

export function getAdminOperatorRequestStatusColor(status: string) {
  return getAdminOperatorRequestStatusMeta(status).color;
}
