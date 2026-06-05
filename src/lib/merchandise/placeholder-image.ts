import sharp from "sharp";
import { MERCHANDISE_IMAGE_MAX_BYTES } from "@/lib/images/specs";

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export async function createMerchandisePlaceholder(label: string, seed: string): Promise<Buffer> {
  const h = hashStr(`${seed}:${label}`);
  const hue = h % 360;
  const hue2 = (h * 13 + 47) % 360;
  const cx1 = 120 + (h % 400);
  const cy1 = 80 + ((h >> 3) % 280);
  const cx2 = 200 + ((h >> 5) % 360);
  const cy2 = 160 + ((h >> 7) % 200);
  const r1 = 40 + (h % 80);
  const r2 = 30 + ((h >> 4) % 60);

  const text = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 48%, 82%)"/>
      <stop offset="100%" stop-color="hsl(${hue2}, 42%, 72%)"/>
    </linearGradient>
  </defs>
  <rect width="640" height="480" fill="url(#bg)"/>
  <circle cx="${cx1}" cy="${cy1}" r="${r1}" fill="hsl(${hue2}, 55%, 65%)" opacity="0.35"/>
  <circle cx="${cx2}" cy="${cy2}" r="${r2}" fill="hsl(${hue}, 60%, 55%)" opacity="0.28"/>
  <rect x="56" y="56" width="528" height="368" rx="28" fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
  <text x="320" y="248" text-anchor="middle" font-family="system-ui,sans-serif" font-size="30" font-weight="700" fill="hsl(${hue}, 40%, 22%)">${text}</text>
</svg>`;

  let quality = 78;
  for (let i = 0; i < 6; i++) {
    const buf = await sharp(Buffer.from(svg)).webp({ quality, effort: 4 }).toBuffer();
    if (buf.length <= MERCHANDISE_IMAGE_MAX_BYTES) return buf;
    quality -= 12;
  }
  return sharp(Buffer.from(svg)).webp({ quality: 50 }).toBuffer();
}
