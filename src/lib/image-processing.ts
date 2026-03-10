import sharp from "sharp";

const FULL_MAX_DIMENSION = 2000;
const DISPLAY_MAX_DIMENSION = 1600;
const THUMBNAIL_MAX_DIMENSION = 480;
const FULL_QUALITY = 82;
const DISPLAY_QUALITY = 78;
const THUMBNAIL_QUALITY = 72;

export interface GeneratedImageVariants {
  outputContentType: string;
  outputExtension: string;
  full: Buffer;
  display: Buffer;
  thumbnail: Buffer | null;
}

function isAnimatedGif(contentType: string) {
  return contentType === "image/gif";
}

async function buildWebpVariant(
  buffer: Buffer,
  maxDimension: number,
  quality: number
) {
  return sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
}

export async function generateImageVariants(
  buffer: Buffer,
  contentType: string
): Promise<GeneratedImageVariants> {
  if (isAnimatedGif(contentType)) {
    return {
      outputContentType: contentType,
      outputExtension: "gif",
      full: buffer,
      display: buffer,
      thumbnail: null,
    };
  }

  return {
    outputContentType: "image/webp",
    outputExtension: "webp",
    full: await buildWebpVariant(buffer, FULL_MAX_DIMENSION, FULL_QUALITY),
    display: await buildWebpVariant(buffer, DISPLAY_MAX_DIMENSION, DISPLAY_QUALITY),
    thumbnail: await buildWebpVariant(buffer, THUMBNAIL_MAX_DIMENSION, THUMBNAIL_QUALITY),
  };
}
