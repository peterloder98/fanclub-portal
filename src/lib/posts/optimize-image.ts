"use client";

import { POST_MEDIA_MAX_BYTES, POST_MEDIA_MAX_SIDE_PX } from "@/lib/images/specs";

/** Client-Vorverarbeitung — Server komprimiert erneut auf ≤100 KB. */
export async function optimizePostImage(file: File): Promise<{
  blob: Blob;
  contentType: string;
  width: number;
  height: number;
}> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Bild konnte nicht verarbeitet werden.");
  }

  const maxSide = Math.min(POST_MEDIA_MAX_SIDE_PX, 640);
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, outW, outH);

  const contentType = "image/webp";
  const targetBytes = Math.floor(POST_MEDIA_MAX_BYTES * 0.85);
  let quality = 0.62;

  for (let i = 0; i < 8; i++) {
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
        contentType,
        quality,
      );
    });
    if (blob.size <= targetBytes || quality <= 0.4) {
      return { blob, contentType, width: outW, height: outH };
    }
    quality -= 0.08;
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
      contentType,
      0.4,
    );
  });
  return { blob, contentType, width: outW, height: outH };
}
