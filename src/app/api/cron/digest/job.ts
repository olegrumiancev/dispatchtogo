/**
 * Core digest job logic — platform-agnostic.
 *
 * Called from:
 *   - /api/cron/digest/route.ts  (HTTP trigger: Vercel Cron or Dokploy HTTP Cron)
 *   - src/lib/scheduler.ts initInProcessScheduler()  (node-cron, Dokploy Option B)
 */

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getOrCreatePreferences } from "@/lib/user-preferences";
import {
  sendOperatorDailyDigest,
  sendVendorOpenJobsReminder,
  type DigestJobEntry,
  type VendorOpenJob,
} from "@/lib/email";

export async function runDigestJob(): Promise<{ operatorsSent: number; vendorsSent: number }> {
  const settings = await getSettings();

  if (!settings.digestGlobalEnabled) {
    console.log("[digest] Global digest is disabled – skipping.");
    return { operatorsSent: 0, vendorsSent: 0 };
  }

  const [operatorsSent, vendorsSent] = await Promise.all([
    runOperatorDigest(),
    runVendorOpenJobsReminder(),
  ]);

  return { operatorsSent, vendorsSent };
}

// ── Operator daily activity summary ─────────────────────────────────────────

async function runOperatorDigest(): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
  let sent = 0;

  // Find all operator users with digest enabled
  const operatorUsers = await prisma.user.findMany({
    where: { role: "OPERATOR", isApproved: true, isDisabled: false },
    select: {
      id: true,
      email: true,
      organizationId: true,
      notificationPreferences: true,
    },
  });

  // Group by organization to avoid duplicate digests per org
  const orgMap = new Map<string, typeof operatorUsers>();
  for (const u of operatorUsers) {
    if (!u.organizationId) continue;
    const prefs = u.notificationPreferences;
    // Skip users who opted out of digests or email
    if (prefs && (!prefs.digestEnabled || prefs.digestFrequency === "NONE" || prefs.emailOptOut)) {
      continue;
    }
    const list = orgMap.get(u.organizationId) ?? [];
    list.push(u);
    orgMap.set(u.organizationId, list);
  }

  for (const [orgId, users] of orgMap.entries()) {
    // Use the first user's email and token as the primary recipient
    const primaryUser = users[0];
    if (!primaryUser.email) continue;

    // Lazy-create preferences for the token
    const prefs = await getOrCreatePreferences(primaryUser.id);
    if (!prefs.digestEnabled || prefs.digestFrequency === "NONE" || prefs.emailOptOut) {
      continue;
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, contactEmail: true, email: true },
    });
    const recipientEmail = org?.contactEmail || org?.email || primaryUser.email;

    // Fetch requests with activity in the last 24h
    const requests = await prisma.serviceRequest.findMany({
      where: {
        organizationId: orgId,
        updatedAt: { gte: since },
        status: { not: "CANCELLED" },
      },
      include: {
        property: true,
        job: { include: { vendor: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (requests.length === 0) continue; // nothing to report

    const entries: DigestJobEntry[] = requests.map((r) => ({
      refNumber: r.referenceNumber,
      propertyName: (r.property as any)?.name ?? "Unknown",
      category: r.category,
      status: r.status,
      vendorName: (r.job as any)?.vendor?.companyName ?? null,
      isPaused: (r.job as any)?.isPaused ?? false,
    }));

    const result = await sendOperatorDailyDigest(
      recipientEmail,
      org?.name ?? "Your Organization",
      entries,
      prefs.unsubscribeToken
    );

    if (result.success) {
      sent++;
      console.log(`[digest] Operator digest sent to ${recipientEmail} (${orgId})`);
    } else {
      console.error(`[digest] Failed to send operator digest to ${recipientEmail}:`, result.error);
    }
  }

  return sent;
}

// ── Vendor open-jobs reminder ────────────────────────────────────────────────

async function runVendorOpenJobsReminder(): Promise<number> {
  let sent = 0;

  // Find all vendor users with open OFFERED jobs
  const vendorUsers = await prisma.user.findMany({
    where: {
      role: "VENDOR",
      isApproved: true,
      isDisabled: false,
      vendorId: { not: null },
    },
    select: {
      id: true,
      email: true,
      vendorId: true,
      notificationPreferences: true,
    },
  });

  // Deduplicate by vendorId (a vendor may have multiple user accounts)
  const vendorMap = new Map<string, typeof vendorUsers[0]>();
  for (const u of vendorUsers) {
    if (!u.vendorId) continue;
    const prefs = u.notificationPreferences;
    if (prefs && (!prefs.digestEnabled || prefs.digestFrequency === "NONE" || prefs.emailOptOut)) {
      continue;
    }
    if (!vendorMap.has(u.vendorId)) {
      vendorMap.set(u.vendorId, u);
    }
  }

  for (const [vendorId, user] of vendorMap.entries()) {
    const openJobs = await prisma.job.findMany({
      where: {
        vendorId,
        status: "OFFERED",
        acceptedAt: null,
      },
      include: {
        serviceRequest: { include: { property: true } },
      },
    });

    if (openJobs.length === 0) continue; // nothing to remind

    const prefs = await getOrCreatePreferences(user.id);
    if (!prefs.digestEnabled || prefs.digestFrequency === "NONE" || prefs.emailOptOut) {
      continue;
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { companyName: true } });
    const vendorName = vendor?.companyName ?? "Vendor";
    const recipientEmail = user.email;

    const jobEntries: VendorOpenJob[] = openJobs.map((j) => ({
      refNumber: (j.serviceRequest as any).referenceNumber,
      propertyName: (j.serviceRequest as any)?.property?.name ?? "Unknown",
      category: (j.serviceRequest as any).category,
      urgency: (j.serviceRequest as any).urgency,
      jobId: j.id,
    }));

    const result = await sendVendorOpenJobsReminder(
      recipientEmail,
      vendorName,
      jobEntries,
      prefs.unsubscribeToken
    );

    if (result.success) {
      sent++;
      console.log(`[digest] Vendor reminder sent to ${recipientEmail} (${vendorId})`);
    } else {
      console.error(`[digest] Failed to send vendor reminder to ${recipientEmail}:`, result.error);
    }
  }

  return sent;
}
