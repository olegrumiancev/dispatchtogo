import { prisma } from "@/lib/prisma";
import type { UserNotificationPreferences } from "@prisma/client";

export type NotificationPreferenceScope =
  | { userId: string }
  | { organizationId: string }
  | { vendorId: string };

export const EMAIL_NOTIFICATION_PREFERENCE_KEYS = [
  "emailDispatchEnabled",
  "emailStatusEnabled",
  "emailCompletionEnabled",
  "emailIssueEnabled",
] as const;

export const SMS_NOTIFICATION_PREFERENCE_KEYS = [
  "smsDispatchEnabled",
  "smsStatusEnabled",
  "smsCompletionEnabled",
  "smsIssueEnabled",
] as const;

export type EmailNotificationPreferenceKey =
  (typeof EMAIL_NOTIFICATION_PREFERENCE_KEYS)[number];
export type SmsNotificationPreferenceKey =
  (typeof SMS_NOTIFICATION_PREFERENCE_KEYS)[number];

const PREFERENCE_SELECT = {
  smsOptOut: true,
  emailOptOut: true,
  emailDispatchEnabled: true,
  emailStatusEnabled: true,
  emailCompletionEnabled: true,
  emailIssueEnabled: true,
  smsDispatchEnabled: true,
  smsStatusEnabled: true,
  smsCompletionEnabled: true,
  smsIssueEnabled: true,
} as const;

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
      | "digestEnabled"
      | "digestFrequency"
      | "smsOptOut"
      | "emailOptOut"
      | EmailNotificationPreferenceKey
      | SmsNotificationPreferenceKey
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

async function getScopedUsers(scope: NotificationPreferenceScope) {
  if ("userId" in scope) {
    return prisma.user.findMany({
      where: { id: scope.userId },
      select: {
        id: true,
        notificationPreferences: {
          select: PREFERENCE_SELECT,
        },
      },
    });
  }

  if ("organizationId" in scope) {
    return prisma.user.findMany({
      where: {
        organizationId: scope.organizationId,
        role: "OPERATOR",
        isApproved: true,
        isDisabled: false,
      },
      select: {
        id: true,
        notificationPreferences: {
          select: PREFERENCE_SELECT,
        },
      },
    });
  }

  return prisma.user.findMany({
    where: {
      vendorId: scope.vendorId,
      role: "VENDOR",
      isApproved: true,
      isDisabled: false,
    },
    select: {
      id: true,
      notificationPreferences: {
        select: PREFERENCE_SELECT,
      },
    },
  });
}

export async function isEmailAllowedForScope(
  scope: NotificationPreferenceScope,
  key?: EmailNotificationPreferenceKey
): Promise<boolean> {
  const users = await getScopedUsers(scope);
  if (users.length === 0) return true;

  return users.some((user) => {
    const prefs = user.notificationPreferences;
    if (prefs?.emailOptOut) return false;
    return key ? (prefs?.[key] ?? true) : true;
  });
}

export async function isSmsAllowedForScope(
  scope: NotificationPreferenceScope,
  key?: SmsNotificationPreferenceKey
): Promise<boolean> {
  const users = await getScopedUsers(scope);
  if (users.length === 0) return true;

  return users.some((user) => {
    const prefs = user.notificationPreferences;
    if (prefs?.smsOptOut) return false;
    return key ? (prefs?.[key] ?? true) : true;
  });
}
