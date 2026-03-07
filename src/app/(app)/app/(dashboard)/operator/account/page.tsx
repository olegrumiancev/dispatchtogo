import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreatePreferences } from "@/lib/user-preferences";
import AccountNotificationSettings from "@/components/forms/account-notification-settings";
import OperatorOrganizationForm from "@/components/forms/operator-organization-form";

export const metadata = {
  title: "Account Settings | DispatchToGo",
};

export default async function OperatorAccountPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/app/login");

  const [prefs, org] = await Promise.all([
    getOrCreatePreferences(user.id),
    user.organizationId
      ? prisma.organization.findUnique({
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
      : null,
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your organization details, notification preferences, and account options.
        </p>
      </div>

      {org && <OperatorOrganizationForm initialOrg={org} />}

      <AccountNotificationSettings
        initialPrefs={{
          digestEnabled: prefs.digestEnabled,
          digestFrequency: prefs.digestFrequency,
          smsOptOut: prefs.smsOptOut,
          emailOptOut: prefs.emailOptOut,
        }}
      />
    </div>
  );
}
