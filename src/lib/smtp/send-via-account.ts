import type { Attachment } from "nodemailer/lib/mailer";
import { getDefaultSmtpAccountWithPassword, getSmtpAccountWithPassword } from "@/lib/smtp/accounts";
import { createTransportFromCredentials, formatFromHeader } from "@/lib/smtp/transport";

export type SendViaAccountInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Attachment[];
  accountId?: string;
  replyTo?: string;
};

export async function sendEmailViaAccount(input: SendViaAccountInput) {
  const creds = input.accountId
    ? await getSmtpAccountWithPassword(input.accountId)
    : await getDefaultSmtpAccountWithPassword();

  if (!creds) {
    return { ok: false as const, skipped: true as const, reason: "no_smtp_account" as const };
  }

  const transport = createTransportFromCredentials({
    server: creds.public.server,
    port: creds.public.port,
    encryption: creds.public.encryption,
    email: creds.public.email,
    password: creds.password,
  });

  try {
    await transport.sendMail({
      from: formatFromHeader(creds.public.email, creds.public.display_name),
      replyTo: input.replyTo ?? creds.public.reply_to ?? creds.public.email,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, "<br>"),
      attachments: input.attachments,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SMTP-Versand fehlgeschlagen";
    return { ok: false as const, skipped: false as const, error: msg };
  }

  return { ok: true as const, skipped: false as const };
}

export async function isSmtpReady() {
  try {
    const creds = await getDefaultSmtpAccountWithPassword();
    return Boolean(creds);
  } catch {
    return false;
  }
}
