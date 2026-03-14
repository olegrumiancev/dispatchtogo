import { prisma } from "@/lib/prisma";

export const EMAIL_TEMPLATE_KEYS = [
  "verification",
  "passwordReset",
  "newRegistration",
  "accountApproved",
  "accountRejected",
  "emailChangeConfirmNew",
  "emailChangeRequestedOld",
  "emailChangedOld",
  "vendorDispatch",
  "operatorStatusUpdate",
  "jobCompletion",
  "vendorRejection",
  "vendorDeclinedOperator",
  "jobCancelledToVendor",
  "workVerifiedToVendor",
  "credentialExpiry",
  "operatorDailyDigest",
  "vendorOpenJobsReminder",
  "adminRejection",
  "platformInvoiceZero",
  "paymentFailed",
  "welcome",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export interface EmailTemplateValue {
  subject: string;
  html: string;
}

export interface EmailTemplateMeta {
  key: EmailTemplateKey;
  label: string;
  description: string;
  recipient: string;
  variables: string[];
}

export const EMAIL_TEMPLATE_META: EmailTemplateMeta[] = [
  {
    key: "verification",
    label: "Email Verification",
    description: "Sent after signup or resend-verification to confirm the user's email address.",
    recipient: "New user",
    variables: ["{name}", "{verifyUrl}"],
  },
  {
    key: "passwordReset",
    label: "Password Reset",
    description: "Sent when a user requests a password reset.",
    recipient: "Requesting user",
    variables: ["{name}", "{resetUrl}"],
  },
  {
    key: "newRegistration",
    label: "New Registration Awaiting Approval",
    description: "Notifies admins that a verified non-admin account is pending approval.",
    recipient: "Admin",
    variables: [
      "{adminName}",
      "{userName}",
      "{userEmail}",
      "{roleName}",
      "{organizationLabel}",
      "{organizationValue}",
      "{organizationRow}",
      "{reviewUrl}",
    ],
  },
  {
    key: "accountApproved",
    label: "Account Approved",
    description: "Sent when an admin approves an operator or vendor account.",
    recipient: "Approved user",
    variables: ["{name}", "{roleName}", "{loginUrl}"],
  },
  {
    key: "accountRejected",
    label: "Account Rejected",
    description: "Sent when an admin rejects a registration.",
    recipient: "Rejected user",
    variables: ["{name}", "{rejectionNoteBlock}"],
  },
  {
    key: "emailChangeConfirmNew",
    label: "Confirm New Email",
    description: "Sent to the new email address to confirm a requested login-email change.",
    recipient: "New email address",
    variables: ["{name}", "{currentEmail}", "{newEmail}", "{confirmUrl}"],
  },
  {
    key: "emailChangeRequestedOld",
    label: "Email Change Requested",
    description: "Sent to the old email address when a login-email change is requested.",
    recipient: "Current email address",
    variables: ["{name}", "{currentEmail}", "{newEmail}"],
  },
  {
    key: "emailChangedOld",
    label: "Login Email Changed",
    description: "Sent to the previous email address after a login-email change is completed.",
    recipient: "Previous email address",
    variables: ["{name}", "{previousEmail}", "{nextEmail}"],
  },
  {
    key: "vendorDispatch",
    label: "Vendor Job Dispatch",
    description: "Sent to a vendor when a new job is dispatched.",
    recipient: "Vendor",
    variables: ["{vendorCompanyName}", "{refNumber}", "{propertyName}", "{category}", "{urgency}", "{description}", "{jobsUrl}"],
  },
  {
    key: "operatorStatusUpdate",
    label: "Operator Status Update",
    description: "Sent when a job status changes and the operator should be notified.",
    recipient: "Operator",
    variables: ["{refNumber}", "{status}", "{vendorNameSuffix}", "{requestsUrl}"],
  },
  {
    key: "jobCompletion",
    label: "Job Completion",
    description: "Sent when a vendor marks a job complete.",
    recipient: "Operator",
    variables: ["{refNumber}", "{vendorName}", "{requestsUrl}"],
  },
  {
    key: "vendorRejection",
    label: "Vendor Work Rejection",
    description: "Sent when an operator rejects completed vendor work.",
    recipient: "Vendor",
    variables: ["{vendorCompanyName}", "{typeLabel}", "{message}", "{refNumber}", "{propertyRow}", "{reason}", "{jobsUrl}"],
  },
  {
    key: "vendorDeclinedOperator",
    label: "Vendor Declined Job",
    description: "Sent to the operator when a vendor declines a dispatched job.",
    recipient: "Operator",
    variables: ["{vendorName}", "{refNumber}", "{propertyName}", "{reasonBlock}", "{requestsUrl}"],
  },
  {
    key: "jobCancelledToVendor",
    label: "Job Cancelled For Vendor",
    description: "Sent to the vendor when the operator cancels a job.",
    recipient: "Vendor",
    variables: ["{vendorCompanyName}", "{refNumber}", "{propertyName}", "{jobsUrl}"],
  },
  {
    key: "workVerifiedToVendor",
    label: "Work Approved",
    description: "Sent to the vendor when completed work is approved.",
    recipient: "Vendor",
    variables: ["{vendorCompanyName}", "{refNumber}", "{propertyName}", "{jobsUrl}"],
  },
  {
    key: "credentialExpiry",
    label: "Credential Expiry Notice",
    description: "Sent when expired vendor credentials are automatically marked unverified.",
    recipient: "Vendor user",
    variables: ["{recipientName}", "{vendorCompanyName}", "{credentialList}"],
  },
  {
    key: "operatorDailyDigest",
    label: "Operator Daily Digest",
    description: "Daily summary email for operator organizations.",
    recipient: "Operator",
    variables: ["{dateLabel}", "{orgName}", "{activityBlock}", "{requestsUrl}", "{unsubscribeUrl}"],
  },
  {
    key: "vendorOpenJobsReminder",
    label: "Vendor Open Jobs Reminder",
    description: "Reminder email for vendors with pending job offers.",
    recipient: "Vendor",
    variables: ["{vendorName}", "{count}", "{pluralSuffix}", "{jobsTable}", "{jobsUrl}", "{unsubscribeUrl}"],
  },
  {
    key: "adminRejection",
    label: "Admin Rejection Alert",
    description: "Sent to admins when an operator rejects completed work.",
    recipient: "Admin",
    variables: ["{headerTitle}", "{heading}", "{adminName}", "{refNumber}", "{vendorName}", "{typeLabel}", "{reason}", "{disputeCallout}", "{adminDispatchUrl}"],
  },
  {
    key: "platformInvoiceZero",
    label: "Zero-Dollar Invoice Issued",
    description: "Sent when a platform invoice is issued at $0 and marked paid automatically.",
    recipient: "Organization billing contact",
    variables: ["{orgName}", "{periodLabel}", "{invoiceLinkBlock}"],
  },
  {
    key: "paymentFailed",
    label: "Payment Failed",
    description: "Sent when Stripe cannot collect payment for a platform invoice.",
    recipient: "Organization billing contact",
    variables: ["{orgName}", "{amountCad}", "{invoiceLinkBlock}", "{billingUrl}"],
  },
  {
    key: "welcome",
    label: "Welcome Email",
    description: "Sent after account creation to welcome the user.",
    recipient: "New user",
    variables: ["{name}", "{role}", "{loginUrl}"],
  },
];

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateValue> = {
  verification: {
    subject: "Verify Your Email - DispatchToGo",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Welcome to DispatchToGo!</h2>
        <p>Hi {name},</p>
        <p>Thanks for signing up! Please verify your email address to get started:</p>
        <a href="{verifyUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Verify Email Address</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:12px;word-break:break-all">If the button doesn't work: {verifyUrl}</p>
      </div>
    </div>`,
  },
  passwordReset: {
    subject: "Reset Your Password - DispatchToGo",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Reset Your Password</h2>
        <p>Hi {name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new one:</p>
        <a href="{resetUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Reset Password</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:13px">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="color:#6b7280;font-size:12px;word-break:break-all">{resetUrl}</p>
      </div>
    </div>`,
  },
  newRegistration: {
    subject: "New Registration Awaiting Approval - {userName}",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">New Account Pending Approval</h2>
        <p>Hi {adminName},</p>
        <p>A new user has verified their email and is waiting for your approval to access the platform.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;width:140px">Name</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{userName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Email</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{userEmail}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Role</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{roleName}</td></tr>
          {organizationRow}
        </table>
        <a href="{reviewUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Review &amp; Approve</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">The user cannot log in until you approve their account.</p>
      </div>
    </div>`,
  },
  accountApproved: {
    subject: "Your Account Has Been Approved - DispatchToGo",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#16a34a;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Account Approved!</h2>
        <p>Hi {name},</p>
        <p>Great news - your {roleName} account has been approved. You can now sign in and start using DispatchToGo.</p>
        <a href="{loginUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Sign In Now</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">Welcome to the platform!</p>
      </div>
    </div>`,
  },
  accountRejected: {
    subject: "Account Registration Update - DispatchToGo",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Registration Update</h2>
        <p>Hi {name},</p>
        <p>Thank you for your interest in DispatchToGo. Unfortunately, we are unable to approve your account at this time.</p>
        {rejectionNoteBlock}
        <p>If you have questions, please contact us at <a href="mailto:admin@dispatchtogo.com" style="color:#1e40af">admin@dispatchtogo.com</a>.</p>
      </div>
    </div>`,
  },
  emailChangeConfirmNew: {
    subject: "Confirm Your New Email - DispatchToGo",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Confirm your new email</h2>
        <p>Hi {name},</p>
        <p>We received a request to change the login email on your DispatchToGo account from <strong>{currentEmail}</strong> to <strong>{newEmail}</strong>.</p>
        <a href="{confirmUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Confirm New Email</a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">This link expires in 24 hours. If you did not request this change, you can ignore this message.</p>
        <p style="color:#6b7280;font-size:12px;word-break:break-all">If the button doesn't work: {confirmUrl}</p>
      </div>
    </div>`,
  },
  emailChangeRequestedOld: {
    subject: "Email Change Requested - DispatchToGo",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Email change requested</h2>
        <p>Hi {name},</p>
        <p>A request was made to change the login email on your account from <strong>{currentEmail}</strong> to <strong>{newEmail}</strong>.</p>
        <p>If this was you, complete the change using the confirmation email sent to the new address.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">If you did not request this change, you can ignore this message and your login email will stay the same.</p>
      </div>
    </div>`,
  },
  emailChangedOld: {
    subject: "Your Login Email Was Changed - DispatchToGo",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Login email updated</h2>
        <p>Hi {name},</p>
        <p>Your DispatchToGo login email has been changed from <strong>{previousEmail}</strong> to <strong>{nextEmail}</strong>.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">If you did not authorize this change, contact support immediately.</p>
      </div>
    </div>`,
  },
  vendorDispatch: {
    subject: "New Job Dispatched - {refNumber}",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">New Job Dispatched</h2>
        <p>Hi {vendorCompanyName},</p>
        <p>A new job has been dispatched to you:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;width:140px">Reference</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{refNumber}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Property</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{propertyName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Category</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{category}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Urgency</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{urgency}</td></tr>
        </table>
        <p style="margin:0 0 8px"><strong>Description:</strong></p>
        <p style="background:#f9fafb;padding:12px;border-radius:6px">{description}</p>
        <a href="{jobsUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View &amp; Accept Job</a>
      </div>
    </div>`,
  },
  operatorStatusUpdate: {
    subject: "Job {refNumber} - Status: {status}",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Job Status Update</h2>
        <p>Job <strong>{refNumber}</strong> has been updated to <strong>{status}</strong>{vendorNameSuffix}.</p>
        <a href="{requestsUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View Details</a>
      </div>
    </div>`,
  },
  jobCompletion: {
    subject: "Job {refNumber} - Completed by {vendorName}",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#16a34a;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Job Completed</h2>
        <p>Job <strong>{refNumber}</strong> has been completed by <strong>{vendorName}</strong>.</p>
        <p>You can now review the proof of service packet and approve the work.</p>
        <a href="{requestsUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Review Proof Packet</a>
      </div>
    </div>`,
  },
  vendorRejection: {
    subject: "Work Rejected on Job {refNumber} - {typeLabel}",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#dc2626;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Work Rejected - {typeLabel}</h2>
        <p>Hi {vendorCompanyName},</p>
        <p>{message}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;width:140px">Reference</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{refNumber}</td></tr>
          {propertyRow}
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Outcome</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{typeLabel}</td></tr>
        </table>
        <p style="margin:0 0 8px"><strong>Operator's reason:</strong></p>
        <p style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px;border-radius:0 6px 6px 0">{reason}</p>
        <a href="{jobsUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View Job in App</a>
      </div>
    </div>`,
  },
  vendorDeclinedOperator: {
    subject: "Vendor Declined - Job {refNumber} Needs Re-Dispatch",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#d97706;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Vendor Declined - Re-Dispatch Required</h2>
        <p><strong>{vendorName}</strong> has declined job <strong>{refNumber}</strong> at <strong>{propertyName}</strong>.</p>
        <p>This job is now back in the dispatch queue and requires assignment to another vendor.</p>
        {reasonBlock}
        <a href="{requestsUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View Request</a>
      </div>
    </div>`,
  },
  jobCancelledToVendor: {
    subject: "Job Cancelled - {refNumber}",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#6b7280;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Job Cancelled</h2>
        <p>Hi {vendorCompanyName},</p>
        <p>Job <strong>{refNumber}</strong> at <strong>{propertyName}</strong> has been cancelled by the operator. No further action is required on your part.</p>
        <a href="{jobsUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View My Jobs</a>
      </div>
    </div>`,
  },
  workVerifiedToVendor: {
    subject: "Work Approved - Job {refNumber}",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#16a34a;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Work Approved ✓</h2>
        <p>Hi {vendorCompanyName},</p>
        <p>Your work on job <strong>{refNumber}</strong> at <strong>{propertyName}</strong> has been reviewed and approved by the operator.</p>
        <p style="color:#16a34a;font-weight:bold">Great work - the job is now fully verified.</p>
        <a href="{jobsUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View My Jobs</a>
      </div>
    </div>`,
  },
  credentialExpiry: {
    subject: "Action Required: Expired Credential(s) - {vendorCompanyName}",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#dc2626">Credential Expiry Notice</h2>
      <p>Hi {recipientName},</p>
      <p>The following credential(s) on your <strong>{vendorCompanyName}</strong> profile have expired and have been automatically marked as <strong>unverified</strong>:</p>
      <ul style="margin:12px 0;padding-left:20px">{credentialList}</ul>
      <p>Please upload renewed documentation and contact support to have your credentials re-verified.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">- DispatchToGo</p>
    </div>`,
  },
  operatorDailyDigest: {
    subject: "Daily Activity Summary - {dateLabel}",
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo - Daily Summary</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="margin:0 0 4px;color:#6b7280;font-size:13px">{orgName}</p>
        <h2 style="margin:0 0 20px;font-size:18px">Activity in the last 24 hours</h2>
        {activityBlock}
        <a href="{requestsUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0 12px">View All Requests</a>
        <p style="color:#9ca3af;font-size:11px;margin:8px 0 0">You're receiving this because daily digest emails are enabled for your account.
          <a href="{unsubscribeUrl}" style="color:#9ca3af">Unsubscribe</a></p>
      </div>
    </div>`,
  },
  vendorOpenJobsReminder: {
    subject: "You have {count} pending job offer{pluralSuffix} - DispatchToGo",
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo - Open Jobs</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 8px;font-size:18px">Hi {vendorName},</h2>
        <p>You have <strong>{count} pending job offer{pluralSuffix}</strong> waiting for your response:</p>
        {jobsTable}
        <a href="{jobsUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:20px 0 12px">View &amp; Accept Jobs</a>
        <p style="color:#9ca3af;font-size:11px;margin:8px 0 0">You're receiving this reminder because daily digest emails are enabled for your account.
          <a href="{unsubscribeUrl}" style="color:#9ca3af">Unsubscribe</a></p>
      </div>
    </div>`,
  },
  adminRejection: {
    subject: "Completion Rejected - Job {refNumber} ({typeLabel})",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">{headerTitle}</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">{heading}</h2>
        <p>Hi {adminName},</p>
        <p>An operator has rejected completed work on job <strong>{refNumber}</strong> assigned to <strong>{vendorName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;width:140px">Reference</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{refNumber}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Vendor</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{vendorName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Outcome</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{typeLabel}</td></tr>
        </table>
        <p style="margin:0 0 8px"><strong>Reason given:</strong></p>
        <p style="background:#f9fafb;padding:12px;border-radius:6px">{reason}</p>
        {disputeCallout}
        <a href="{adminDispatchUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">View in Admin Panel</a>
      </div>
    </div>`,
  },
  platformInvoiceZero: {
    subject: "DispatchToGo - Platform invoice for {periodLabel} ($0.00 CAD)",
    html: `<p>Hi {orgName},</p>
<p>Your DispatchToGo platform invoice for <strong>{periodLabel}</strong> has been issued.</p>
<p><strong>Amount due: $0.00 CAD</strong><br/>
You had no billable requests this period - this invoice has been automatically marked as paid.</p>
{invoiceLinkBlock}
<p>Thank you,<br/>The DispatchToGo Team</p>`,
  },
  paymentFailed: {
    subject: "Payment failed for your DispatchToGo invoice",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#dc2626;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo - Payment Failed</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px;color:#dc2626">We couldn't collect your payment</h2>
        <p>Hi {orgName},</p>
        <p>We were unable to process your DispatchToGo platform invoice for
          <strong>{amountCad} CAD</strong>.
          Your service will continue uninterrupted, but please update your payment method
          as soon as possible to avoid any disruption.</p>
        {invoiceLinkBlock}
        <a href="{billingUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">
          Update Payment Method
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">
          If you believe this is an error, please contact
          <a href="mailto:support@dispatchtogo.com" style="color:#1e40af">support@dispatchtogo.com</a>.
        </p>
      </div>
    </div>`,
  },
  welcome: {
    subject: "Welcome to DispatchToGo",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="margin:0 0 16px">Welcome, {name}!</h2>
        <p>Your {role} account has been created on DispatchToGo.</p>
        <p>DispatchToGo is a managed vendor dispatch platform for tourism and hospitality operators in Cornwall &amp; SDG, Ontario.</p>
        <a href="{loginUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Log In</a>
      </div>
    </div>`,
  },
};

type TemplateVarValue = string | { value: string; safe?: boolean } | null | undefined;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeVar(value: TemplateVarValue): string {
  if (value == null) return "";
  if (typeof value === "string") return escapeHtml(value);
  return value.safe ? value.value : escapeHtml(value.value);
}

export function renderEmailStringTemplate(
  template: string,
  vars: Record<string, TemplateVarValue>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) {
      return `{${key}}`;
    }
    return normalizeVar(vars[key]);
  });
}

function isEmailTemplateValue(value: unknown): value is EmailTemplateValue {
  return !!value && typeof value === "object" && typeof (value as any).subject === "string" && typeof (value as any).html === "string";
}

export async function getEmailTemplates(): Promise<Record<EmailTemplateKey, EmailTemplateValue>> {
  try {
    const row = await (prisma.systemSettings.findUnique as any)({
      where: { id: "singleton" },
      select: { emailTemplates: true },
    });
    const dbTemplates =
      row && typeof row.emailTemplates === "object" && row.emailTemplates !== null
        ? (row.emailTemplates as Record<string, unknown>)
        : {};

    const merged = { ...DEFAULT_EMAIL_TEMPLATES } as Record<EmailTemplateKey, EmailTemplateValue>;
    for (const key of EMAIL_TEMPLATE_KEYS) {
      const candidate = dbTemplates[key];
      if (isEmailTemplateValue(candidate)) {
        merged[key] = candidate;
      }
    }
    return merged;
  } catch {
    return { ...DEFAULT_EMAIL_TEMPLATES };
  }
}

export async function renderEmailTemplate(
  key: EmailTemplateKey,
  vars: Record<string, TemplateVarValue>
): Promise<EmailTemplateValue> {
  const templates = await getEmailTemplates();
  const template = templates[key];
  return {
    subject: renderEmailStringTemplate(template.subject, vars),
    html: renderEmailStringTemplate(template.html, vars),
  };
}