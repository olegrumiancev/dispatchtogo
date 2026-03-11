"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  FileText,
  Briefcase,
  UserCircle,
  Send,
  Users,
  BarChart3,
  Bell,
  Menu,
  X,
  LogOut,
  Truck,
  ShieldCheck,
  UserCog,
  Heart,
  CreditCard,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const OPERATOR_NAV: NavItem[] = [
  { href: "/app/operator", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/operator/requests", label: "Service Requests", icon: ClipboardList },
  { href: "/app/operator/properties", label: "Properties", icon: Building2 },
  { href: "/app/operator/vendors", label: "Preferred Vendors", icon: Heart },
  { href: "/app/operator/invoices", label: "Invoices", icon: FileText },
  { href: "/app/operator/proof-packets", label: "Proof Packets", icon: ShieldCheck },
  { href: "/app/operator/billing", label: "Billing", icon: CreditCard },
  { href: "/app/operator/account", label: "Account Settings", icon: SlidersHorizontal },
];

const VENDOR_NAV: NavItem[] = [
  { href: "/app/vendor/jobs", label: "Available Jobs", icon: Briefcase },
  { href: "/app/vendor/proof-packets", label: "Proof Packets", icon: ShieldCheck },
  { href: "/app/vendor/profile", label: "My Profile", icon: UserCircle },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/app/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/admin/dispatch", label: "Dispatch Board", icon: Send },
  { href: "/app/admin/accounts", label: "Accounts", icon: UserCog },
  { href: "/app/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/app/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/app/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/app/admin/proof-packets", label: "Proof Packets", icon: ShieldCheck },
  { href: "/app/admin/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  role: "OPERATOR" | "VENDOR" | "ADMIN";
  userName?: string | null;
  smsRedirectEnabled?: boolean;
}

export function Sidebar({ role, userName, smsRedirectEnabled = false }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems =
    role === "OPERATOR"
      ? OPERATOR_NAV
      : role === "VENDOR"
      ? VENDOR_NAV
      : ADMIN_NAV;

  const isActive = (href: string) => {
    if (href === "/app/operator" || href === "/app/vendor/jobs" || href === "/app/admin") {
      return pathname === href;
    }
    if (href === "/app/admin/accounts") {
      return ["/app/admin/accounts", "/app/admin/organizations", "/app/admin/vendors", "/app/admin/users"].some((path) =>
        pathname.startsWith(path)
      );
    }
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold text-lg">DispatchToGo</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {smsRedirectEnabled && item.href === "/app/admin/notifications" && (
                <span
                  title="SMS redirect is active"
                  className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-slate-700">
        {userName && (
          <p className="px-3 text-xs text-slate-400 mb-2 truncate">{userName}</p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/app/login" })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-slate-800 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-slate-800 text-white rounded-md shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile: overlay + drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-slate-800 h-full shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
