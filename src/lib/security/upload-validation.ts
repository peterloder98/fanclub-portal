const ALLOWED_IMAGE_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

export function looksLikePdfUpload(file: Blob, fileName?: string): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (fileName || (file instanceof File ? file.name : "")).toLowerCase();
  return type === "application/pdf" || name.endsWith(".pdf");
}

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

/** Belege: bestehendes Bild plus PDF (MIME + Endung + Dateikopf). */
export async function validateReceiptUpload(
  file: Blob,
  opts: { maxBytes: number; pdfMaxBytes?: number; label?: string; fileName?: string },
): Promise<string | null> {
  const label = opts.label ?? "Beleg";
  const fileName = opts.fileName || (file instanceof File ? file.name : "");
  if (looksLikePdfUpload(file, fileName)) {
    const type = (file.type || "").toLowerCase();
    const name = fileName.toLowerCase();
    if (type && type !== "application/pdf") {
      return `${label}: PDF muss den Typ application/pdf haben.`;
    }
    if (name && !name.endsWith(".pdf")) {
      return `${label}: Dateiname muss auf .pdf enden.`;
    }
    const maxBytes = opts.pdfMaxBytes ?? opts.maxBytes;
    if (file.size <= 0) return `${label}: leere Datei.`;
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      return `${label}: PDF maximal ${mb} MB.`;
    }
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const magic = String.fromCharCode(header[0] ?? 0, header[1] ?? 0, header[2] ?? 0, header[3] ?? 0);
    if (magic !== "%PDF") {
      return `${label}: keine gültige PDF-Datei.`;
    }
    return null;
  }
  return validateImageUpload(file, { maxBytes: opts.maxBytes, label });
}
