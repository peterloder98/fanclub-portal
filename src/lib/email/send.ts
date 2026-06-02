import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { isSmtpReady } from "@/lib/smtp/send-via-account";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export async function isSmtpConfigured() {
  return isSmtpReady();
}

/** @deprecated Prefer sendEmailViaAccount — kept for legacy env-only callers */
export async function sendEmail(input: SendEmailInput) {
  const result = await sendEmailViaAccount(input);
  if (result.skipped) {
    console.warn("[email] Kein SMTP-Konto – E-Mail übersprungen:", input.subject);
    return { ok: false as const, skipped: true as const };
  }
  return { ok: true as const, skipped: false as const };
}
