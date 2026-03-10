export interface UploadedPhotoPayload {
  url: string;
  fullUrl?: string | null;
  thumbnailUrl?: string | null;
  type?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function normalizeUploadedPhotoPayload(input: unknown): UploadedPhotoPayload | null {
  if (typeof input === "string" && input.trim()) {
    return { url: input.trim() };
  }

  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  if (typeof candidate.url !== "string" || !candidate.url.trim()) {
    return null;
  }

  return {
    url: candidate.url.trim(),
    fullUrl:
      typeof candidate.fullUrl === "string" && candidate.fullUrl.trim()
        ? candidate.fullUrl.trim()
        : null,
    thumbnailUrl:
      typeof candidate.thumbnailUrl === "string" && candidate.thumbnailUrl.trim()
        ? candidate.thumbnailUrl.trim()
        : null,
    type:
      typeof candidate.type === "string" && candidate.type.trim()
        ? candidate.type.trim()
        : undefined,
    latitude:
      typeof candidate.latitude === "number" ? candidate.latitude : null,
    longitude:
      typeof candidate.longitude === "number" ? candidate.longitude : null,
  };
}
