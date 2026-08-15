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
    console.warn("[email] Versand übersprungen:", result.reason, input.subject);
  } else if (!result.ok) {
    console.warn("[email] Versand fehlgeschlagen:", result.error, input.subject);
  }
  return result;
}
