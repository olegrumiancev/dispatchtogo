"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HeaderProps {
  pageTitle?: string;
  userName?: string | null;
  userRole?: "OPERATOR" | "VENDOR" | "ADMIN";
  className?: string;
}

const roleBadgeColors: Record<string, string> = {
  OPERATOR: "bg-brand-mist text-brand-primary",
  VENDOR: "bg-emerald-100 text-emerald-800",
  ADMIN: "bg-rose-100 text-rose-700",
};

const roleLabels: Record<string, string> = {
  OPERATOR: "Operator",
  VENDOR: "Vendor",
  ADMIN: "Admin",
};

export function Header({ pageTitle, userName, userRole, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b border-brand-mist bg-white/90 px-4 backdrop-blur-sm md:px-6",
        className
      )}
    >
      {/* Left: Title (leave space for mobile hamburger) */}
      <div className="ml-12 md:ml-0">
        {pageTitle && (
          <h1 className="truncate text-lg font-semibold text-brand-ink">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right: User info */}
      <div className="flex items-center gap-3">
        {userRole && (
          <Badge
            variant={roleBadgeColors[userRole] || "bg-gray-100 text-gray-800"}
            className="hidden sm:inline-flex"
          >
            {roleLabels[userRole] || userRole}
          </Badge>
        )}
        {userName && (
          <span className="max-w-[140px] truncate text-sm font-medium text-slate-700">
            {userName}
          </span>
        )}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white shadow-sm">
          {userName?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
