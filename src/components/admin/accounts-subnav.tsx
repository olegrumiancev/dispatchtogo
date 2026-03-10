"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building, UserCog, Users } from "lucide-react";

const ACCOUNT_NAV_ITEMS = [
  { href: "/app/admin/accounts", label: "Overview", icon: UserCog },
  { href: "/app/admin/organizations", label: "Organizations", icon: Building },
  { href: "/app/admin/vendors", label: "Vendors", icon: Users },
  { href: "/app/admin/users", label: "Users", icon: UserCog },
];

export function AdminAccountsSubnav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/app/admin/accounts") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
      {ACCOUNT_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:bg-white hover:text-gray-800"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
