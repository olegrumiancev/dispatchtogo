"use client";

import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

interface HeaderProps {
  pageTitle?: string;
  userName?: string | null;
  userRole?: "OPERATOR" | "VENDOR" | "ADMIN";
  className?: string;
  onMenuClick?: () => void;
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

export function Header({
  pageTitle,
  userName,
  userRole,
  className,
  onMenuClick,
}: HeaderProps) {
  const homeHref =
    userRole === "OPERATOR"
      ? "/app/operator"
      : userRole === "VENDOR"
        ? "/app/vendor/jobs"
        : userRole === "ADMIN"
          ? "/app/admin"
          : "/app";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 relative flex h-16 items-center justify-between border-b border-brand-mist bg-white/90 px-4 backdrop-blur-sm md:px-6",
        className
      )}
    >
      <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white shadow-lg md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {pageTitle && (
          <h1 className="hidden truncate text-lg font-semibold text-brand-ink md:block">
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
        <BrandLogo href={homeHref} size="sm" hideWordmarkOnMobile />
      </div>

      {/* Right: User info */}
      <div className="relative z-10 flex items-center gap-3">
        {userRole && (
          <Badge
            variant={roleBadgeColors[userRole] || "bg-gray-100 text-gray-800"}
            className="hidden sm:inline-flex"
          >
            {roleLabels[userRole] || userRole}
          </Badge>
        )}
        {userName && (
          <span className="max-w-[110px] truncate text-sm font-medium text-slate-700 md:max-w-[140px]">
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
