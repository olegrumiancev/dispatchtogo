import { notFound } from "next/navigation";
import { AccountPageShell } from "@/components/account/account-page-shell";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { ChangeEmailForm } from "@/components/account/change-email-form";
import { PersonalDetailsForm } from "@/components/account/personal-details-form";
import { PersonalAccountCard } from "@/components/account/personal-account-card";
import AccountNotificationSettings from "@/components/forms/account-notification-settings";
import { prisma } from "@/lib/prisma";
import { getOrCreatePreferences } from "@/lib/user-preferences";

interface MyAccountPageProps {
  userId: string;
  relatedSettings?: {
    href: string;
    label: string;
    description: string;
  };
}

export async function MyAccountPage({ userId, relatedSettings }: MyAccountPageProps) {
  const [account, prefs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        organization: {
          select: {
            name: true,
          },
        },
        vendor: {
          select: {
            companyName: true,
          },
        },
      },
    }),
    getOrCreatePreferences(userId),
  ]);

  if (!account) {
    notFound();
  }

  const linkedEntity = account.organization
    ? { label: "Organization", value: account.organization.name }
    : account.vendor
      ? { label: "Company", value: account.vendor.companyName }
      : undefined;

  return (
    <AccountPageShell
      title="My Account"
      description="Manage your personal sign-in details, security options, and notification preferences."
    >
      <PersonalAccountCard
        name={account.name}
        email={account.email}
        role={account.role}
        emailVerified={account.emailVerified}
        createdAt={account.createdAt}
        linkedEntity={linkedEntity}
        relatedSettings={relatedSettings}
      />

      <PersonalDetailsForm
        initialName={account.name}
      />

      <ChangeEmailForm currentEmail={account.email} />

      <ChangePasswordForm />

      <AccountNotificationSettings
        initialPrefs={{
          digestEnabled: prefs.digestEnabled,
          digestFrequency: prefs.digestFrequency,
          smsOptOut: prefs.smsOptOut,
          emailOptOut: prefs.emailOptOut,
        }}
      />
    </AccountPageShell>
  );
}
