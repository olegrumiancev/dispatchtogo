import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountPageShell } from "@/components/account/account-page-shell";
import OperatorOrganizationForm from "@/components/forms/operator-organization-form";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Organization Settings | DispatchToGo",
};

export default async function OperatorOrganizationPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/app/login");

  const org = user.organizationId
    ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          id: true,
          name: true,
          type: true,
          contactEmail: true,
          contactPhone: true,
          address: true,
        },
      })
    : null;

  if (!org) redirect("/app/operator/account");

  return (
    <AccountPageShell
      title="Organization Settings"
      description="Manage your organization's name, contact information, and property profile details. Personal login settings live in My Account."
      maxWidthClassName="max-w-2xl"
    >
      <OperatorOrganizationForm initialOrg={org} />
    </AccountPageShell>
  );
}
