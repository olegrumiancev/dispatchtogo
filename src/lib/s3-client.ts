/**
 * S3-compatible storage client.
 *
 * Works with MinIO on Synology (self-hosted) or any S3-compatible provider.
 * Uploads are authenticated via S3 access key / secret key.
 * If the endpoint is behind Cloudflare Access, CF service token headers
 * are injected via a custom middleware on the HTTP handler.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "";
const S3_BUCKET = process.env.S3_BUCKET || "dispatchtogo-photos";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || "";
const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID || "";
const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET || "";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  _client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO
  });

  // Inject CF Access headers AFTER signing so they don't corrupt the S3v4 signature
  if (CF_ACCESS_CLIENT_ID) {
    _client.middlewareStack.add(
      (next) => async (args: any) => {
        if (args.request?.headers) {
          args.request.headers["cf-access-client-id"] = CF_ACCESS_CLIENT_ID;
          args.request.headers["cf-access-client-secret"] =
            CF_ACCESS_CLIENT_SECRET;
        }
        return next(args);
      },
      { step: "finalizeRequest", name: "cfAccessHeaders", priority: "low" }
    );
  }

  return _client;
}

export function isStorageConfigured(): boolean {
  return S3_ENDPOINT.length > 0 && S3_ACCESS_KEY.length > 0;
}

/**
 * Upload a file to S3/MinIO and return the public URL.
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Return a proxy URL so browsers don't hit CF Access directly
  return `/api/photos/${key}`;
}

/**
 * Fetch a file from S3/MinIO.
 * Returns the body stream, content-type, and content-length.
 */
export async function getFile(
  key: string
): Promise<{ body: Uint8Array; contentType?: string; contentLength?: number } | null> {
  const client = getClient();
  const resp = await client.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
  if (!resp.Body) return null;
  const bytes = await resp.Body.transformToByteArray();
  return {
    body: bytes,
    contentType: resp.ContentType ?? undefined,
    contentLength: resp.ContentLength ?? undefined,
  };
}

/**
 * Delete a file from S3/MinIO.
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
}

/**
 * Check if the storage bucket is reachable.
 * Returns null on success, or an error string on failure.
 */
export async function checkStorageHealth(): Promise<string | null> {
  if (!isStorageConfigured()) return "not configured";
  try {
    const client = getClient();
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    return null;
  } catch (err: any) {
    return `${err.name || "Error"}: ${err.message || String(err)} (HTTP ${err.$metadata?.httpStatusCode ?? "?"})`;
  }
}
