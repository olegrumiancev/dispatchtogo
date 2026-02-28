import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Send,
  Users,
  Building,
  BarChart3,
  Bell,
  ShieldCheck,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  TrendingUp,
} from "lucide-react";

export const metadata = {
  title: "Admin Dashboard | DispatchToGo",
};

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    pendingDispatch,
    activeJobs,
    completedThisMonth,
    totalRequests,
    activeVendors,
    totalOrgs,
    emergencyRequests,
    requestsThisMonth,
  ] = await Promise.all([
    prisma.serviceRequest.count({
      where: { status: { in: ["SUBMITTED", "READY_TO_DISPATCH"] }, job: null },
    }),
    prisma.job.count({ where: { completedAt: null } }),
    prisma.job.count({
      where: { completedAt: { gte: firstOfMonth, not: null } },
    }),
    prisma.serviceRequest.count(),
    prisma.vendor.count({ where: { isActive: true } }),
    prisma.organization.count(),
    prisma.serviceRequest.count({
      where: { urgency: "EMERGENCY", status: { notIn: ["COMPLETED", "VERIFIED", "CANCELLED"] } },
    }),
    prisma.serviceRequest.count({
      where: { createdAt: { gte: firstOfMonth } },
    }),
  ]);

  const stats = [
    {
      label: "Pending Dispatch",
      value: pendingDispatch,
      icon: Send,
      color: "bg-orange-100 text-orange-600",
      highlight: pendingDispatch > 0,
    },
    {
      label: "Active Jobs",
      value: activeJobs,
      icon: Briefcase,
      color: "bg-blue-100 text-blue-600",
      highlight: false,
    },
    {
      label: "Completed This Month",
      value: completedThisMonth,
      icon: CheckCircle,
      color: "bg-emerald-100 text-emerald-600",
      highlight: false,
    },
    {
      label: "Emergencies",
      value: emergencyRequests,
      icon: AlertTriangle,
      color: "bg-red-100 text-red-600",
      highlight: emergencyRequests > 0,
    },
    {
      label: "Requests This Month",
      value: requestsThisMonth,
      icon: TrendingUp,
      color: "bg-purple-100 text-purple-600",
      highlight: false,
    },
    {
      label: "Total Requests",
      value: totalRequests,
      icon: ClipboardList,
      color: "bg-gray-100 text-gray-600",
      highlight: false,
    },
  ];

  const quickLinks = [
    { href: "/admin/dispatch", label: "Dispatch Board", icon: Send, desc: "Assign vendors to pending requests" },
    { href: "/admin/vendors", label: "Vendors", icon: Users, desc: `${activeVendors} active vendors` },
    { href: "/admin/organizations", label: "Organizations", icon: Building, desc: `${totalOrgs} organizations` },
    { href: "/admin/users", label: "User Management", icon: Users, desc: "Manage users and roles" },
    { href: "/admin/reports", label: "Reports", icon: BarChart3, desc: "Platform-wide KPIs" },
    { href: "/admin/notifications", label: "Notifications", icon: Bell, desc: "SMS configuration" },
    { href: "/admin/proof-packets", label: "Proof Packets", icon: ShieldCheck, desc: "Completed job documentation" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and quick actions.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={stat.highlight ? "ring-2 ring-orange-300" : ""}>
              <CardContent className="flex flex-col items-center py-5 gap-2">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 text-center">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="flex items-start gap-3 py-4">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{link.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
