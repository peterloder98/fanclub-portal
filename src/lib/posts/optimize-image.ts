"use client";

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

  const maxSide = 1600;
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
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
      contentType,
      0.82,
    );
  });

  return { blob, contentType, width: outW, height: outH };
}

