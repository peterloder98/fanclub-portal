import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";

function getKey() {
  const secret = process.env.SPOTIFY_TOKEN_SECRET ?? process.env.SMTP_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SPOTIFY_TOKEN_SECRET (oder SMTP_SECRET) fehlt oder ist zu kurz (min. 16 Zeichen).",
    );
  }
  return scryptSync(secret, "fanclub-spotify-v1", 32);
}

export function encryptSpotifyToken(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSpotifyToken(ciphertext: string) {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
