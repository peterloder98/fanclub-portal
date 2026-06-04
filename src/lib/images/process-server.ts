import sharp from "sharp";
import {
  AVATAR_MAX_BYTES,
  AVATAR_STORAGE_PX,
  POST_MEDIA_MAX_BYTES,
  POST_MEDIA_MAX_SIDE_PX,
} from "@/lib/images/specs";

async function toBuffer(input: Blob | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(input)) return input;
  return Buffer.from(await input.arrayBuffer());
}

async function encodeWebpUnderBudget(
  pipeline: sharp.Sharp,
  maxBytes: number,
  opts: { startQuality: number; minQuality: number; shrinkSides?: number[] },
): Promise<Buffer> {
  let quality = opts.startQuality;
  const sides = opts.shrinkSides ?? [POST_MEDIA_MAX_SIDE_PX];

  for (const side of sides) {
    for (let attempt = 0; attempt < 7; attempt++) {
      const buf = await pipeline
        .clone()
        .resize({
          width: side,
          height: side,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 4, smartSubsample: true })
        .toBuffer();

      if (buf.length <= maxBytes) return buf;
      if (quality > opts.minQuality) {
        quality = Math.max(opts.minQuality, quality - 10);
        continue;
      }
      quality = opts.startQuality;
      break;
    }
  }

  return pipeline
    .clone()
    .resize(480, 480, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: opts.minQuality, effort: 4 })
    .toBuffer();
}

/** Quadratisches Profilbild — klein & scharf genug für die UI. */
export async function processAvatarForStorage(input: Blob | Buffer): Promise<Buffer> {
  const buf = await toBuffer(input);
  const base = sharp(buf, { failOn: "none" }).rotate().resize(AVATAR_STORAGE_PX, AVATAR_STORAGE_PX, {
    fit: "cover",
    position: "attention",
  });

  let quality = 78;
  for (let i = 0; i < 6; i++) {
    const out = await base.clone().webp({ quality, effort: 4 }).toBuffer();
    if (out.length <= AVATAR_MAX_BYTES) return out;
    quality = Math.max(50, quality - 8);
  }

  return base.webp({ quality: 50, effort: 4 }).toBuffer();
}

/** Feed-/Post-Bild — nie größer als Anzeige, typisch unter 100 KB. */
export async function processPostMediaForStorage(input: Blob | Buffer): Promise<Buffer> {
  const buf = await toBuffer(input);
  const base = sharp(buf, { failOn: "none" }).rotate();

  return encodeWebpUnderBudget(base, POST_MEDIA_MAX_BYTES, {
    startQuality: 68,
    minQuality: 48,
    shrinkSides: [POST_MEDIA_MAX_SIDE_PX, 560, 420],
  });
}
