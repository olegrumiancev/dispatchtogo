import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthSessionProvider } from "@/components/layout/session-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as {
    id: string;
    email: string;
    name?: string | null;
    role: "OPERATOR" | "VENDOR" | "ADMIN";
    organizationId?: string | null;
    vendorId?: string | null;
  };

  return (
    <AuthSessionProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar role={user.role} userName={user.name ?? user.email} />
        <div className="md:pl-64 flex flex-col min-h-screen">
          <Header
            userName={user.name ?? user.email}
            userRole={user.role}
          />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
