"use client";

import { Bell } from "lucide-react";

interface NotificationEvent {
  id: string;
  type: "vendor_dispatch" | "status_update" | "job_completion";
  message: string;
  timestamp: Date;
  success: boolean;
}

interface NotificationLogProps {
  /** Optional list of events to display. Falls back to placeholder UI. */
  events?: NotificationEvent[];
  className?: string;
}

const EVENT_LABELS: Record<NotificationEvent["type"], string> = {
  vendor_dispatch: "Vendor Dispatched",
  status_update: "Status Update",
  job_completion: "Job Completed",
};

/**
 * Displays a log of recent SMS notification events for a request or job.
 * In the MVP phase this shows a placeholder; wire in real events from your
 * API as the feature matures.
 */
export function NotificationLog({ events, className = "" }: NotificationLogProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <Bell className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">SMS Notifications</h3>
      </div>

      {events && events.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {events.map((event) => (
            <li key={event.id} className="px-4 py-3 flex items-start gap-3">
              <span
                className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                  event.success ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600">
                  {EVENT_LABELS[event.type]}
                </p>
                <p className="text-xs text-slate-500 break-words">{event.message}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {event.timestamp.toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-slate-500">
            SMS notifications will appear here once they are sent.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Notifications are triggered automatically when a job is dispatched,
            status changes, or work is completed.
          </p>
        </div>
      )}
    </div>
  );
}

export type { NotificationEvent };
