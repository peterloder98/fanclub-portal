import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  const s =
    process.env.MEMBERSHIP_DOWNLOAD_SECRET ||
    process.env.SMTP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Download-Secret fehlt.");
  return s;
}

export function createMembershipDownloadToken(applicationId: string, ttlSeconds = 60 * 60 * 24) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${applicationId}:${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${sig}.${exp}`;
}

export function verifyMembershipDownloadToken(applicationId: string, token: string) {
  const [sig, expStr] = token.split(".");
  if (!sig || !expStr) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const payload = `${applicationId}:${exp}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
