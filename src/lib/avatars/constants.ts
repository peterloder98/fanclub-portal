export const AVATAR_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

/** Minimum source size so 256×256 output stays sharp enough */
export const AVATAR_MIN_DIMENSION = 128;

export function isAllowedAvatarFile(file: File) {
  if (AVATAR_ALLOWED_MIME.includes(file.type as (typeof AVATAR_ALLOWED_MIME)[number])) {
    return true;
  }
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp")
  );
}

export function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht gelesen werden."));
    };
    img.src = url;
  });
}
