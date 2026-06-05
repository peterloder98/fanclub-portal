import sharp from "sharp";
import { MERCHANDISE_IMAGE_MAX_BYTES } from "@/lib/images/specs";

export async function createMerchandisePlaceholder(label: string, hue: number): Promise<Buffer> {
  const text = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="hsl(${hue}, 42%, 88%)"/>
  <rect x="48" y="48" width="544" height="384" rx="24" fill="hsl(${hue}, 35%, 96%)" stroke="hsl(${hue}, 30%, 70%)" stroke-width="3"/>
  <text x="320" y="250" text-anchor="middle" font-family="system-ui,sans-serif" font-size="32" font-weight="700" fill="hsl(${hue}, 35%, 28%)">${text}</text>
</svg>`;

  let quality = 78;
  for (let i = 0; i < 6; i++) {
    const buf = await sharp(Buffer.from(svg))
      .webp({ quality, effort: 4 })
      .toBuffer();
    if (buf.length <= MERCHANDISE_IMAGE_MAX_BYTES) return buf;
    quality -= 12;
  }
  return sharp(Buffer.from(svg)).webp({ quality: 50 }).toBuffer();
}
