/**
 * SMS Template management for DispatchToGo.
 *
 * Templates are stored in SystemSettings.smsTemplates (a JSON field).
 * Each template is a string with {variable} placeholders.
 * If a template is not customised in DB, the built-in default is used.
 *
 * Adding a new notification? Define its key + default here and call
 * renderSmsTemplate() from your new send function in sms.ts.
 */

import { prisma } from "@/lib/prisma";

// ── Template keys ────────────────────────────────────────────────────────────

export const SMS_TEMPLATE_KEYS = [
  "vendorDispatch",
  "operatorStatusUpdate",
  "jobCompletion",
  "vendorRejection",
  "vendorEnroute",
  "workPaused",
  "workResumed",
  "jobDeclined",
  "jobCancelledToVendor",
] as const;

export type SmsTemplateKey = (typeof SMS_TEMPLATE_KEYS)[number];

// ── Human-readable metadata for the admin UI ────────────────────────────────

export interface SmsTemplateMeta {
  key: SmsTemplateKey;
  label: string;
  description: string;
  recipient: string;
  variables: string[];
}

export const SMS_TEMPLATE_META: SmsTemplateMeta[] = [
  {
    key: "vendorDispatch",
    label: "Vendor Job Dispatch",
    description: "Sent to the vendor when a new job is dispatched to them.",
    recipient: "Vendor",
    variables: [
      "{vendorCompanyName}",
      "{refNumber}",
      "{propertyName}",
      "{category}",
      "{urgency}",
      "{description}",
      "{appBase}",
    ],
  },
  {
    key: "operatorStatusUpdate",
    label: "Operator Status Update",
    description: "Sent to the operator when a vendor updates a job status.",
    recipient: "Operator",
    variables: ["{refNumber}", "{status}", "{vendorName} (includes ' by ' prefix, empty if unknown)"],
  },
  {
    key: "jobCompletion",
    label: "Job Completion",
    description: "Sent to the operator when a vendor marks a job complete.",
    recipient: "Operator",
    variables: ["{refNumber}", "{vendorName}", "{appBase}"],
  },
  {
    key: "vendorRejection",
    label: "Vendor Work Rejection",
    description: "Sent to the vendor when an operator rejects their work.",
    recipient: "Vendor",
    variables: ["{refNumber}", "{rejectionLabel}", "{reason}", "{appBase}"],
  },
  {
    key: "vendorEnroute",
    label: "Vendor En Route",
    description: "Sent to the operator when a vendor is heading to the property.",
    recipient: "Operator",
    variables: ["{vendorName}", "{propertyName}", "{refNumber}"],
  },
  {
    key: "workPaused",
    label: "Work Paused",
    description: "Sent to the operator when a vendor pauses work.",
    recipient: "Operator",
    variables: ["{propertyName}", "{refNumber}", "{reason}", "{eta}", "{appBase}"],
  },
  {
    key: "workResumed",
    label: "Work Resumed",
    description: "Sent to the operator when a vendor resumes paused work.",
    recipient: "Operator",
    variables: ["{propertyName}", "{refNumber}"],
  },
  {
    key: "jobDeclined",
    label: "Job Declined by Vendor",
    description: "Sent to the operator when a vendor declines a dispatched job.",
    recipient: "Operator",
    variables: ["{vendorName}", "{refNumber}", "{propertyName}", "{appBase}"],
  },
  {
    key: "jobCancelledToVendor",
    label: "Job Cancelled (Vendor Notice)",
    description: "Sent to the vendor when an operator cancels a job.",
    recipient: "Vendor",
    variables: ["{refNumber}", "{propertyName}"],
  },
];

// ── Built-in default templates ───────────────────────────────────────────────

export const DEFAULT_SMS_TEMPLATES: Record<SmsTemplateKey, string> = {
  vendorDispatch: [
    "DispatchToGo: New job dispatched to {vendorCompanyName}.",
    "Ref: {refNumber}",
    "Property: {propertyName}",
    "Category: {category} | Urgency: {urgency}",
    "{description}",
    "Accept or decline: {appBase}/app/vendor/jobs",
  ].join("\n"),

  operatorStatusUpdate:
    "DispatchToGo: Job {refNumber} status updated to {status}{vendorName}.",

  jobCompletion:
    "DispatchToGo: Job {refNumber} has been completed by {vendorName}. Review the proof packet: {appBase}/app/operator/requests",

  vendorRejection: [
    "DispatchToGo: Work on job {refNumber} has been {rejectionLabel}.",
    "Reason: {reason}",
    "View details: {appBase}/app/vendor/jobs",
  ].join("\n"),

  vendorEnroute:
    "DispatchToGo: Your vendor ({vendorName}) is on the way to {propertyName}. Ref: {refNumber}.",

  workPaused:
    "DispatchToGo: Work has been paused at {propertyName} (Ref: {refNumber}).{reason}{eta} View details: {appBase}/app/operator/requests",

  workResumed:
    "DispatchToGo: Work has resumed at {propertyName} (Ref: {refNumber}).",

  jobDeclined:
    "DispatchToGo: Vendor {vendorName} declined job {refNumber} at {propertyName}. Re-dispatch required: {appBase}/app/operator/requests",

  jobCancelledToVendor:
    "DispatchToGo: Job {refNumber} at {propertyName} has been cancelled by the operator. No further action is required.",
};

// ── Interpolation ────────────────────────────────────────────────────────────

/**
 * Replace {variable} placeholders in a template with the provided values.
 * Unknown placeholders are left as-is.
 */
export function renderSmsTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{${key}}`
  );
}

// ── DB helpers ───────────────────────────────────────────────────────────────

/**
 * Fetch all SMS templates from DB, merged with built-in defaults.
 * DB values override defaults; missing keys use defaults.
 */
export async function getSmsTemplates(): Promise<
  Record<SmsTemplateKey, string>
> {
  try {
    // Use `select` with type casting to handle pre-migration environments
    // gracefully. After running `prisma migrate dev`, the field will be typed.
    const row = await (prisma.systemSettings.findUnique as any)({
      where: { id: "singleton" },
      select: { smsTemplates: true },
    });
    const dbTemplates =
      row && typeof row.smsTemplates === "object" && row.smsTemplates !== null
        ? (row.smsTemplates as Record<string, string>)
        : {};
    return { ...DEFAULT_SMS_TEMPLATES, ...dbTemplates } as Record<
      SmsTemplateKey,
      string
    >;
  } catch {
    return { ...DEFAULT_SMS_TEMPLATES };
  }
}

/**
 * Render a single SMS template by key, fetching the customised value from DB
 * and falling back to the built-in default.
 */
export async function renderTemplate(
  key: SmsTemplateKey,
  vars: Record<string, string>
): Promise<string> {
  const templates = await getSmsTemplates();
  return renderSmsTemplate(templates[key], vars);
}
