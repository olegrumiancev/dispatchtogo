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
  OPERATOR: "bg-blue-100 text-blue-800",
  VENDOR: "bg-emerald-100 text-emerald-800",
  ADMIN: "bg-purple-100 text-purple-800",
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
        "h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6",
        className
      )}
    >
      {/* Left: Title (leave space for mobile hamburger) */}
      <div className="ml-12 md:ml-0">
        {pageTitle && (
          <h1 className="text-lg font-semibold text-gray-900 truncate">
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
          <span className="text-sm text-gray-700 font-medium truncate max-w-[140px]">
            {userName}
          </span>
        )}
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {userName?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
