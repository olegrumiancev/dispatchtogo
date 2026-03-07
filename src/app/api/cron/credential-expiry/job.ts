/**
 * Credential expiry invalidation job.
 *
 * Finds all VendorCredentials where:
 *   - expiresAt is in the past
 *   - verified is still true
 *
 * Sets verified = false, clears verifiedAt / verifiedByUserId, and sends an
 * email notification to all vendor users for that vendor.
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";

const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  TRADE_LICENSE: "Trade License",
  WSIB: "WSIB",
  INSURANCE_COI: "Insurance / COI",
  BUSINESS_LICENSE: "Business License",
  OTHER: "Other",
};

function labelFor(type: string) {
  return CREDENTIAL_TYPE_LABELS[type] ?? type;
}

export async function runCredentialExpiryJob(): Promise<{ invalidated: number }> {
  const now = new Date();

  // Find expired-but-still-verified credentials
  const expired = await prisma.vendorCredential.findMany({
    where: {
      verified: true,
      expiresAt: { lt: now },
    },
    include: {
      vendor: {
        select: {
          id: true,
          companyName: true,
          user: {
            where: { isDisabled: false },
            select: { email: true, name: true },
          },
        },
      },
    },
  });

  if (expired.length === 0) return { invalidated: 0 };

  // Bulk-update all expired credentials in one transaction
  const ids = expired.map((c) => c.id);
  await prisma.vendorCredential.updateMany({
    where: { id: { in: ids } },
    data: {
      verified: false,
      verifiedAt: null,
      verifiedByUserId: null,
    },
  });

  // Send notifications — one email per vendor (group by vendorId)
  if (NOTIFICATION_SETTINGS.emailEnabled) {
    const byVendor = new Map<string, typeof expired>();
    for (const cred of expired) {
      const list = byVendor.get(cred.vendorId) ?? [];
      list.push(cred);
      byVendor.set(cred.vendorId, list);
    }

    for (const [, creds] of byVendor.entries()) {
      const vendor = creds[0].vendor;
      const credList = creds
        .map(
          (c) =>
            `<li><strong>${labelFor(c.type)}</strong> — ${c.credentialNumber} (expired ${c.expiresAt!.toLocaleDateString("en-CA")})</li>`
        )
        .join("");

      for (const user of vendor.user) {
        if (!user.email) continue;
        sendEmail(
          user.email,
          `Action Required: Expired Credential(s) — ${vendor.companyName}`,
          `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">Credential Expiry Notice</h2>
            <p>Hi${user.name ? ` ${user.name}` : ""},</p>
            <p>The following credential(s) on your <strong>${vendor.companyName}</strong> profile have expired and have been automatically marked as <strong>unverified</strong>:</p>
            <ul style="margin:12px 0;padding-left:20px">${credList}</ul>
            <p>Please upload renewed documentation and contact support to have your credentials re-verified.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">— DispatchToGo</p>
          </div>`
        ).catch(() => {/* swallow — do not fail the job */});
      }
    }
  }

  return { invalidated: ids.length };
}
