import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmailViaAccount, type SendViaAccountInput } from "@/lib/smtp/send-via-account";

export type EmailLogStatus = "sent" | "failed" | "skipped";

export type EmailLogRow = {
  id: string;
  created_at: string;
  status: EmailLogStatus;
  to_address: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  error_message: string | null;
  skip_reason: string | null;
  template_key: string | null;
  context: Record<string, unknown>;
  retry_of: string | null;
  resent_at: string | null;
};

let tableMissingLogged = false;

export async function logEmailAttempt(input: {
  status: EmailLogStatus;
  to: string | string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  errorMessage?: string | null;
  skipReason?: string | null;
  templateKey?: string | null;
  context?: Record<string, unknown>;
  smtpAccountId?: string | null;
  retryOf?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const toAddress = Array.isArray(input.to) ? input.to.join(", ") : input.to;
  const { error } = await admin.from("email_send_log").insert({
    status: input.status,
    to_address: toAddress,
    subject: input.subject,
    body_text: input.bodyText,
    body_html: input.bodyHtml ?? null,
    error_message: input.errorMessage ?? null,
    skip_reason: input.skipReason ?? null,
    template_key: input.templateKey ?? null,
    context: input.context ?? {},
    smtp_account_id: input.smtpAccountId ?? null,
    retry_of: input.retryOf ?? null,
  });
  if (error) {
    if (/email_send_log|does not exist/i.test(error.message)) {
      if (!tableMissingLogged) {
        tableMissingLogged = true;
        console.warn("[email-log] Tabelle fehlt — supabase/061_email_send_log.sql ausführen.");
      }
      return null;
    }
    console.error("[email-log]", error.message);
  }
  return true;
}

export async function sendEmailWithLog(
  input: SendViaAccountInput & {
    templateKey?: string;
    context?: Record<string, unknown>;
    retryOf?: string;
  },
) {
  const result = await sendEmailViaAccount(input);
  if (result.ok) {
    await logEmailAttempt({
      status: "sent",
      to: input.to,
      subject: input.subject,
      bodyText: input.text,
      bodyHtml: input.html ?? null,
      templateKey: input.templateKey,
      context: input.context,
      retryOf: input.retryOf,
    });
    return result;
  }
  if ("skipped" in result && result.skipped) {
    await logEmailAttempt({
      status: "skipped",
      to: input.to,
      subject: input.subject,
      bodyText: input.text,
      bodyHtml: input.html ?? null,
      skipReason: result.reason,
      templateKey: input.templateKey,
      context: input.context,
      retryOf: input.retryOf,
    });
    return result;
  }
  await logEmailAttempt({
    status: "failed",
    to: input.to,
    subject: input.subject,
    bodyText: input.text,
    bodyHtml: input.html ?? null,
    errorMessage: "error" in result ? result.error : "Unbekannter Fehler",
    templateKey: input.templateKey,
    context: input.context,
    retryOf: input.retryOf,
  });
  return result;
}

export async function listEmailSendLog(limit = 80): Promise<{
  rows: EmailLogRow[];
  available: boolean;
}> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_send_log")
    .select(
      "id,created_at,status,to_address,subject,body_text,body_html,error_message,skip_reason,template_key,context,retry_of,resent_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (/email_send_log|does not exist/i.test(error.message)) {
      return { rows: [], available: false };
    }
    throw new Error(error.message);
  }
  return { rows: (data ?? []) as EmailLogRow[], available: true };
}

export async function resendEmailLogEntry(logId: string) {
  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("email_send_log")
    .select("id,to_address,subject,body_text,body_html,status")
    .eq("id", logId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Eintrag nicht gefunden.");

  const result = await sendEmailWithLog({
    to: row.to_address,
    subject: row.subject,
    text: row.body_text,
    html: row.body_html ?? undefined,
    retryOf: row.id,
    context: { resend: true },
  });

  if (result.ok) {
    await admin
      .from("email_send_log")
      .update({ resent_at: new Date().toISOString() })
      .eq("id", row.id);
  }
  return result;
}
