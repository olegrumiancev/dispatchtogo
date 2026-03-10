import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAccountsSubnav } from "@/components/admin/accounts-subnav";
import { ArrowRight, Building, Clock, UserCog, Users } from "lucide-react";

export const metadata = {
  title: "Accounts | DispatchToGo Admin",
};

export default async function AdminAccountsPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const [organizations, vendors, users, pendingApprovals] = await Promise.all([
    prisma.organization.count(),
    prisma.vendor.count(),
    prisma.user.count(),
    prisma.user.count({
      where: {
        role: { not: "ADMIN" },
        emailVerified: true,
        isApproved: false,
        rejectedAt: null,
        isDisabled: false,
      },
    }),
  ]);

  const cards = [
    {
      href: "/app/admin/organizations",
      label: "Organizations",
      description: "Billing accounts, property operators, and request ownership.",
      value: organizations,
      icon: Building,
    },
    {
      href: "/app/admin/vendors",
      label: "Vendors",
      description: "Service providers, availability, skills, credentials, and workload.",
      value: vendors,
      icon: Users,
    },
    {
      href: "/app/admin/users",
      label: "Users",
      description: "Login access, approvals, disablement, and role-based account control.",
      value: users,
      icon: UserCog,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage organizations, vendors, and the user accounts attached to them.
        </p>
      </div>

      <AdminAccountsSubnav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{organizations}</p>
              <p className="text-xs text-gray-500">Organizations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{vendors}</p>
              <p className="text-xs text-gray-500">Vendors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users}</p>
              <p className="text-xs text-gray-500">User Accounts</p>
            </div>
          </CardContent>
        </Card>
        <Card className={pendingApprovals > 0 ? "ring-2 ring-amber-300" : ""}>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingApprovals}</p>
              <p className="text-xs text-gray-500">Pending Approvals</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-all hover:border-blue-300 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </div>
                  <CardTitle className="text-base">{card.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
