import { Bell } from "lucide-react";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";
import { getSettings } from "@/lib/settings";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const smsEnabled = NOTIFICATION_SETTINGS.smsEnabled;
  const emailEnabled = NOTIFICATION_SETTINGS.emailEnabled;
  const settings = await getSettings();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-600" />
          Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage SMS and email notification settings, and customise message templates.
        </p>
      </div>

      <NotificationsClient
        smsEnabled={smsEnabled}
        emailEnabled={emailEnabled}
        notifyVendorOnDispatch={NOTIFICATION_SETTINGS.notifyVendorOnDispatch}
        notifyOperatorOnStatusChange={NOTIFICATION_SETTINGS.notifyOperatorOnStatusChange}
        notifyOperatorOnCompletion={NOTIFICATION_SETTINGS.notifyOperatorOnCompletion}
        smsRedirectEnabled={settings.smsRedirectEnabled}
        smsRedirectNumber={settings.smsRedirectNumber}
      />
    </div>
  );
}
