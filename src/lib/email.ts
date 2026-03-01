import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "noreply@dispatchtogo.com";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_HOST) return null;
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    tls: { rejectUnauthorized: false },
  });

  return _transporter;
}

export function isEmailConfigured(): boolean {
  return SMTP_HOST.length > 0;
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
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP not configured \u2013 skipping email");
    return { success: false, error: "SMTP not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });
    return { success: true, messageId: info.messageId };
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
