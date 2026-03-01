import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "DispatchToGo <noreply@dispatchtogo.com>";

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (_client) return _client;
  _client = new Resend(RESEND_API_KEY);
  return _client;
}

export function isEmailConfigured(): boolean {
  return RESEND_API_KEY.length > 0;
}

type EmailResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<EmailResult> {
  const client = getClient();
  if (!client) {
    console.warn("[email] Resend not configured \u2013 skipping email");
    return { success: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });
    if (error) {
      console.error("[email] Send failed:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id ?? "" };
  } catch (err: any) {
    console.error("[email] Send failed:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

export async function checkEmailHealth(): Promise<string | null> {
  if (!isEmailConfigured()) return "not configured";
  const client = getClient();
  if (!client) return "client creation failed";
  try {
    // Validate key with a real delivery to Resend's test sink (does not count toward quota)
    const { error } = await client.emails.send({
      from: "DispatchToGo <onboarding@resend.dev>",
      to: "delivered@resend.dev",
      subject: "health",
      text: "ping",
    });
    if (error) return error.message;
    return null;
  } catch (err: any) {
    return `${err.code || "Error"}: ${err.message || String(err)}`;
  }
}

// Convenience wrappers for transactional emails

export async function sendVendorDispatchEmail(
  vendorEmail: string,
  vendorCompanyName: string,
  details: {
    category: string;
    propertyName: string;
    urgency: string;
    description: string;
    refNumber: string;
    appUrl?: string;
  }
): Promise<EmailResult> {
  const appUrl = details.appUrl || "https://dispatchtogo.com";
  const subject = `New Job Dispatched \u2013 ${details.refNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">New Job Dispatched</h2>
        <p>Hi ${vendorCompanyName},</p>
        <p>A new job has been dispatched to you:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;width:140px">Reference</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${details.refNumber}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Property</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${details.propertyName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Category</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${details.category}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Urgency</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${details.urgency}</td></tr>
        </table>
        <p style="margin:0 0 8px"><strong>Description:</strong></p>
        <p style="background:#f9fafb;padding:12px;border-radius:6px">${details.description}</p>
        <a href="${appUrl}/vendor/jobs" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View & Accept Job</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">Please log in to accept or decline this job.</p>
      </div>
    </div>`;
  return sendEmail(vendorEmail, subject, html);
}

export async function sendOperatorStatusEmail(
  operatorEmail: string,
  refNumber: string,
  status: string,
  vendorName?: string
): Promise<EmailResult> {
  const who = vendorName ? ` by ${vendorName}` : "";
  const subject = `Job ${refNumber} \u2013 Status: ${status}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Job Status Update</h2>
        <p>Job <strong>${refNumber}</strong> has been updated to <strong>${status}</strong>${who}.</p>
        <a href="https://dispatchtogo.com/requests" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View Details</a>
      </div>
    </div>`;
  return sendEmail(operatorEmail, subject, html);
}

export async function sendJobCompletionEmail(
  operatorEmail: string,
  refNumber: string,
  vendorName: string
): Promise<EmailResult> {
  const subject = `Job ${refNumber} \u2013 Completed by ${vendorName}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#16a34a;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Job Completed</h2>
        <p>Job <strong>${refNumber}</strong> has been completed by <strong>${vendorName}</strong>.</p>
        <p>You can now review the proof of service packet and approve the work.</p>
        <a href="https://dispatchtogo.com/requests" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Review Proof Packet</a>
      </div>
    </div>`;
  return sendEmail(operatorEmail, subject, html);
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: string
): Promise<EmailResult> {
  const subject = "Welcome to DispatchToGo";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Welcome, ${name}!</h2>
        <p>Your ${role.toLowerCase()} account has been created on DispatchToGo.</p>
        <p>DispatchToGo is a managed vendor dispatch platform for tourism and hospitality operators in Cornwall &amp; SDG, Ontario.</p>
        <a href="https://dispatchtogo.com/login" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Log In</a>
      </div>
    </div>`;
  return sendEmail(email, subject, html);
}
