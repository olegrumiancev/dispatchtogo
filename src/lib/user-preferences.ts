import { prisma } from "@/lib/prisma";
import type { UserNotificationPreferences } from "@prisma/client";

/**
 * Return the notification preferences for a user, creating them with safe
 * defaults if they don't exist yet. Safe to call from any server context.
 *
 * Defaults:
 *   digestEnabled   = true   (daily digest on by default)
 *   digestFrequency = DAILY
 *   smsOptOut       = false  (SMS on by default)
 *   emailOptOut     = false  (email on by default)
 *   unsubscribeToken = auto-generated cuid (for one-click unsubscribe links)
 */
export async function getOrCreatePreferences(
  userId: string
): Promise<UserNotificationPreferences> {
  const existing = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  return prisma.userNotificationPreferences.create({
    data: { userId },
  });
}

/**
 * Update specific preference fields for a user.
 * Creates the row with defaults first if it doesn't exist.
 */
export async function updatePreferences(
  userId: string,
  data: Partial<
    Pick<
      UserNotificationPreferences,
      "digestEnabled" | "digestFrequency" | "smsOptOut" | "emailOptOut"
    >
  >
): Promise<UserNotificationPreferences> {
  return prisma.userNotificationPreferences.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

/**
 * Check whether a user has opted out of SMS notifications.
 * Returns false (i.e. SMS allowed) if no preference row exists yet.
 */
export async function isSmsOptedOut(userId: string): Promise<boolean> {
  const prefs = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
    select: { smsOptOut: true },
  });
  return prefs?.smsOptOut ?? false;
}

/**
 * Check whether a user has opted out of email notifications.
 * Returns false (i.e. email allowed) if no preference row exists yet.
 */
export async function isEmailOptedOut(userId: string): Promise<boolean> {
  const prefs = await prisma.userNotificationPreferences.findUnique({
    where: { userId },
    select: { emailOptOut: true },
  });
  return prefs?.emailOptOut ?? false;
}
