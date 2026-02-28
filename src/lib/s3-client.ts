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

  // Inject CF Access headers if configured
  if (CF_ACCESS_CLIENT_ID) {
    _client.middlewareStack.add(
      (next) => async (args: any) => {
        if (args.request?.headers) {
          args.request.headers["CF-Access-Client-Id"] = CF_ACCESS_CLIENT_ID;
          args.request.headers["CF-Access-Client-Secret"] =
            CF_ACCESS_CLIENT_SECRET;
        }
        return next(args);
      },
      { step: "build", name: "cfAccessHeaders", priority: "high" }
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

  // Return public URL
  if (S3_PUBLIC_URL) {
    return `${S3_PUBLIC_URL}/${key}`;
  }
  return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
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
 */
export async function checkStorageHealth(): Promise<boolean> {
  if (!isStorageConfigured()) return false;
  try {
    const client = getClient();
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    return true;
  } catch {
    return false;
  }
}
