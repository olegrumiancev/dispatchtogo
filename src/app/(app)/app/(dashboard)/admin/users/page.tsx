import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserTableClient, SerializedUser } from "./UserTableClient";

export const metadata = {
  title: "Users | DispatchToGo Admin",
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { name: true } },
      vendor: { select: { companyName: true } },
    },
  });

  const serialized: SerializedUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: !!u.emailVerified,
    isApproved: u.isApproved,
    isDisabled: u.isDisabled,
    rejectedAt: u.rejectedAt?.toISOString() ?? null,
    rejectionNote: u.rejectionNote,
    createdAt: u.createdAt.toISOString(),
    organization: u.organization ? { name: u.organization.name } : null,
    vendor: u.vendor ? { companyName: u.vendor.companyName } : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage all platform users — operators, vendors, and admins.
        </p>
      </div>
      <UserTableClient users={serialized} />
    </div>
  );
}
