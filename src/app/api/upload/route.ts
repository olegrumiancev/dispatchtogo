import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isStorageConfigured, uploadFile } from "@/lib/s3-client";
import { generateImageVariants } from "@/lib/image-processing";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Photo storage is not configured" },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB" },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const imageId = crypto.randomUUID();
    const variants = await generateImageVariants(buffer, file.type);

    const fullKey = `photos/${imageId}-full.${variants.outputExtension}`;
    const displayKey = `photos/${imageId}-display.${variants.outputExtension}`;
    const thumbnailKey = variants.thumbnail
      ? `photos/${imageId}-thumb.${variants.outputExtension}`
      : null;

    const [fullUrl, url, thumbnailUrl] = await Promise.all([
      uploadFile(fullKey, variants.full, variants.outputContentType),
      uploadFile(displayKey, variants.display, variants.outputContentType),
      thumbnailKey && variants.thumbnail
        ? uploadFile(thumbnailKey, variants.thumbnail, variants.outputContentType)
        : Promise.resolve(null),
    ]);

    return NextResponse.json(
      {
        url,
        fullUrl,
        thumbnailUrl,
        key: displayKey,
        fullKey,
        thumbnailKey,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
