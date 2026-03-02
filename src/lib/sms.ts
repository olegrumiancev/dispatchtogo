import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

function getClient() {
  if (!accountSid || !authToken) {
    return null;
  }
  return twilio(accountSid, authToken);
}

type SMSResult =
  | { success: true; sid: string }
  | { success: false; error: string };

export async function sendSMS(
  to: string,
  body: string
): Promise<SMSResult> {
  const client = getClient();
  if (!client || !fromNumber) {
    console.warn("[sms] Twilio not configured \u2013 skipping SMS");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });
    return { success: true, sid: message.sid };
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
  const body = [
    `DispatchToGo: New job dispatched to ${vendorCompanyName}.`,
    `Ref: ${details.refNumber}`,
    `Property: ${details.propertyName}`,
    `Category: ${details.category} | Urgency: ${details.urgency}`,
    details.description.length > 120
      ? details.description.slice(0, 117) + "..."
      : details.description,
    `Please log in to accept the job.`,
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
  const body = `DispatchToGo: Job ${refNumber} has been completed by ${vendorName}. Log in to review the proof packet.`;
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
  const label = REJECTION_TYPE_LABELS[rejectionType] ?? "rejected";
  const body = [
    `DispatchToGo: Work on job ${refNumber} has been ${label}.`,
    `Reason: ${reason.length > 120 ? reason.slice(0, 117) + "..." : reason}`,
    `Please log in for details.`,
  ].join("\n");
  return sendSMS(vendorPhone, body);
}

// Kept for callers that send from the operator side
export { sendVendorRejectionSms as sendRejectionSms };
