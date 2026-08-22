import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import { loadMailSignature, CLUB_SIGNATURE_ID } from "@/lib/email/signatures";
import {
  getAppSettingBool,
  NOTIFY_MEMBERS_NEW_EVENT_KEY,
  NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY,
  NOTIFY_MEMBERS_NEW_POLL_KEY,
} from "@/lib/settings/app-settings";
import {
  listActiveMemberRecipients,
  type ActiveMemberRecipient,
} from "@/lib/members/list-active-member-recipients";
import {
  broadcastKindToEmailPref,
  filterRecipientsByEmailPref,
} from "@/lib/email/member-email-prefs";
import { notifyAllActiveMembers } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { isSmtpReady } from "@/lib/smtp/send-via-account";
import { paceBulkOutboundEmail, isSmtpAuthFailure } from "@/lib/smtp/outbound-throttle";

export type MemberBroadcastKind = "giveaway" | "poll" | "event";

export type EventBroadcastMeta = {
  title: string;
  dateLabel: string;
  location?: string | null;
  tv: boolean;
};

const MAX_RECIPIENTS = 500;

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export function memberBroadcastSubject(
  kind: MemberBroadcastKind,
  eventMeta?: EventBroadcastMeta,
) {
  if (kind === "event" && eventMeta) {
    const prefix = eventMeta.tv ? "Neuer TV-Auftritt" : "Neuer Auftritt";
    return `${prefix}: ${eventMeta.title} — ${eventMeta.dateLabel}`;
  }
  return kind === "giveaway"
    ? "Neues Gewinnspiel in der Anni Perka Fanclub App"
    : kind === "poll"
      ? "Neue Umfrage in der Anni Perka Fanclub App"
      : "Neues Event in der Anni Perka Fanclub App";
}

export function composeMemberBroadcastBody(input: {
  kind: MemberBroadcastKind;
  firstName: string;
  signatureText: string;
  deepLink?: string | null;
  eventMeta?: EventBroadcastMeta;
}) {
  const name = input.firstName.trim() || "du";
  let middle: string;
  if (input.kind === "giveaway") {
    middle = "Wir haben ein neues Gewinnspiel für dich!";
  } else if (input.kind === "poll") {
    middle = "Wir haben eine neue Umfrage an der du teilnehmen kannst!";
  } else {
    const where = input.eventMeta?.location?.trim();
    const label = input.eventMeta?.tv ? "TV-Auftritt" : "Auftritt";
    middle = input.eventMeta
      ? `Es gibt einen neuen ${label}: „${input.eventMeta.title}" am ${input.eventMeta.dateLabel}${where ? ` (${where})` : ""}.`
      : "Es gibt einen neuen Auftritt in der Eventliste.";
  }

  const lines = [
    `Hey ${name},`,
    "",
    "schau doch unbedingt in der Anni Perka Fanclub App vorbei.",
    middle,
    "Wir freuen uns wenn du vorbeischaust.",
  ];

  if (input.deepLink) {
    lines.push("", `Direktlink: ${input.deepLink}`);
  }

  lines.push("", input.signatureText.trim());
  return lines.join("\n").trim();
}

function buildMessageForRecipient(
  recipient: ActiveMemberRecipient,
  kind: MemberBroadcastKind,
  entityPath: string,
  sig: Awaited<ReturnType<typeof loadMailSignature>>,
  eventMeta?: EventBroadcastMeta,
) {
  const base = appBaseUrl();
  const deepLink = base ? `${base}${entityPath}` : null;
  const text = composeMemberBroadcastBody({
    kind,
    firstName: recipient.firstName,
    signatureText: sig.text,
    deepLink,
    eventMeta,
  });
  const html = buildHtmlFromPlain(text, sig.htmlBlock, sig.text);
  const attachments = sig.imageBuffer
    ? [
        {
          filename: "signatur.png",
          content: Buffer.from(sig.imageBuffer),
          contentType: sig.contentType,
          cid: sig.imageCid!,
        },
      ]
    : undefined;

  return {
    subject: memberBroadcastSubject(kind, eventMeta),
    text,
    html,
    attachments,
  };
}

export type MemberBroadcastResult = {
  enabled: boolean;
  recipientCount: number;
  sent: number;
  failed: number;
  skipped: number;
  skippedReason?: string;
};

/**
 * Versendet in kleinen Batches mit Pause — schont SMTP-Limits bei vielen Empfängern.
 * Läuft über sendEmailWithLog → Outbound-Policy (Testmodus-Allowlist).
 * Nur ok:true zählt als gesendet.
 */
