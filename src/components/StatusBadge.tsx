import * as React from "react";

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-gray-100 text-gray-800",
  TRIAGED: "bg-blue-100 text-blue-800",
  DISPATCHED: "bg-indigo-100 text-indigo-800",
  ACCEPTED: "bg-cyan-100 text-cyan-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  VERIFIED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  DECLINED: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  TRIAGED: "Triaged",
  DISPATCHED: "Dispatched",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  VERIFIED: "Verified",
  CANCELLED: "Cancelled",
  DECLINED: "Declined",
};

export default function StatusBadge({ status }: { status: string }) {
  const colors = statusStyles[status] ?? "bg-gray-100 text-gray-800";
  const label = statusLabels[status] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${colors}`}
    >
      {label}
    </span>
  );
}
