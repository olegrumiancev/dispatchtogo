"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, RotateCcw, ShieldAlert } from "lucide-react";

export interface VendorNotif {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface VendorNotificationBannerProps {
  notifications: VendorNotif[];
}

function classifyTitle(title: string): "send_back" | "redispatch" | "dispute" | "other" {
  if (title.includes("rework")) return "send_back";
  if (title.includes("removed")) return "redispatch";
  if (title.includes("escalated")) return "dispute";
  return "other";
}

const TYPE_CONFIG = {
  send_back: {
    bg: "bg-amber-50 border-amber-300",
    icon: RotateCcw,
    iconColor: "text-amber-600",
    titleColor: "text-amber-800",
    bodyColor: "text-amber-700",
  },
  redispatch: {
    bg: "bg-red-50 border-red-300",
    icon: AlertTriangle,
    iconColor: "text-red-600",
    titleColor: "text-red-800",
    bodyColor: "text-red-700",
  },
  dispute: {
    bg: "bg-purple-50 border-purple-300",
    icon: ShieldAlert,
    iconColor: "text-purple-600",
    titleColor: "text-purple-800",
    bodyColor: "text-purple-700",
  },
  other: {
    bg: "bg-blue-50 border-blue-300",
    icon: AlertTriangle,
    iconColor: "text-blue-600",
    titleColor: "text-blue-800",
    bodyColor: "text-blue-700",
  },
};

export function VendorNotificationBanner({ notifications }: VendorNotificationBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  if (visible.length === 0) return null;

  async function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function dismissAll() {
    setDismissed(new Set(notifications.map((n) => n.id)));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {visible.map((n) => {
        const type = classifyTitle(n.title);
        const cfg = TYPE_CONFIG[type];
        const Icon = cfg.icon;
        return (
          <div
            key={n.id}
            className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 ${cfg.bg}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${cfg.titleColor}`}>{n.title}</p>
              <p className={`text-xs mt-0.5 ${cfg.bodyColor}`}>{n.body}</p>
            </div>
            <button
              onClick={() => dismiss(n.id)}
              aria-label="Dismiss notification"
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      {visible.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={dismissAll}
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
