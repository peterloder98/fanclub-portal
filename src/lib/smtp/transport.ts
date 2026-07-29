import nodemailer from "nodemailer";
import { resolveMailDisplayName } from "@/lib/smtp/display-name";
import type { SmtpEncryption } from "@/lib/smtp/types";

export function createTransportFromCredentials(input: {
  server: string;
  port: number;
  encryption: SmtpEncryption;
  email: string;
  password: string;
}) {
  // 465 = implizites TLS; 587 = STARTTLS. Auth LOGIN ist immer gesetzt (wie „Server erfordert Authentifizierung“).
  const secure = input.port === 465;
  const requireTLS =
    !secure &&
    (input.port === 587 ||
      input.encryption === "TLS" ||
      input.encryption === "STARTTLS" ||
      input.encryption === "SSL");

  return nodemailer.createTransport({
    host: input.server,
    port: input.port,
    secure,
    requireTLS,
    auth: {
      user: input.email.trim(),
      pass: input.password,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 25_000,
  });
}

export function formatFromHeader(email: string, displayName?: string | null) {
  return `${resolveMailDisplayName(displayName)} <${email}>`;
}
