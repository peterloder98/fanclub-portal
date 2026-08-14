import sharp from "sharp";
import {
  AVATAR_MAX_BYTES,
  AVATAR_STORAGE_PX,
  DOCUMENT_MAX_SIDE_PX,
  MERCHANDISE_IMAGE_MAX_BYTES,
  POST_MEDIA_MAX_BYTES,
  POST_MEDIA_MAX_SIDE_PX,
  RECEIPT_MAX_BYTES,
} from "@/lib/images/specs";

async function toBuffer(input: Blob | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(input)) return input;
  return Buffer.from(await input.arrayBuffer());
}

async function encodeImageUnderBudget(
  pipeline: sharp.Sharp,
  maxBytes: number,
  opts: {
    format: "webp" | "avif";
    startQuality: number;
    minQuality: number;
    shrinkSides?: number[];
  },
): Promise<Buffer> {
  let quality = opts.startQuality;
  const sides = opts.shrinkSides ?? [POST_MEDIA_MAX_SIDE_PX];

  for (const side of sides) {
    for (let attempt = 0; attempt < 7; attempt++) {
      const resized = pipeline.clone().resize({
        width: side,
        height: side,
        fit: "inside",
        withoutEnlargement: true,
      });
      const buf =
        opts.format === "avif"
          ? await resized.avif({ quality, effort: 4 }).toBuffer()
          : await resized.webp({ quality, effort: 4, smartSubsample: true }).toBuffer();

      if (buf.length <= maxBytes) return buf;
      if (quality > opts.minQuality) {
        quality = Math.max(opts.minQuality, quality - 10);
        continue;
      }
      quality = opts.startQuality;
      break;
    }
  }

  const fallback = pipeline
    .clone()
    .resize(480, 480, { fit: "inside", withoutEnlargement: true });
  return opts.format === "avif"
    ? fallback.avif({ quality: opts.minQuality, effort: 4 }).toBuffer()
    : fallback.webp({ quality: opts.minQuality, effort: 4 }).toBuffer();
}

async function encodeWebpUnderBudget(
  pipeline: sharp.Sharp,
  maxBytes: number,
  opts: { startQuality: number; minQuality: number; shrinkSides?: number[] },
): Promise<Buffer> {
  return encodeImageUnderBudget(pipeline, maxBytes, { ...opts, format: "webp" });
}

/** Quadratisches Profilbild — scharf bei kleinem WebP-Budget. */
export async function processAvatarForStorage(input: Blob | Buffer): Promise<Buffer> {
  const buf = await toBuffer(input);
  const base = sharp(buf, { failOn: "none" }).rotate().resize(AVATAR_STORAGE_PX, AVATAR_STORAGE_PX, {
    fit: "cover",
    position: "centre",
  });

  // Qualität hoch halten; Budget erzwingen, ohne unter ~78 zu fallen (sonst weich).
  let quality = 86;
  for (let i = 0; i < 5; i++) {
    const out = await base
      .clone()
      .webp({ quality, effort: 5, smartSubsample: false })
      .toBuffer();
    if (out.length <= AVATAR_MAX_BYTES) return out;
    quality = Math.max(78, quality - 3);
  }

  return base.webp({ quality: 78, effort: 5, smartSubsample: false }).toBuffer();
}

/** Feed-/Post-Bild — AVIF, typisch unter 70 KB. */
export async function processPostMediaForStorage(input: Blob | Buffer): Promise<Buffer> {
  const buf = await toBuffer(input);
  const base = sharp(buf, { failOn: "none" }).rotate();

  return encodeImageUnderBudget(base, POST_MEDIA_MAX_BYTES, {
    format: "avif",
    startQuality: 58,
    minQuality: 45,
    shrinkSides: [POST_MEDIA_MAX_SIDE_PX, 560, 420],
  });
}

/** Beleg-Scan/Foto — gut lesbar, typisch unter 80 KB. */
export async function processReceiptForStorage(input: Blob | Buffer): Promise<Buffer> {
  const buf = await toBuffer(input);
  const base = sharp(buf, { failOn: "none" }).rotate();
  return encodeWebpUnderBudget(base, RECEIPT_MAX_BYTES, {
    startQuality: 72,
    minQuality: 50,
    shrinkSides: [DOCUMENT_MAX_SIDE_PX, 960, 720],
  });
}

/** Merchandise-Produktfoto. */
export async function processMerchandiseImageForStorage(input: Blob | Buffer): Promise<Buffer> {
  const buf = await toBuffer(input);
  const base = sharp(buf, { failOn: "none" }).rotate();
  return encodeWebpUnderBudget(base, MERCHANDISE_IMAGE_MAX_BYTES, {
    startQuality: 70,
    minQuality: 48,
    shrinkSides: [DOCUMENT_MAX_SIDE_PX, 800, 600],
  });
}
