"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

interface DashboardShellProps {
  role: "OPERATOR" | "VENDOR" | "ADMIN";
  userName?: string | null;
  userEmail?: string | null;
  smsRedirectEnabled?: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  userName,
  userEmail,
  smsRedirectEnabled = false,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Sidebar
        role={role}
        userName={userName}
        smsRedirectEnabled={smsRedirectEnabled}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      <div className="flex min-h-screen flex-col md:pl-64">
        <Header
          userName={userName}
          userEmail={userEmail}
          userRole={role}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </>
  );
}
