import { getSettings } from "@/lib/settings";

const TEXTBEE_API_URL = process.env.TEXTBEE_API_URL;
const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY;
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID;

type SMSResult =
  | { success: true; sid: string }
  | { success: false; error: string };

export async function sendSMS(
  to: string,
  body: string
): Promise<SMSResult> {
  if (!TEXTBEE_API_URL || !TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
    console.warn("[sms] textbee not configured – skipping SMS");
    return { success: false, error: "textbee not configured" };
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
  }
): Promise<SMSResult> {
  const appBase =
    process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const body = [
    `DispatchToGo: New job dispatched to ${vendorCompanyName}.`,
    `Ref: ${details.refNumber}`,
    `Property: ${details.propertyName}`,
    `Category: ${details.category} | Urgency: ${details.urgency}`,
    details.description.length > 120
      ? details.description.slice(0, 117) + "..."
      : details.description,
    `Accept or decline: ${appBase}/app/vendor/jobs`,
  ].join("\n");

  return sendSMS(vendorPhone, body);
}

export async function sendOperatorStatusUpdate(
  operatorPhone: string,
  refNumber: string,
  status: string,
  vendorName?: string
): Promise<SMSResult> {
  const who = vendorName ? ` by ${vendorName}` : "";
  const body = `DispatchToGo: Job ${refNumber} status updated to ${status}${who}.`;
  return sendSMS(operatorPhone, body);
}

export async function sendJobCompletionNotification(
  operatorPhone: string,
  refNumber: string,
  vendorName: string
): Promise<SMSResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const body = `DispatchToGo: Job ${refNumber} has been completed by ${vendorName}. Review the proof packet: ${appBase}/app/operator/requests`;
  return sendSMS(operatorPhone, body);
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
  rejectionType: string
): Promise<SMSResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const label = REJECTION_TYPE_LABELS[rejectionType] ?? "rejected";
  const body = [
    `DispatchToGo: Work on job ${refNumber} has been ${label}.`,
    `Reason: ${reason.length > 120 ? reason.slice(0, 117) + "..." : reason}`,
    `View details: ${appBase}/app/vendor/jobs`,
  ].join("\n");
  return sendSMS(vendorPhone, body);
}

// Kept for callers that send from the operator side
export { sendVendorRejectionSms as sendRejectionSms };

export async function sendVendorEnrouteNotification(
  operatorPhone: string,
  refNumber: string,
  propertyName: string,
  vendorName: string
): Promise<SMSResult> {
  const body = `DispatchToGo: Your vendor (${vendorName}) is on the way to ${propertyName}. Ref: ${refNumber}.`;
  return sendSMS(operatorPhone, body);
}

export async function sendWorkPausedNotification(
  operatorPhone: string,
  refNumber: string,
  propertyName: string,
  pauseReason: string | null,
  estimatedReturn: Date | null
): Promise<SMSResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const reason = pauseReason ? ` Reason: ${pauseReason.length > 100 ? pauseReason.slice(0, 97) + "..." : pauseReason}.` : "";
  const eta = estimatedReturn
    ? ` Est. return: ${estimatedReturn.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}.`
    : "";
  const body = `DispatchToGo: Work has been paused at ${propertyName} (Ref: ${refNumber}).${reason}${eta} View details: ${appBase}/app/operator/requests`;
  return sendSMS(operatorPhone, body);
}

export async function sendWorkResumedNotification(
  operatorPhone: string,
  refNumber: string,
  propertyName: string
): Promise<SMSResult> {
  const body = `DispatchToGo: Work has resumed at ${propertyName} (Ref: ${refNumber}).`;
  return sendSMS(operatorPhone, body);
}

export async function sendJobDeclinedNotification(
  operatorPhone: string,
  refNumber: string,
  propertyName: string,
  vendorName: string
): Promise<SMSResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const body = `DispatchToGo: Vendor ${vendorName} declined job ${refNumber} at ${propertyName}. Re-dispatch required: ${appBase}/app/operator/requests`;
  return sendSMS(operatorPhone, body);
}

export async function sendJobCancelledToVendorSms(
  vendorPhone: string,
  refNumber: string,
  propertyName: string
): Promise<SMSResult> {
  const body = `DispatchToGo: Job ${refNumber} at ${propertyName} has been cancelled by the operator. No further action is required.`;
  return sendSMS(vendorPhone, body);
}
