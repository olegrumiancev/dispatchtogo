import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { isEmailEventEnabled, getBccRecipients } from "@/lib/settings";
import {
  isEmailAllowedForScope,
  type EmailNotificationPreferenceKey,
  type NotificationPreferenceScope,
} from "@/lib/user-preferences";
import type { SystemSettings } from "@prisma/client";
import { renderEmailTemplate } from "@/lib/email-templates";

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
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
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
  options?: {
    eventKey?: keyof SystemSettings;
    preferenceScope?: NotificationPreferenceScope;
    preferenceKey?: EmailNotificationPreferenceKey;
  }
): Promise<EmailResult> {
  // If an event key is provided, check whether this event is enabled
  if (options?.eventKey) {
    const enabled = await isEmailEventEnabled(options.eventKey).catch(() => true);
    if (!enabled) {
      console.log(`[email] Event ${String(options.eventKey)} is disabled – skipping`);
      return { success: false, error: "Event disabled by admin settings" };
    }
  }

  if (options?.preferenceScope) {
    const allowed = await isEmailAllowedForScope(
      options.preferenceScope,
      options.preferenceKey
    ).catch(() => true);
    if (!allowed) {
      console.log(`[email] Recipient preference opted out; skipping ${to}`);
      return { success: false, error: "Recipient opted out of email notifications" };
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
  },
  preferenceScope?: NotificationPreferenceScope
): Promise<EmailResult> {
  const appUrl = details.appUrl || "https://app.dispatchtogo.com";
  const { subject, html } = await renderEmailTemplate("vendorDispatch", {
    vendorCompanyName,
    refNumber: details.refNumber,
    propertyName: details.propertyName,
    category: details.category,
    urgency: details.urgency,
    description: details.description,
    jobsUrl: `${appUrl}/app/vendor/jobs`,
  });
  return sendEmail(vendorEmail, subject, html, undefined, {
    eventKey: "emailVendorDispatch",
    preferenceScope,
    preferenceKey: "emailDispatchEnabled",
  });
}

export async function sendOperatorStatusEmail(
  operatorEmail: string,
  refNumber: string,
  status: string,
  vendorName?: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<EmailResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const { subject, html } = await renderEmailTemplate("operatorStatusUpdate", {
    refNumber,
    status,
    vendorNameSuffix: vendorName ? ` by ${vendorName}` : "",
    requestsUrl: `${appBase}/app/operator/requests`,
  });
  return sendEmail(operatorEmail, subject, html, undefined, {
    eventKey: "emailOperatorStatusUpdate",
    preferenceScope,
    preferenceKey: "emailStatusEnabled",
  });
}

export async function sendJobCompletionEmail(
  operatorEmail: string,
  refNumber: string,
  vendorName: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<EmailResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const { subject, html } = await renderEmailTemplate("jobCompletion", {
    refNumber,
    vendorName,
    requestsUrl: `${appBase}/app/operator/requests`,
  });
  return sendEmail(operatorEmail, subject, html, undefined, {
    eventKey: "emailJobCompletion",
    preferenceScope,
    preferenceKey: "emailCompletionEnabled",
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: string
): Promise<EmailResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const { subject, html } = await renderEmailTemplate("welcome", {
    name,
    role: role.toLowerCase(),
    loginUrl: `${appBase}/app/login`,
  });
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
  property?: { name?: string; address?: string } | null,
  preferenceScope?: NotificationPreferenceScope
): Promise<EmailResult> {
  const typeLabel = REJECTION_TYPE_LABELS[rejectionType] ?? "Rejected";
  const message = REJECTION_TYPE_VENDOR_MSGS[rejectionType] ?? "Your completed work has been rejected.";
  const { subject, html } = await renderEmailTemplate("vendorRejection", {
    vendorCompanyName,
    typeLabel,
    message,
    refNumber,
    propertyRow: property
      ? {
          value: `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Property</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${property.name ?? ""}${property.address ? ` - ${property.address}` : ""}</td></tr>`,
          safe: true,
        }
      : "",
    reason,
    jobsUrl: `${process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com"}/app/vendor/jobs`,
  });
  return sendEmail(vendorEmail, subject, html, undefined, {
    eventKey: "emailVendorRejection",
    preferenceScope,
    preferenceKey: "emailIssueEnabled",
  });
}

export async function sendVendorDeclinedOperatorEmail(
  operatorEmail: string,
  refNumber: string,
  propertyName: string,
  vendorName: string,
  declineReason?: string | null,
  preferenceScope?: NotificationPreferenceScope
): Promise<EmailResult> {
  const { subject, html } = await renderEmailTemplate("vendorDeclinedOperator", {
    vendorName,
    refNumber,
    propertyName,
    reasonBlock: declineReason
      ? {
          value: `<p style="margin:0 0 8px"><strong>Reason given:</strong></p><p style="background:#fef9c3;border-left:4px solid #ca8a04;padding:12px;border-radius:0 6px 6px 0">${declineReason}</p>`,
          safe: true,
        }
      : "",
    requestsUrl: `${process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com"}/app/operator/requests`,
  });
  return sendEmail(operatorEmail, subject, html, undefined, {
    eventKey: "emailOperatorStatusUpdate",
    preferenceScope,
    preferenceKey: "emailIssueEnabled",
  });
}

export async function sendJobCancelledToVendorEmail(
  vendorEmail: string,
  vendorCompanyName: string,
  refNumber: string,
  propertyName: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<EmailResult> {
  const { subject, html } = await renderEmailTemplate("jobCancelledToVendor", {
    vendorCompanyName,
    refNumber,
    propertyName,
    jobsUrl: `${process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com"}/app/vendor/jobs`,
  });
  return sendEmail(vendorEmail, subject, html, undefined, {
    eventKey: "emailVendorDispatch",
    preferenceScope,
    preferenceKey: "emailIssueEnabled",
  });
}

export async function sendWorkVerifiedToVendorEmail(
  vendorEmail: string,
  vendorCompanyName: string,
  refNumber: string,
  propertyName: string,
  preferenceScope?: NotificationPreferenceScope
): Promise<EmailResult> {
  const { subject, html } = await renderEmailTemplate("workVerifiedToVendor", {
    vendorCompanyName,
    refNumber,
    propertyName,
    jobsUrl: `${process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com"}/app/vendor/jobs`,
  });
  return sendEmail(vendorEmail, subject, html, undefined, {
    eventKey: "emailJobCompletion",
    preferenceScope,
    preferenceKey: "emailCompletionEnabled",
  });
}

// ── Digest email templates ───────────────────────────────────────────────────

export interface DigestJobEntry {
  refNumber: string;
  propertyName: string;
  category: string;
  status: string;
  vendorName: string | null;
  isPaused?: boolean;
}

export async function sendOperatorDailyDigest(
  operatorEmail: string,
  orgName: string,
  jobs: DigestJobEntry[],
  unsubscribeToken: string,
  appUrl?: string
): Promise<EmailResult> {
  const base = appUrl || "https://app.dispatchtogo.com";
  const dateLabel = new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });

  const statusBadge = (s: string, paused?: boolean) => {
    if (paused) return `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:12px">PAUSED</span>`;
    const map: Record<string, string> = {
      DISPATCHED: "background:#dbeafe;color:#1e40af",
      ACCEPTED: "background:#ede9fe;color:#5b21b6",
      IN_PROGRESS: "background:#dcfce7;color:#166534",
      COMPLETED: "background:#d1fae5;color:#065f46",
      VERIFIED: "background:#bbf7d0;color:#14532d",
      READY_TO_DISPATCH: "background:#fef9c3;color:#713f12",
    };
    const style = map[s] || "background:#f3f4f6;color:#374151";
    return `<span style="${style};padding:2px 8px;border-radius:12px;font-size:12px">${s.replace(/_/g, " ")}</span>`;
  };

  const rows = jobs.map(j => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px">${j.refNumber}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px">${j.propertyName}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px">${j.category}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px">${j.vendorName ?? "—"}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb">${statusBadge(j.status, j.isPaused)}</td>
    </tr>`).join("");

  const activityBlock = jobs.length === 0
    ? `<p style="color:#6b7280">No job activity in the last 24 hours.</p>`
    : `<table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">REF</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">PROPERTY</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">CATEGORY</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">VENDOR</th>
            <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">STATUS</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  const { subject, html } = await renderEmailTemplate("operatorDailyDigest", {
    dateLabel,
    orgName,
    activityBlock: { value: activityBlock, safe: true },
    requestsUrl: `${base}/app/operator/requests`,
    unsubscribeUrl: `${base}/api/unsubscribe?token=${unsubscribeToken}`,
  });
  return sendEmail(operatorEmail, subject, html);
}

