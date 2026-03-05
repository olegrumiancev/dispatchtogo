import { prisma } from "@/lib/prisma";
import type { SystemSettings } from "@prisma/client";

/**
 * Return the singleton SystemSettings row, creating it with defaults if it
 * doesn't exist yet. Safe to call from any server context.
 */
export async function getSettings(): Promise<SystemSettings> {
  const row = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
  });
  if (row) return row;

  // First-time: upsert so concurrent callers don't race
  return prisma.systemSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

/**
 * Check whether a specific email event is enabled.
 * Accepts the Prisma column name (e.g. "emailVendorDispatch").
 */
export async function isEmailEventEnabled(
  key: keyof SystemSettings
): Promise<boolean> {
  const settings = await getSettings();
  return settings[key] === true;
}

/**
 * Return the BCC address list (as an array) if BCC is enabled, otherwise [].
 */
export async function getBccRecipients(): Promise<string[]> {
  const settings = await getSettings();
  if (!settings.bccEnabled || !settings.bccAddresses.trim()) return [];
  return settings.bccAddresses
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}
