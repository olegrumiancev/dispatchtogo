"use client";

import Link from "next/link";
import { BadgeCheck, ClipboardList, Hammer } from "lucide-react";
import { useVendorJobsViewNavigation } from "@/components/vendor/jobs-view-swipe-shell";

export type VendorJobsView = "available" | "mine" | "completed";

interface VendorJobsViewToggleProps {
  view: VendorJobsView;
  links: Record<VendorJobsView, string>;
  counts: Record<VendorJobsView, number>;
}

const VIEW_ITEMS = [
  { key: "available", label: "Available", icon: ClipboardList },
  { key: "mine", label: "My Jobs", icon: Hammer },
  { key: "completed", label: "Done", icon: BadgeCheck },
] as const satisfies ReadonlyArray<{
  key: VendorJobsView;
  label: string;
  icon: typeof ClipboardList;
}>;

export function VendorJobsViewToggle({
  view,
  links,
  counts,
}: VendorJobsViewToggleProps) {
  const navigation = useVendorJobsViewNavigation();

  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
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
            className={`inline-flex min-h-[40px] items-center gap-[5px] rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3.5 ${
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            } ${navigation?.isNavigating ? "opacity-80" : ""}`}
            aria-busy={navigation?.isNavigating || undefined}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                active
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white text-gray-600"
              }`}
            >
              {counts[item.key]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
