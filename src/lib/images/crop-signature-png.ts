import sharp from "sharp";

/** Entfernt leeren Rand um die Unterschrift (transparent/weiß), nur Tinte bleibt. */
export async function cropSignaturePng(input: Buffer | Uint8Array): Promise<Buffer> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  try {
    const trimmed = await sharp(buf)
      .ensureAlpha()
      .trim({ threshold: 12, background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    if (trimmed.length > 100) return trimmed;
  } catch {
    /* fallback unten */
  }
  return buf;
}