export async function sendMemberActivityBroadcast(input: {
  kind: MemberBroadcastKind;
  entityId: string;
  eventMeta?: EventBroadcastMeta;
}): Promise<MemberBroadcastResult> {
  const settingKey =
    input.kind === "giveaway"
      ? NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY
      : input.kind === "poll"
        ? NOTIFY_MEMBERS_NEW_POLL_KEY
        : NOTIFY_MEMBERS_NEW_EVENT_KEY;
  const enabled = await getAppSettingBool(settingKey, false);
  if (!enabled) {
    return { enabled: false, recipientCount: 0, sent: 0, failed: 0, skipped: 0 };
  }

  if (!(await isSmtpReady())) {
    return {
      enabled: true,
      recipientCount: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      skippedReason: "no_smtp_account",
    };
  }

  let recipients = await listActiveMemberRecipients();
  recipients = await filterRecipientsByEmailPref(
    recipients,
    broadcastKindToEmailPref(input.kind),
  );
  if (recipients.length > MAX_RECIPIENTS) {
    recipients = recipients.slice(0, MAX_RECIPIENTS);
    console.warn(
      `[member-broadcast] Empfänger auf ${MAX_RECIPIENTS} begrenzt (${input.kind} ${input.entityId})`,
    );
  }

  if (!recipients.length) {
    return { enabled: true, recipientCount: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const entityPath =
    input.kind === "giveaway"
      ? `/giveaways/${input.entityId}`
      : input.kind === "poll"
        ? `/polls/${input.entityId}`
        : `/events?focus=${input.entityId}`;

  const sig = await loadMailSignature(CLUB_SIGNATURE_ID);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let abortedAuth = false;

  for (let i = 0; i < recipients.length; i++) {
    if (abortedAuth) break;
    const recipient = recipients[i]!;
    if (sent > 0) await paceBulkOutboundEmail(sent);

    try {
      const msg = buildMessageForRecipient(
        recipient,
        input.kind,
        entityPath,
        sig,
        input.eventMeta,
      );
      const result = await sendEmailWithLog({
        to: recipient.email,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        attachments: msg.attachments,
        templateKey: `member_broadcast_${input.kind}`,
        context: {
          entity_id: input.entityId,
          user_id: recipient.userId,
          kind: input.kind,
        },
      });
      if (result.ok) {
        sent += 1;
      } else if ("skipped" in result && result.skipped) {
        skipped += 1;
      } else {
        failed += 1;
        const errMsg = "error" in result ? result.error : "unknown";
        console.error(`[member-broadcast] Fehler an ${recipient.email}:`, errMsg);
        if (errMsg && isSmtpAuthFailure(String(errMsg))) {
          abortedAuth = true;
        }
      }
    } catch (e) {
      failed += 1;
      console.error(
        `[member-broadcast] Fehler an ${recipient.email}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  console.info(
    `[member-broadcast] ${input.kind} ${input.entityId}: ${sent} gesendet, ${failed} fehlgeschlagen, ${skipped} übersprungen (Policy), ${recipients.length} Empfänger`,
  );

  return {
    enabled: true,
    recipientCount: recipients.length,
    sent,
    failed,
    skipped,
  };
}

export async function notifyMembersNewGiveaway(giveawayId: string) {
  const admin = (await import("@/lib/supabase/admin")).createSupabaseAdminClient();
  const { data: g } = await admin.from("giveaways").select("title").eq("id", giveawayId).maybeSingle();
  const base = appBaseUrl();
  await notifyAllActiveMembers({
    kind: NOTIFICATION_KINDS.giveawayAvailable,
    title: "Neues Gewinnspiel",
    body: g?.title ? `„${g.title}" ist jetzt verfügbar.` : "Ein neues Gewinnspiel wartet auf dich.",
    linkUrl: base ? `${base}/giveaways/${giveawayId}` : `/giveaways/${giveawayId}`,
    linkLabel: "Zum Gewinnspiel",
    metadata: { giveaway_id: giveawayId },
  }).catch(console.error);
  return sendMemberActivityBroadcast({ kind: "giveaway", entityId: giveawayId });
}

export async function notifyMembersNewPoll(pollId: string) {
  const admin = (await import("@/lib/supabase/admin")).createSupabaseAdminClient();
  const { data: p } = await admin.from("polls").select("title").eq("id", pollId).maybeSingle();
  const base = appBaseUrl();
  await notifyAllActiveMembers({
    kind: NOTIFICATION_KINDS.pollStarted,
    title: "Neue Umfrage",
    body: p?.title ? `„${p.title}" — jetzt abstimmen.` : "Eine neue Umfrage ist gestartet.",
    linkUrl: base ? `${base}/polls/${pollId}` : `/polls/${pollId}`,
    linkLabel: "Zur Umfrage",
    metadata: { poll_id: pollId },
  }).catch(console.error);
  return sendMemberActivityBroadcast({ kind: "poll", entityId: pollId });
}