export interface VendorOpenJob {
  refNumber: string;
  propertyName: string;
  category: string;
  urgency: string;
  jobId: string;
}

export async function sendVendorOpenJobsReminder(
  vendorEmail: string,
  vendorName: string,
  openJobs: VendorOpenJob[],
  unsubscribeToken: string,
  appUrl?: string
): Promise<EmailResult> {
  const base = appUrl || "https://app.dispatchtogo.com";
  const count = openJobs.length;
  const pluralSuffix = count === 1 ? "" : "s";

  const rows = openJobs.map(j => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px">${j.refNumber}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px">${j.propertyName}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px">${j.category}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px">${j.urgency}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb">
        <a href="${base}/app/vendor/jobs/${j.jobId}" style="color:#1e40af;font-size:13px">View →</a>
      </td>
    </tr>`).join("");

  const jobsTable = `<table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">REF</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">PROPERTY</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">CATEGORY</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">URGENCY</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb"></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
  const { subject, html } = await renderEmailTemplate("vendorOpenJobsReminder", {
    vendorName,
    count: String(count),
    pluralSuffix,
    jobsTable: { value: jobsTable, safe: true },
    jobsUrl: `${base}/app/vendor/jobs`,
    unsubscribeUrl: `${base}/api/unsubscribe?token=${unsubscribeToken}`,
  });
  return sendEmail(vendorEmail, subject, html);
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
  const isDispute = rejectionType === "dispute";
  const { subject, html } = await renderEmailTemplate("adminRejection", {
    headerTitle: `DispatchToGo${isDispute ? " - Dispute" : ""}`,
    heading: `Completion Rejected - ${typeLabel}`,
    adminName,
    refNumber,
    vendorName,
    typeLabel,
    reason,
    disputeCallout: isDispute
      ? {
          value: `<p style="color:#7c3aed;font-weight:bold">&#9888; This job has been escalated and requires admin mediation.</p>`,
          safe: true,
        }
      : "",
    adminDispatchUrl: `${process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com"}/app/admin/dispatch`,
  });
  return sendEmail(adminEmail, subject, html, undefined, { eventKey: "emailAdminRejection" });
}

export async function sendPaymentFailedEmail(
  to: string,
  orgName: string,
  amountCad: number,
  invoiceUrl: string | null | undefined
): Promise<EmailResult> {
  const appBase = process.env.APP_BASE_URL ?? "https://app.dispatchtogo.com";
  const billingUrl = `${appBase}/app/operator/billing`;
  const { subject, html } = await renderEmailTemplate("paymentFailed", {
    orgName,
    amountCad: amountCad.toFixed(2),
    invoiceLinkBlock: invoiceUrl
      ? { value: `<p><a href="${invoiceUrl}" style="color:#1e40af">View invoice →</a></p>`, safe: true }
      : "",
    billingUrl,
  });
  const text = `Payment failed for your DispatchToGo invoice.\n\nAmount: $${amountCad.toFixed(2)} CAD\n\nPlease update your payment method at: ${billingUrl}`;
  return sendEmail(to, subject, html, text);
}
