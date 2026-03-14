import { getSettings } from "@/lib/settings";
import { renderTemplate } from "@/lib/sms-templates";
import {
  isSmsAllowedForScope,
  type NotificationPreferenceScope,
  type SmsNotificationPreferenceKey,
} from "@/lib/user-preferences";

const TEXTBEE_API_URL = process.env.TEXTBEE_API_URL;
const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY;
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;

type SMSResult =
  | { success: true; sid: string }
  | { success: false; error: string };

export async function sendSMS(
  to: string,
  body: string,
  options?: {
    preferenceScope?: NotificationPreferenceScope;
    preferenceKey?: SmsNotificationPreferenceKey;
  }
): Promise<SMSResult> {
  if (!TEXTBEE_API_URL || !TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
    console.warn("[sms] textbee not configured – skipping SMS");
    return { success: false, error: "textbee not configured" };
  }

  if (options?.preferenceScope) {
    const allowed = await isSmsAllowedForScope(
      options.preferenceScope,
      options.preferenceKey
    ).catch(() => true);
    if (!allowed) {
      console.log(`[sms] Recipient preference opted out; skipping ${to}`);
      return { success: false, error: "Recipient opted out of SMS notifications" };
    }
  }

  // SMS redirect failsafe — re-route to test number if enabled in DB settings
  let recipient = to;
  try {
    const settings = await getSettings();
    if (settings.smsRedirectEnabled && settings.smsRedirectNumber.trim()) {
      console.warn(
        `[sms] REDIRECT ACTIVE — re-routing SMS for ${to} → ${settings.smsRedirectNumber.trim()}`
      );
      recipient = settings.smsRedirectNumber.trim();
    }
  } catch {
    // Don't block SMS on a settings DB failure
  }

  try {
    const res = await fetch(
      `${TEXTBEE_API_URL}/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": TEXTBEE_API_KEY,
        },
        body: JSON.stringify({ recipients: [recipient], message: body }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[sms] Send failed:", res.status, text);
      return { success: false, error: `textbee error ${res.status}: ${text}` };
    }

    const data = await res.json();
    const sid: string =
      data?.data?._id ?? data?.data?.id ?? data?._id ?? `textbee-${Date.now()}`;
    return { success: true, sid };
  } catch (err: any) {
    console.error("[sms] Send failed:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

export async function sendVendorDispatchNotification(
  vendorPhone: string,
  vendorCompanyName: string,
  details: {
    category: string;
    propertyName: string;
    urgency: string;
    description: string;
    refNumber: string;
  },
  preferenceScope?: NotificationPreferenceScope
): Promise<SMSResult> {
  const appBase =
    process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const description =
    details.description.length > 120
      ? details.description.slice(0, 117) + "..."
      : details.description;
  const body = await renderTemplate("vendorDispatch", {
    vendorCompanyName,
    refNumber: details.refNumber,
    propertyName: details.propertyName,
    category: details.category,
    urgency: details.urgency,
    description,
    appBase,
  });

  return sendSMS(vendorPhone, body, {
    preferenceScope,
    preferenceKey: "smsDispatchEnabled",
  });
}

export async function sendOperatorStatusUpdate(
  operatorPhone: string,
  refNumber: string,
  status: string,
  vendorName?: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<SMSResult> {
  const body = await renderTemplate("operatorStatusUpdate", {
    refNumber,
    status,
    vendorName: vendorName ? ` by ${vendorName}` : "",
  });
  return sendSMS(operatorPhone, body, {
    preferenceScope,
    preferenceKey: "smsStatusEnabled",
  });
}

export async function sendJobCompletionNotification(
  operatorPhone: string,
  refNumber: string,
  vendorName: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<SMSResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const body = await renderTemplate("jobCompletion", {
    refNumber,
    vendorName,
    appBase,
  });
  return sendSMS(operatorPhone, body, {
    preferenceScope,
    preferenceKey: "smsCompletionEnabled",
  });
}

// Map of rejection type → human-readable label for SMS messages
const REJECTION_TYPE_LABELS: Record<string, string> = {
  send_back: "sent back for rework",
  redispatch: "re-dispatched to a new vendor (your assignment has been removed)",
  dispute: "escalated to an admin for review",
};

export async function sendVendorRejectionSms(
  vendorPhone: string,
  vendorCompanyName: string,
  refNumber: string,
  reason: string,
  rejectionType: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<SMSResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const rejectionLabel = REJECTION_TYPE_LABELS[rejectionType] ?? "rejected";
  const body = await renderTemplate("vendorRejection", {
    refNumber,
    rejectionLabel,
    reason: reason.length > 120 ? reason.slice(0, 117) + "..." : reason,
    appBase,
  });
  return sendSMS(vendorPhone, body, {
    preferenceScope,
    preferenceKey: "smsIssueEnabled",
  });
}

// Kept for callers that send from the operator side
export { sendVendorRejectionSms as sendRejectionSms };

export async function sendVendorEnrouteNotification(
  operatorPhone: string,
  refNumber: string,
  propertyName: string,
  vendorName: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<SMSResult> {
  const body = await renderTemplate("vendorEnroute", {
    vendorName,
    propertyName,
    refNumber,
  });
  return sendSMS(operatorPhone, body, {
    preferenceScope,
    preferenceKey: "smsStatusEnabled",
  });
}

export async function sendWorkPausedNotification(
  operatorPhone: string,
  refNumber: string,
  propertyName: string,
  pauseReason: string | null,
  estimatedReturn: Date | null,
  preferenceScope?: NotificationPreferenceScope
): Promise<SMSResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const reason = pauseReason
    ? ` Reason: ${pauseReason.length > 100 ? pauseReason.slice(0, 97) + "..." : pauseReason}.`
    : "";
  const eta = estimatedReturn
    ? ` Est. return: ${estimatedReturn.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}.`
    : "";
  const body = await renderTemplate("workPaused", {
    propertyName,
    refNumber,
    reason,
    eta,
    appBase,
  });
  return sendSMS(operatorPhone, body, {
    preferenceScope,
    preferenceKey: "smsStatusEnabled",
  });
}

export async function sendWorkResumedNotification(
  operatorPhone: string,
  refNumber: string,
  propertyName: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<SMSResult> {
  const body = await renderTemplate("workResumed", { propertyName, refNumber });
  return sendSMS(operatorPhone, body, {
    preferenceScope,
    preferenceKey: "smsStatusEnabled",
  });
}

export async function sendJobDeclinedNotification(
  operatorPhone: string,
  refNumber: string,
  propertyName: string,
  vendorName: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<SMSResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const body = await renderTemplate("jobDeclined", {
    vendorName,
    refNumber,
    propertyName,
    appBase,
  });
  return sendSMS(operatorPhone, body, {
    preferenceScope,
    preferenceKey: "smsIssueEnabled",
  });
}

export async function sendJobCancelledToVendorSms(
  vendorPhone: string,
  refNumber: string,
  propertyName: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<SMSResult> {
  const body = await renderTemplate("jobCancelledToVendor", {
    refNumber,
    propertyName,
  });
  return sendSMS(vendorPhone, body, {
    preferenceScope,
    preferenceKey: "smsIssueEnabled",
  });
}
