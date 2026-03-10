import { prisma } from "@/lib/prisma";

export const AI_ARTIFACT_ACTIONS = {
  TRIAGE: "AI_TRIAGE_ARTIFACT",
  DISPATCH_HANDOFF: "AI_DISPATCH_HANDOFF",
  COMPLETION_ASSIST: "AI_COMPLETION_ASSIST",
  CREDENTIAL_REVIEW: "AI_CREDENTIAL_REVIEW",
  OPS_INSIGHTS: "AI_OPS_INSIGHTS",
} as const;

export type AiArtifactAction =
  (typeof AI_ARTIFACT_ACTIONS)[keyof typeof AI_ARTIFACT_ACTIONS];

export interface StoredAiArtifact<T> {
  data: T;
  createdAt: string;
  source: "ai" | "heuristic";
}

interface SaveAiArtifactParams<T> {
  entityType: string;
  entityId: string;
  action: AiArtifactAction;
  data: T;
  source?: "ai" | "heuristic";
  userId?: string | null;
}

function parseMetadata<T>(
  metadata: unknown
): { data: T; source: "ai" | "heuristic" } | null {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as Record<string, unknown>;
  if (!("data" in record)) return null;

  const source = record.source === "heuristic" ? "heuristic" : "ai";
  return {
    data: record.data as T,
    source,
  };
}

export async function saveAiArtifact<T>({
  entityType,
  entityId,
  action,
  data,
  source = "ai",
  userId,
}: SaveAiArtifactParams<T>) {
  return prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      userId: userId ?? null,
      metadata: {
        version: 1,
        source,
        data,
      } as any,
    },
  });
}

export async function getLatestAiArtifact<T>(
  entityType: string,
  entityId: string,
  action: AiArtifactAction
): Promise<StoredAiArtifact<T> | null> {
  const row = await prisma.auditLog.findFirst({
    where: {
      entityType,
      entityId,
      action,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return null;

  const parsed = parseMetadata<T>(row.metadata);
  if (!parsed) return null;

  return {
    data: parsed.data,
    createdAt: row.createdAt.toISOString(),
    source: parsed.source,
  };
}

export async function getLatestAiArtifactsForEntities<T>(
  entityType: string,
  entityIds: string[],
  action: AiArtifactAction
): Promise<Record<string, StoredAiArtifact<T>>> {
  if (entityIds.length === 0) return {};

  const rows = await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId: { in: entityIds },
      action,
    },
    orderBy: { createdAt: "desc" },
  });

  const out: Record<string, StoredAiArtifact<T>> = {};

  for (const row of rows) {
    if (out[row.entityId]) continue;
    const parsed = parseMetadata<T>(row.metadata);
    if (!parsed) continue;

    out[row.entityId] = {
      data: parsed.data,
      createdAt: row.createdAt.toISOString(),
      source: parsed.source,
    };
  }

  return out;
}
