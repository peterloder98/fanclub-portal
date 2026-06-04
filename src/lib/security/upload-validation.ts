const ALLOWED_IMAGE_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

export function validateImageUpload(
  file: Blob,
  opts: { maxBytes: number; label?: string },
): string | null {
  const label = opts.label ?? "Datei";
  if (file.size <= 0) return `${label}: leere Datei.`;
  if (file.size > opts.maxBytes) {
    const mb = Math.round(opts.maxBytes / (1024 * 1024));
    return `${label}: maximal ${mb} MB.`;
  }
  const type = (file.type || "").toLowerCase();
  if (type && !ALLOWED_IMAGE_TYPES.has(type)) {
    return `${label}: nur WebP, JPEG oder PNG.`;
  }
  return null;
}
