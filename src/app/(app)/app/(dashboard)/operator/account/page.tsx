import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrCreatePreferences } from "@/lib/user-preferences";
import AccountNotificationSettings from "@/components/forms/account-notification-settings";

export const metadata = {
  title: "Account Settings | DispatchToGo",
};

export default async function OperatorAccountPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/app/login");

  const prefs = await getOrCreatePreferences(user.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your notification preferences and account options.
        </p>
      </div>

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
