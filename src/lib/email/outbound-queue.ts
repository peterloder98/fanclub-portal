import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailTemplateKey } from "@/lib/email/template-keys";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { liveSessionIcsAttachment } from "@/lib/live/calendar-ics";
import type { LiveSessionRow } from "@/lib/live/types";
import {
  isSmtpAuthFailure,
  isSmtpRateOrPolicyBlock,
  outboundDrainLimit,
  paceBulkOutboundEmail,
} from "@/lib/smtp/outbound-throttle";

export type OutboundQueueRow = {
  id: string;
  to_address: string;
  template_key: string;
  template_vars: Record<string, string>;
  context: Record<string, unknown>;
  dedupe_key: string | null;
  attempts: number;
};

type SessionMailContext = Pick<
  LiveSessionRow,
  "id" | "slug" | "title" | "starts_at" | "ends_at" | "join_opens_at"
>;

function sessionFromContext(context: Record<string, unknown>): SessionMailContext | null {
  const s = context.session_mail;
  if (!s || typeof s !== "object") return null;
  const row = s as SessionMailContext;
  if (!row.id || !row.slug || !row.title || !row.starts_at || !row.ends_at) return null;
  return row;
}

export async function enqueueOutboundEmail(
  admin: SupabaseClient,
  input: {
    to: string;
    templateKey: EmailTemplateKey;
    templateVars: Record<string, string>;
    context?: Record<string, unknown>;
    dedupeKey?: string | null;
    sendAfter?: Date;
  },
): Promise<"queued" | "duplicate" | "error"> {
  const payload = {
    to_address: input.to.trim(),
    template_key: input.templateKey,
    template_vars: input.templateVars,
    context: input.context ?? {},
    dedupe_key: input.dedupeKey ?? null,
    send_after: (input.sendAfter ?? new Date()).toISOString(),
    status: "pending" as const,
  };

  const { error } = await admin.from("email_outbound_queue").insert(payload);
  if (!error) return "queued";

  if (/duplicate key|unique/i.test(error.message) && input.dedupeKey) {
    return "duplicate";
  }
  if (/email_outbound_queue|does not exist/i.test(error.message)) {
    console.error(
      "[outbound-queue] Tabelle fehlt — bitte supabase/156_email_outbound_queue.sql ausführen.",
    );
  }
  console.error("[outbound-queue] enqueue failed:", error.message);
  return "error";
}

export async function enqueueOutboundEmails(
  admin: SupabaseClient,
  items: Array<Parameters<typeof enqueueOutboundEmail>[1]>,
): Promise<{ queued: number; duplicate: number; errors: number }> {
  let queued = 0;
  let duplicate = 0;
  let errors = 0;
  for (const item of items) {
    const r = await enqueueOutboundEmail(admin, item);
    if (r === "queued") queued += 1;
    else if (r === "duplicate") duplicate += 1;
    else errors += 1;
  }
  return { queued, duplicate, errors };
}

export async function drainOutboundEmailQueue(
  admin: SupabaseClient,
): Promise<{
  processed: number;
  sent: number;
  failed: number;
  abortedAuth: boolean;
  pending: number;
}> {
  const limit = outboundDrainLimit();
  const { data: rows, error } = await admin
    .from("email_outbound_queue")
    .select("id,to_address,template_key,template_vars,context,dedupe_key,attempts")
    .eq("status", "pending")
    .lte("send_after", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    if (/email_outbound_queue|does not exist/i.test(error.message)) {
      return { processed: 0, sent: 0, failed: 0, abortedAuth: false, pending: 0 };
    }
    throw new Error(error.message);
  }

  let sent = 0;
  let failed = 0;
  let abortedAuth = false;

  for (let i = 0; i < (rows ?? []).length; i++) {
    const row = rows![i] as OutboundQueueRow;
    if (i > 0) await paceBulkOutboundEmail(sent);

    const templateKey = row.template_key as EmailTemplateKey;
    const rendered = await renderEmailFromTemplate(templateKey, row.template_vars);
    const session = sessionFromContext(row.context);
    const attachments = session
      ? [liveSessionIcsAttachment(session)]
      : rendered.signatureAttachment
        ? [rendered.signatureAttachment]
        : undefined;

    const result = await sendEmailWithLog({
      to: row.to_address,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments,
      templateKey,
      context: { ...(row.context ?? {}), queue_id: row.id },
    });

    if (result.ok) {
      sent += 1;
      await admin
        .from("email_outbound_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", row.id);
      continue;
    }

    const errMsg =
      ("error" in result && result.error) ||
      ("reason" in result && result.reason) ||
      "Versand fehlgeschlagen";
    failed += 1;

    if (isSmtpAuthFailure(String(errMsg))) {
      abortedAuth = true;
      await admin
        .from("email_outbound_queue")
        .update({
          status: "failed",
          attempts: row.attempts + 1,
          error_message: String(errMsg),
        })
        .eq("id", row.id);
      console.error("[outbound-queue] SMTP-Login abgelehnt — Drain gestoppt:", errMsg);
      break;
    }

    const attempts = row.attempts + 1;
    const retryLater = isSmtpRateOrPolicyBlock(String(errMsg)) && attempts < 4;
    const patch: Record<string, unknown> = {
      status: retryLater ? "pending" : "failed",
      attempts,
      error_message: String(errMsg),
    };
    if (retryLater) {
      patch.send_after = new Date(Date.now() + attempts * 15 * 60_000).toISOString();
    }
    await admin.from("email_outbound_queue").update(patch).eq("id", row.id);

    if (retryLater) {
      console.warn("[outbound-queue] temporär blockiert, später erneut:", row.to_address);
    }
  }

  const { count: pending } = await admin
    .from("email_outbound_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return {
    processed: (rows ?? []).length,
    sent,
    failed,
    abortedAuth,
    pending: pending ?? 0,
  };
}

export async function countPendingOutboundEmails(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("email_outbound_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    if (/email_outbound_queue|does not exist/i.test(error.message)) return 0;
    throw new Error(error.message);
  }
  return count ?? 0;
}
