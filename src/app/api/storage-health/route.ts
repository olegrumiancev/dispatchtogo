import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isStorageConfigured, checkStorageHealth } from "@/lib/s3-client";

/**
 * GET /api/storage-health
 * Admin-only: test S3/MinIO connectivity.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const configured = isStorageConfigured();
  const endpoint = process.env.S3_ENDPOINT || "(not set)";
  const bucket = process.env.S3_BUCKET || "(not set)";
  const hasAccessKey = !!process.env.S3_ACCESS_KEY;
  const hasSecretKey = !!process.env.S3_SECRET_KEY;

  if (!configured) {
    return NextResponse.json({
      status: "not_configured",
      endpoint,
      bucket,
      hasAccessKey,
      hasSecretKey,
    });
  }

  const error = await checkStorageHealth();

  return NextResponse.json({
    status: error ? "unreachable" : "ok",
    endpoint,
    bucket,
    hasAccessKey,
    hasSecretKey,
    ...(error ? { error } : {}),
  });
}
