"use client";

import Link from "next/link";
import { Archive, BadgeCheck, CheckCircle2 } from "lucide-react";
import { useRequestsViewNavigation } from "@/components/operator/requests-view-swipe-shell";

export type RequestsView = "active" | "completed" | "cancelled";

interface RequestsViewToggleProps {
  view: RequestsView;
  links: Record<RequestsView, string>;
}

const VIEW_ITEMS = [
  { key: "active", label: "Active", icon: CheckCircle2 },
  { key: "completed", label: "Completed", icon: BadgeCheck },
  { key: "cancelled", label: "Cancelled", icon: Archive },
] as const satisfies ReadonlyArray<{
  key: RequestsView;
  label: string;
  icon: typeof CheckCircle2;
}>;

export function RequestsViewToggle({
  view,
  links,
}: RequestsViewToggleProps) {
  const navigation = useRequestsViewNavigation();

  return (
    <div className="flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
      {VIEW_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = view === item.key;

        return (
          <Link
            key={item.key}
            href={links[item.key]}
            onClick={(event) => {
              if (!navigation) return;
              event.preventDefault();
              navigation.navigate(item.key);
            }}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            } ${navigation?.isNavigating ? "opacity-80" : ""}`}
            aria-busy={navigation?.isNavigating || undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
