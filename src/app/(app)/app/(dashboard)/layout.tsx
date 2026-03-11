import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import { getOrganizationLifecycle, getOrganizationStatusMeta, isOrganizationActive } from "@/lib/organization-lifecycle";
import { getVendorLifecycle, getVendorStatusMeta, isVendorActive } from "@/lib/vendor-lifecycle";
import { getSettings } from "@/lib/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/app/login");
  }

  const user = session.user as {
    id: string;
    email: string;
    name?: string | null;
    role: "OPERATOR" | "VENDOR" | "ADMIN";
    organizationId?: string | null;
    vendorId?: string | null;
  };

  const smsRedirectEnabled =
    user.role === "ADMIN"
      ? (await getSettings()).smsRedirectEnabled
      : false;
  const organizationState =
    user.role === "OPERATOR" && user.organizationId
      ? await getOrganizationLifecycle(user.organizationId)
      : null;
  const vendorState =
    user.role === "VENDOR" && user.vendorId
      ? await getVendorLifecycle(user.vendorId)
      : null;

  return (
    <AuthSessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#e8f0fe]">
        <Sidebar role={user.role} userName={user.name ?? user.email} smsRedirectEnabled={smsRedirectEnabled} />
        <div className="md:pl-64 flex flex-col min-h-screen">
          <Header
            userName={user.name ?? user.email}
            userRole={user.role}
          />
          <main className="flex-1 p-4 md:p-6">
            {organizationState && !isOrganizationActive(organizationState.status) && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">
                  Organization access is {getOrganizationStatusMeta(organizationState.status).label.toLowerCase()}.
                </p>
                {organizationState.statusReason && (
                  <p className="mt-1 text-amber-800">{organizationState.statusReason}</p>
                )}
              </div>
            )}
            {vendorState && !isVendorActive(vendorState.status) && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">
                  Vendor access is {getVendorStatusMeta(vendorState.status).label.toLowerCase()}.
                </p>
                {vendorState.statusReason && (
                  <p className="mt-1 text-amber-800">{vendorState.statusReason}</p>
                )}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
