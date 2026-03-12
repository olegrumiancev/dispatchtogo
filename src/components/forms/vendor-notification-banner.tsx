"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Briefcase,
  CheckCircle2,
} from "lucide-react";

interface VendorNotifMetadata {
  referenceNumber?: string;
  propertyName?: string;
  category?: string;
  categoryLabel?: string;
  rejectionType?: string;
}

export interface VendorNotif {
  id: string;
  title: string;
  body: string;
  type: string;
  link?: string | null;
  metadata?: VendorNotifMetadata | null;
  createdAt: string;
}

interface VendorNotificationBannerProps {
  notifications: VendorNotif[];
}

type NotificationKind =
  | "dispatch"
  | "send_back"
  | "redispatch"
  | "dispute"
  | "verified"
  | "cancelled"
  | "other";

function classifyNotification(notification: VendorNotif): NotificationKind {
  if (notification.type === "JOB_DISPATCHED") return "dispatch";
  if (notification.type === "WORK_VERIFIED") return "verified";
  if (notification.type === "REQUEST_CANCELLED") return "cancelled";

  if (notification.type === "WORK_REJECTED") {
    if (notification.metadata?.rejectionType === "send_back") return "send_back";
    if (notification.metadata?.rejectionType === "redispatch") return "redispatch";
    if (notification.metadata?.rejectionType === "dispute") return "dispute";
  }

  const title = notification.title.toLowerCase();
  if (title.includes("rework")) return "send_back";
  if (title.includes("removed")) return "redispatch";
  if (title.includes("escalated")) return "dispute";
  return "other";
}

const TYPE_CONFIG = {
  dispatch: {
    bg: "bg-blue-50 border-blue-300",
    icon: Briefcase,
    iconColor: "text-blue-600",
    titleColor: "text-blue-800",
    bodyColor: "text-blue-700",
    actionColor: "text-blue-800 hover:text-blue-900",
  },
  send_back: {
    bg: "bg-amber-50 border-amber-300",
    icon: RotateCcw,
    iconColor: "text-amber-600",
    titleColor: "text-amber-800",
    bodyColor: "text-amber-700",
    actionColor: "text-amber-800 hover:text-amber-900",
  },
  redispatch: {
    bg: "bg-red-50 border-red-300",
    icon: AlertTriangle,
    iconColor: "text-red-600",
    titleColor: "text-red-800",
    bodyColor: "text-red-700",
    actionColor: "text-red-800 hover:text-red-900",
  },
  dispute: {
    bg: "bg-purple-50 border-purple-300",
    icon: ShieldAlert,
    iconColor: "text-purple-600",
    titleColor: "text-purple-800",
    bodyColor: "text-purple-700",
    actionColor: "text-purple-800 hover:text-purple-900",
  },
  verified: {
    bg: "bg-emerald-50 border-emerald-300",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    titleColor: "text-emerald-800",
    bodyColor: "text-emerald-700",
    actionColor: "text-emerald-800 hover:text-emerald-900",
  },
  cancelled: {
    bg: "bg-slate-50 border-slate-300",
    icon: AlertTriangle,
    iconColor: "text-slate-600",
    titleColor: "text-slate-800",
    bodyColor: "text-slate-700",
    actionColor: "text-slate-800 hover:text-slate-900",
  },
  other: {
    bg: "bg-blue-50 border-blue-300",
    icon: AlertTriangle,
    iconColor: "text-blue-600",
    titleColor: "text-blue-800",
    bodyColor: "text-blue-700",
    actionColor: "text-blue-800 hover:text-blue-900",
  },
} as const;

function getDispatchSummaryLine(notification: VendorNotif) {
  const parts = [
    notification.metadata?.referenceNumber,
    notification.metadata?.propertyName,
    notification.metadata?.categoryLabel ?? notification.metadata?.category,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  const trimmedTitle = notification.title
    .replace(/^New job (dispatched|waiting)\s*[–-]\s*/i, "")
    .trim();
  const trimmedBody = notification.body
    .replace(/^A new job at\s*/i, "")
    .replace(/\s*has been dispatched to you.*$/i, "")
    .replace(/\s*Review and accept or pass\.\s*$/i, "")
    .trim();

  if (trimmedTitle && trimmedTitle !== notification.title && trimmedBody) {
    return `${trimmedTitle} | ${trimmedBody}`;
  }

  return trimmedBody || trimmedTitle || "Review and accept or pass.";
}

function getNotificationActionLabel(notification: VendorNotif) {
  return notification.type === "REQUEST_CANCELLED" ? "View jobs" : "Open job";
}

export function VendorNotificationBanner({
  notifications,
}: VendorNotificationBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = notifications.filter((notification) => !dismissed.has(notification.id));
  const dispatchNotifications = visible.filter(
    (notification) => notification.type === "JOB_DISPATCHED"
  );
  const detailNotifications = visible.filter(
    (notification) => notification.type !== "JOB_DISPATCHED"
  );

  if (visible.length === 0) return null;

  async function markRead(ids: string[]) {
    setDismissed((current) => new Set([...current, ...ids]));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids.length === 1 ? { id: ids[0] } : { ids }),
    });
  }

  async function dismiss(id: string) {
    await markRead([id]);
  }

  async function dismissAll() {
    await markRead(visible.map((notification) => notification.id));
    router.refresh();
  }

  async function openNotification(notification: VendorNotif) {
    await markRead([notification.id]);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  async function reviewDispatches() {
    await markRead(dispatchNotifications.map((notification) => notification.id));
    const target =
      dispatchNotifications.length === 1 && dispatchNotifications[0].link
        ? dispatchNotifications[0].link
        : "/app/vendor/jobs?tab=available#available-jobs";
    router.push(target);
  }

  return (
    <div className="space-y-2">
      {dispatchNotifications.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
          <div className="flex items-start gap-3">
            <Briefcase className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-blue-900">
                {dispatchNotifications.length === 1
                  ? "New job waiting"
                  : `${dispatchNotifications.length} new jobs waiting`}
              </p>
              <p className="mt-0.5 text-xs text-blue-700">
                {dispatchNotifications.length === 1
                  ? getDispatchSummaryLine(dispatchNotifications[0])
                  : "Review the new dispatches below and accept or pass."}
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={reviewDispatches}
                  className="inline-flex min-h-[34px] items-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-200 transition-colors hover:bg-blue-100"
                >
                  {dispatchNotifications.length === 1 ? "Open job" : "Review jobs"}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                markRead(dispatchNotifications.map((notification) => notification.id))
              }
              aria-label="Dismiss dispatch notifications"
              className="flex-shrink-0 p-0.5 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {detailNotifications.map((notification) => {
        const kind = classifyNotification(notification);
        const cfg = TYPE_CONFIG[kind];
        const Icon = cfg.icon;

        return (
          <div
            key={notification.id}
            className={`rounded-xl border px-4 py-3 shadow-sm ${cfg.bg}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${cfg.iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${cfg.titleColor}`}>
                  {notification.title}
                </p>
                <p className={`mt-0.5 text-xs ${cfg.bodyColor}`}>{notification.body}</p>
                {notification.link && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={`text-xs font-semibold underline underline-offset-2 ${cfg.actionColor}`}
                    >
                      {getNotificationActionLabel(notification)}
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(notification.id)}
                aria-label="Dismiss notification"
                className="flex-shrink-0 p-0.5 text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      {(detailNotifications.length > 1 ||
        (detailNotifications.length > 0 && dispatchNotifications.length > 0)) && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={dismissAll}
            className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
          >
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
