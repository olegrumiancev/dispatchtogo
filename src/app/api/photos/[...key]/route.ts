import { NextRequest, NextResponse } from "next/server";
import { getFile, isStorageConfigured } from "@/lib/s3-client";

/**
 * Proxy photo reads through the app so browsers don't hit CF Access.
 * GET /api/photos/photos/uuid.jpg  →  S3 key "photos/uuid.jpg"
 *
 * Responds with the image bytes + correct Content-Type + cache headers.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const s3Key = key.join("/");

  if (!s3Key || !isStorageConfigured()) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const result = await getFile(s3Key);

    if (!result) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(Buffer.from(result.body), {
      status: 200,
      headers: {
        "Content-Type": result.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": result.contentLength?.toString() ?? "",
      },
    });
  } catch (err: any) {
    console.error("[photos proxy]", err.name, err.message);
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse("Storage error", { status: 502 });
  }
}
