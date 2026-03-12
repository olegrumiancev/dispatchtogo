import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const AUDIT_ENTITY_TYPES = {
  USER: "USER",
  ORGANIZATION: "ORGANIZATION",
  VENDOR: "VENDOR",
  SERVICE_REQUEST: "SERVICE_REQUEST",
  JOB: "JOB",
  VENDOR_CREDENTIAL: "VENDOR_CREDENTIAL",
  SYSTEM: "SYSTEM",
} as const;

export const AUDIT_ACTIONS = {
  ACCOUNT_NAME_UPDATED: "ACCOUNT_NAME_UPDATED",
  ACCOUNT_EMAIL_CHANGE_REQUESTED: "ACCOUNT_EMAIL_CHANGE_REQUESTED",
  ACCOUNT_EMAIL_CHANGED: "ACCOUNT_EMAIL_CHANGED",
  ACCOUNT_PASSWORD_CHANGED: "ACCOUNT_PASSWORD_CHANGED",
  USER_APPROVED: "USER_APPROVED",
  USER_REJECTED: "USER_REJECTED",
  USER_DISABLED: "USER_DISABLED",
  USER_ENABLED: "USER_ENABLED",
  USER_DELETED: "USER_DELETED",
  ORG_REACTIVATED: "ORG_REACTIVATED",
  ORG_SUSPENDED: "ORG_SUSPENDED",
  ORG_OFFBOARDED: "ORG_OFFBOARDED",
  VENDOR_REACTIVATED: "VENDOR_REACTIVATED",
  VENDOR_SUSPENDED: "VENDOR_SUSPENDED",
  VENDOR_OFFBOARDED: "VENDOR_OFFBOARDED",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES] | string;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] | string;

type AuditClient = typeof prisma | Prisma.TransactionClient;

interface WriteAuditLogParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  client?: AuditClient;
}

interface ListAuditLogsParams {
  entityType?: AuditEntityType;
  entityId?: string;
  actions?: AuditAction[];
  actorUserId?: string;
  limit?: number;
  client?: AuditClient;
}

function buildMetadata(metadata?: Record<string, unknown>): Prisma.InputJsonValue {
  return {
    version: 1,
    ...(metadata ?? {}),
  } as Prisma.InputJsonObject;
}

export async function writeAuditLog({
  entityType,
  entityId,
  action,
  actorUserId,
  metadata,
  client = prisma,
}: WriteAuditLogParams) {
  return client.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      userId: actorUserId ?? null,
      metadata: buildMetadata(metadata),
    },
  });
}

export async function listAuditLogs({
  entityType,
  entityId,
  actions,
  actorUserId,
  limit = 50,
  client = prisma,
}: ListAuditLogsParams = {}) {
  return client.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(actions?.length ? { action: { in: actions } } : {}),
      ...(actorUserId ? { userId: actorUserId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
