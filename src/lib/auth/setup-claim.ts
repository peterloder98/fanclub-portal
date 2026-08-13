import { createHmac, timingSafeEqual } from "crypto";

export const SETUP_CLAIM_COOKIE = "fc_setup_claim";
/** Go-Live: genug Zeit, um Geburtsdatum/Passwort später fertigzustellen. */
export const SETUP_CLAIM_TTL_SECONDS = 60 * 60 * 72;

function secret() {
  const s =
    process.env.SETUP_CLAIM_SECRET ||
    process.env.SMTP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Setup-Claim-Secret fehlt.");
  return s;
}

export type SetupClaimPayload = {
  userId: string;
  email: string;
  exp: number;
};

/** Cookie-Wert: userId.emailBase64url.exp.sig */
export function createSetupClaimToken(
  userId: string,
  email: string,
  ttlSeconds = SETUP_CLAIM_TTL_SECONDS,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const emailB64 = Buffer.from(email, "utf8").toString("base64url");
  const payload = `${userId}.${emailB64}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySetupClaimToken(token: string): SetupClaimPayload | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, emailB64, expStr, sig] = parts;
  if (!userId || !emailB64 || !expStr || !sig) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  const payload = `${userId}.${emailB64}.${exp}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  let email: string;
  try {
    email = Buffer.from(emailB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email.includes("@")) return null;

  return { userId, email, exp };
}
