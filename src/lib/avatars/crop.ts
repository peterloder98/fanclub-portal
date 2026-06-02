export type CropAreaPixels = { x: number; y: number; width: number; height: number };

export async function cropAndOptimizeAvatar(params: {
  file: File;
  crop: CropAreaPixels;
  outputSize: number;
  quality: number; // 0..1
}): Promise<{ blob: Blob; contentType: string }> {
  let img: ImageBitmap;
  try {
    img = await createImageBitmap(params.file);
  } catch {
    throw new Error("Bild konnte nicht verarbeitet werden.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = params.outputSize;
  canvas.height = params.outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw selected crop area into fixed square output
  ctx.drawImage(
    img,
    params.crop.x,
    params.crop.y,
    params.crop.width,
    params.crop.height,
    0,
    0,
    params.outputSize,
    params.outputSize,
  );

  const contentType = "image/webp";
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
      contentType,
      params.quality,
    );
  });

  return { blob, contentType };
}

