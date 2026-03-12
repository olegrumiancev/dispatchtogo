"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, Menu, UserCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface HeaderProps {
  pageTitle?: string;
  userName?: string | null;
  userEmail?: string | null;
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
  userEmail,
  userRole,
  className,
  onMenuClick,
}: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const homeHref =
    userRole === "OPERATOR"
      ? "/app/operator"
      : userRole === "VENDOR"
        ? "/app/vendor/jobs"
        : userRole === "ADMIN"
          ? "/app/admin"
          : "/app";
  const accountHref =
    userRole === "OPERATOR"
      ? "/app/operator/account"
      : userRole === "VENDOR"
        ? "/app/vendor/account"
        : userRole === "ADMIN"
          ? "/app/admin/account"
          : "/app";
  const displayName = useMemo(
    () => userName?.trim() || userEmail?.trim() || "User",
    [userEmail, userName]
  );
  const showSecondaryLine = Boolean(
    userEmail?.trim() && userEmail.trim() !== displayName
  );
  const userInitial = displayName.charAt(0).toUpperCase() || "U";

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (userMenuRef.current?.contains(event.target as Node)) return;
      setIsUserMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

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
      <div ref={userMenuRef} className="relative z-10 flex items-center gap-3">
        {userRole && (
          <Badge
            variant={roleBadgeColors[userRole] || "bg-gray-100 text-gray-800"}
            className="hidden sm:inline-flex"
          >
            {roleLabels[userRole] || userRole}
          </Badge>
        )}
        <button
          type="button"
          onClick={() => setIsUserMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={isUserMenuOpen}
          aria-label="Open user menu"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-sm transition hover:border-brand-primary/30 hover:bg-brand-mist focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
            isUserMenuOpen && "border-brand-primary/40 bg-brand-mist"
          )}
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white shadow-sm">
            {userInitial}
          </span>
          <ChevronDown
            className={cn(
              "hidden h-4 w-4 text-slate-500 transition-transform sm:block",
              isUserMenuOpen && "rotate-180"
            )}
          />
        </button>

        {isUserMenuOpen && (
          <div
            className="absolute right-0 top-[calc(100%+0.75rem)] w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
            role="menu"
            aria-label="User menu"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-primary text-base font-semibold text-white">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Signed in as
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                {showSecondaryLine ? (
                  <p className="truncate text-sm text-slate-500">{userEmail}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Role
              </span>
              {userRole ? (
                <Badge
                  variant={roleBadgeColors[userRole] || "bg-gray-100 text-gray-800"}
                  className="shadow-none"
                >
                  {roleLabels[userRole] || userRole}
                </Badge>
              ) : (
                <span className="text-sm font-medium text-slate-700">User</span>
              )}
            </div>

            <div className="mt-4 grid gap-2">
              <Link
                href={accountHref}
                onClick={() => setIsUserMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                role="menuitem"
              >
                <UserCircle2 className="h-4 w-4" />
                My Account
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  signOut({ callbackUrl: "/app/login" });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
