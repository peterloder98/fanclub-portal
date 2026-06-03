import nodemailer from "nodemailer";
import type { SmtpEncryption } from "@/lib/smtp/types";

export function createTransportFromCredentials(input: {
  server: string;
  port: number;
  encryption: SmtpEncryption;
  email: string;
  password: string;
}) {
  const secure = input.encryption === "SSL" || input.port === 465;

  return nodemailer.createTransport({
    host: input.server,
    port: input.port,
    secure,
    requireTLS: input.encryption === "TLS" || input.encryption === "STARTTLS",
    auth: {
      user: input.email,
      pass: input.password,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 15_000,
    socketTimeout: 25_000,
  });
}

export function formatFromHeader(email: string, displayName?: string | null) {
  if (displayName?.trim()) {
    return `${displayName.trim()} <${email}>`;
  }
  return email;
}
