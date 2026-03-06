import { Bell } from "lucide-react";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";
import { getSettings } from "@/lib/settings";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const smsEnabled = NOTIFICATION_SETTINGS.smsEnabled;
  const settings = await getSettings();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-600" />
          SMS Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage textbee SMS configuration and send test messages.
        </p>
      </div>

      <NotificationsClient
        smsEnabled={smsEnabled}
        notifyVendorOnDispatch={NOTIFICATION_SETTINGS.notifyVendorOnDispatch}
        notifyOperatorOnStatusChange={NOTIFICATION_SETTINGS.notifyOperatorOnStatusChange}
        notifyOperatorOnCompletion={NOTIFICATION_SETTINGS.notifyOperatorOnCompletion}
        smsRedirectEnabled={settings.smsRedirectEnabled}
        smsRedirectNumber={settings.smsRedirectNumber}
      />

      {/* Events legend */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Automatic Notification Events
        </h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>
            <strong>Vendor dispatched</strong> — SMS sent to vendor when a job is assigned.
          </li>
          <li>
            <strong>Job accepted / rejected</strong> — SMS sent to operator when vendor responds.
          </li>
          <li>
            <strong>Job started</strong> — SMS sent to operator when vendor begins work.
          </li>
          <li>
            <strong>Job completed</strong> — SMS sent to operator when vendor marks work done.
          </li>
        </ul>
      </section>
    </div>
  );
}
