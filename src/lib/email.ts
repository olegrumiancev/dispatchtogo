import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "DispatchToGo <noreply@dispatchtogo.ca>";

// ─── Helpers ────────────────────────────────────────────────────────────────

function wrap(body: string, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 32px 16px; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.08); max-width: 520px; margin: 0 auto; padding: 32px; }
    h2 { color: #111827; font-size: 20px; margin: 0 0 12px; }
    p { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 12px; }
    .label { color: #6b7280; font-size: 13px; margin-bottom: 2px; }
    .value { color: #111827; font-size: 15px; font-weight: 500; margin-bottom: 12px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .btn { display: inline-block; padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; margin-top: 16px; }
    .btn-blue { background: #2563eb; color: #fff; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    .footer { color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    ${body}
    <hr class="divider">
    <p class="footer">DispatchToGo &mdash; Maintenance made simple</p>
  </div>
</body>
</html>`;
}

// ─── New Request → Operator ──────────────────────────────────────────────────

export async function sendNewRequestEmail(params: {
  to: string;
  referenceNumber: string;
  propertyName: string;
  category: string;
  urgency: string;
  description: string;
  requestUrl: string;
}) {
  const html = wrap(
    `
    <h2>New Service Request</h2>
    <p>A new request has been submitted for your review.</p>
    <div class="label">Reference</div>
    <div class="value">${params.referenceNumber}</div>
    <div class="label">Property</div>
    <div class="value">${params.propertyName}</div>
    <div class="label">Category</div>
    <div class="value">${params.category}</div>
    <div class="label">Urgency</div>
    <div class="value"><span class="badge badge-amber">${params.urgency}</span></div>
    <div class="label">Description</div>
    <div class="value">${params.description}</div>
    <a href="${params.requestUrl}" class="btn btn-blue">View Request</a>
  `,
    "New Service Request"
  );

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `[DispatchToGo] New Request: ${params.referenceNumber}`,
    html,
  });
}

// ─── Dispatched → Vendor ─────────────────────────────────────────────────────

export async function sendDispatchedToVendorEmail(params: {
  to: string;
  vendorName: string;
  referenceNumber: string;
  propertyName: string;
  category: string;
  urgency: string;
  description: string;
  jobUrl: string;
}) {
  const html = wrap(
    `
    <h2>New Job Available</h2>
    <p>Hi ${params.vendorName}, a new job has been dispatched to you.</p>
    <div class="label">Reference</div>
    <div class="value">${params.referenceNumber}</div>
    <div class="label">Property</div>
    <div class="value">${params.propertyName}</div>
    <div class="label">Category</div>
    <div class="value">${params.category}</div>
    <div class="label">Urgency</div>
    <div class="value"><span class="badge badge-amber">${params.urgency}</span></div>
    <div class="label">Description</div>
    <div class="value">${params.description}</div>
    <a href="${params.jobUrl}" class="btn btn-blue">View Job</a>
  `,
    "New Job Available"
  );

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `[DispatchToGo] New Job: ${params.referenceNumber}`,
    html,
  });
}

// ─── Job Accepted → Operator ─────────────────────────────────────────────────

export async function sendJobAcceptedEmail(params: {
  to: string;
  referenceNumber: string;
  vendorName: string;
  requestUrl: string;
}) {
  const html = wrap(
    `
    <h2>Job Accepted</h2>
    <p>Your service request <strong>${params.referenceNumber}</strong> has been accepted by <strong>${params.vendorName}</strong>.</p>
    <a href="${params.requestUrl}" class="btn btn-blue">View Request</a>
  `,
    "Job Accepted"
  );

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `[DispatchToGo] Job Accepted: ${params.referenceNumber}`,
    html,
  });
}

// ─── Job Completed → Operator ─────────────────────────────────────────────────

export async function sendJobCompletedEmail(params: {
  to: string;
  referenceNumber: string;
  vendorName: string;
  notes: string;
  requestUrl: string;
}) {
  const html = wrap(
    `
    <h2>Job Completed</h2>
    <p>Your service request <strong>${params.referenceNumber}</strong> has been completed by <strong>${params.vendorName}</strong>.</p>
    ${params.notes ? `<div class="label">Completion Notes</div><div class="value">${params.notes}</div>` : ""}
    <a href="${params.requestUrl}" class="btn btn-blue">Review & Approve</a>
  `,
    "Job Completed"
  );

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `[DispatchToGo] Job Completed: ${params.referenceNumber}`,
    html,
  });
}

// ─── Job Rejected → Vendor ───────────────────────────────────────────────────

export async function sendJobRejectedEmail(params: {
  to: string;
  vendorName: string;
  referenceNumber: string;
  reason: string;
  jobUrl: string;
}) {
  const html = wrap(
    `
    <h2>Work Returned for Rework</h2>
    <p>Hi ${params.vendorName}, the operator has reviewed your work on <strong>${params.referenceNumber}</strong> and sent it back for rework.</p>
    <div class="label">Reason</div>
    <div class="value">${params.reason}</div>
    <a href="${params.jobUrl}" class="btn btn-blue">View Job</a>
  `,
    "Work Returned for Rework"
  );

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `[DispatchToGo] Rework Required: ${params.referenceNumber}`,
    html,
  });
}

// ─── Job Declined → Operator ─────────────────────────────────────────────────

export async function sendJobDeclinedEmail(params: {
  to: string;
  referenceNumber: string;
  vendorName: string;
  requestUrl: string;
}) {
  const html = wrap(
    `
    <h2>Job Declined by Vendor</h2>
    <p>The vendor <strong>${params.vendorName}</strong> has declined job <strong>${params.referenceNumber}</strong>. You may need to reassign this request.</p>
    <a href="${params.requestUrl}" class="btn btn-blue">View Request</a>
  `,
    "Job Declined"
  );

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `[DispatchToGo] Job Declined: ${params.referenceNumber}`,
    html,
  });
}

// ─── Pause Requested → Operator ──────────────────────────────────────────────

export async function sendPauseRequestedEmail(params: {
  to: string;
  referenceNumber: string;
  vendorName: string;
  reason: string;
  estimatedReturnDate?: string;
  requestUrl: string;
}) {
  const html = wrap(
    `
    <h2>Pause Requested</h2>
    <p>The vendor <strong>${params.vendorName}</strong> has requested a pause on job <strong>${params.referenceNumber}</strong>.</p>
    <div class="label">Reason</div>
    <div class="value">${params.reason}</div>
    ${params.estimatedReturnDate ? `<div class="label">Expected Return</div><div class="value">${params.estimatedReturnDate}</div>` : ""}
    <a href="${params.requestUrl}" class="btn btn-blue">View Request</a>
  `,
    "Pause Requested"
  );

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `[DispatchToGo] Pause Requested: ${params.referenceNumber}`,
    html,
  });
}

// ─── Vendor invite ─────────────────────────────────────────────────────────

export async function sendVendorInviteEmail(params: {
  to: string;
  vendorName: string;
  inviterName: string;
  inviteUrl: string;
}) {
  const html = wrap(
    `
    <h2>You've been invited to DispatchToGo</h2>
    <p>Hi ${params.vendorName}, <strong>${params.inviterName}</strong> has added you as a vendor in DispatchToGo.</p>
    <p>Create your account to start receiving and managing service jobs.</p>
    <a href="${params.inviteUrl}" class="btn btn-blue">Accept Invitation</a>
  `,
    "Vendor Invitation"
  );

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `[DispatchToGo] You've been invited`,
    html,
  });
}
