import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { isEmailEventEnabled, getBccRecipients } from "@/lib/settings";
import type { SystemSettings } from "@prisma/client";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "DispatchToGo <noreply@dispatchtogo.com>";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return _transporter;
}

export function isEmailConfigured(): boolean {
  return SMTP_HOST.length > 0 && SMTP_USER.length > 0 && SMTP_PASS.length > 0;
}

type EmailResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  options?: { eventKey?: keyof SystemSettings }
): Promise<EmailResult> {
  // If an event key is provided, check whether this event is enabled
  if (options?.eventKey) {
    const enabled = await isEmailEventEnabled(options.eventKey).catch(() => true);
    if (!enabled) {
      console.log(`[email] Event ${String(options.eventKey)} is disabled – skipping`);
      return { success: false, error: "Event disabled by admin settings" };
    }
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP not configured – skipping email");
    return { success: false, error: "SMTP not configured" };
  }

  try {
    // Resolve BCC recipients
    const bcc = await getBccRecipients().catch(() => [] as string[]);

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
      ...(bcc.length > 0 ? { bcc: bcc.join(", ") } : {}),
    });
    return { success: true, messageId: info.messageId ?? "" };
  } catch (err: any) {
    console.error("[email] Send failed:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

export async function checkEmailHealth(): Promise<string | null> {
  if (!isEmailConfigured()) return "not configured";
  const transporter = getTransporter();
  if (!transporter) return "transporter creation failed";
  try {
    await transporter.verify();
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
  const subject = `New Job Dispatched – ${details.refNumber}`;
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
  return sendEmail(vendorEmail, subject, html, undefined, { eventKey: "emailVendorDispatch" });
}

export async function sendOperatorStatusEmail(
  operatorEmail: string,
  refNumber: string,
  status: string,
  vendorName?: string
): Promise<EmailResult> {
  const who = vendorName ? ` by ${vendorName}` : "";
  const subject = `Job ${refNumber} – Status: ${status}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Job Status Update</h2>
        <p>Job <strong>${refNumber}</strong> has been updated to <strong>${status}</strong>${who}.</p>
        <a href="https://dispatchtogo.com/operator/requests" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View Details</a>
      </div>
    </div>`;
  return sendEmail(operatorEmail, subject, html, undefined, { eventKey: "emailOperatorStatusUpdate" });
}

export async function sendJobCompletionEmail(
  operatorEmail: string,
  refNumber: string,
  vendorName: string
): Promise<EmailResult> {
  const subject = `Job ${refNumber} – Completed by ${vendorName}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#16a34a;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Job Completed</h2>
        <p>Job <strong>${refNumber}</strong> has been completed by <strong>${vendorName}</strong>.</p>
        <p>You can now review the proof of service packet and approve the work.</p>
        <a href="https://dispatchtogo.com/operator/requests" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Review Proof Packet</a>
      </div>
    </div>`;
  return sendEmail(operatorEmail, subject, html, undefined, { eventKey: "emailJobCompletion" });
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
  return sendEmail(email, subject, html, undefined, { eventKey: "emailWelcome" });
}

// ── Rejection notification helpers ──────────────────────────────────────────

const REJECTION_TYPE_LABELS: Record<string, string> = {
  send_back: "Sent back for rework",
  redispatch: "Re-dispatched to a new vendor",
  dispute: "Escalated to admin",
};

const REJECTION_TYPE_VENDOR_MSGS: Record<string, string> = {
  send_back: "The operator has reviewed your completed work and requires rework. Please log in to review the feedback and update the job.",
  redispatch: "The operator has rejected your completed work and removed your assignment. The job will be re-dispatched to another vendor.",
  dispute: "The operator has escalated this job to an administrator for review. Please stand by for further instructions.",
};

export async function sendVendorRejectionEmail(
  vendorEmail: string,
  vendorCompanyName: string,
  refNumber: string,
  reason: string,
  rejectionType: string,
  property?: { name?: string; address?: string } | null
): Promise<EmailResult> {
  const typeLabel = REJECTION_TYPE_LABELS[rejectionType] ?? "Rejected";
  const message = REJECTION_TYPE_VENDOR_MSGS[rejectionType] ?? "Your completed work has been rejected.";
  const subject = `Work Rejected on Job ${refNumber} – ${typeLabel}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#dc2626;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Work Rejected – ${typeLabel}</h2>
        <p>Hi ${vendorCompanyName},</p>
        <p>${message}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;width:140px">Reference</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${refNumber}</td></tr>
          ${property ? `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Property</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${property.name ?? ""}${property.address ? ` – ${property.address}` : ""}</td></tr>` : ""}
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Outcome</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${typeLabel}</td></tr>
        </table>
        <p style="margin:0 0 8px"><strong>Operator's reason:</strong></p>
        <p style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px;border-radius:0 6px 6px 0">${reason}</p>
        <a href="https://dispatchtogo.com/vendor/jobs" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View Job in App</a>
      </div>
    </div>`;
  return sendEmail(vendorEmail, subject, html, undefined, { eventKey: "emailVendorRejection" });
}

export async function sendAdminRejectionEmail(
  adminEmail: string,
  adminName: string,
  refNumber: string,
  reason: string,
  rejectionType: string,
  vendorName: string
): Promise<EmailResult> {
  const typeLabel = REJECTION_TYPE_LABELS[rejectionType] ?? "Rejected";
  const subject = `Completion Rejected – Job ${refNumber} (${typeLabel})`;
  const isDispute = rejectionType === "dispute";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${isDispute ? "#7c3aed" : "#1e40af"};color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo${isDispute ? " – Dispute" : ""}</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Completion Rejected – ${typeLabel}</h2>
        <p>Hi ${adminName},</p>
        <p>An operator has rejected completed work on job <strong>${refNumber}</strong> assigned to <strong>${vendorName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;width:140px">Reference</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${refNumber}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Vendor</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${vendorName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Outcome</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${typeLabel}</td></tr>
        </table>
        <p style="margin:0 0 8px"><strong>Reason given:</strong></p>
        <p style="background:#f9fafb;padding:12px;border-radius:6px">${reason}</p>
        ${isDispute ? `<p style="color:#7c3aed;font-weight:bold">⚠ This job has been escalated and requires admin mediation.</p>` : ""}
        <a href="https://dispatchtogo.com/admin/dispatch" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View in Admin Panel</a>
      </div>
    </div>`;
  return sendEmail(adminEmail, subject, html, undefined, { eventKey: "emailAdminRejection" });
}
