export async function optimizeAvatarImage(params: {
  file: File;
  size: number; // output square size in px
  quality: number; // 0..1
}): Promise<{ blob: Blob; contentType: string; ext: string }> {
  const { file, size, quality } = params;

  const img = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // center-crop to square
  const srcW = img.width;
  const srcH = img.height;
  const srcSize = Math.min(srcW, srcH);
  const sx = Math.floor((srcW - srcSize) / 2);
  const sy = Math.floor((srcH - srcSize) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);

  const contentType = "image/webp";
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
      contentType,
      quality,
    );
  });

  return { blob, contentType, ext: "webp" };
}

