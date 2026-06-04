import { getDefaultSmtpAccountWithPassword } from "@/lib/smtp/accounts";
import { createTransportFromCredentials, formatFromHeader } from "@/lib/smtp/transport";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import { loadMailSignature, CLUB_SIGNATURE_ID } from "@/lib/email/signatures";
import {
  getAppSettingBool,
  NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY,
  NOTIFY_MEMBERS_NEW_POLL_KEY,
} from "@/lib/settings/app-settings";
import {
  listActiveMemberRecipients,
  type ActiveMemberRecipient,
} from "@/lib/members/list-active-member-recipients";

export type MemberBroadcastKind = "giveaway" | "poll";

const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 1500;
const MAX_RECIPIENTS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export function memberBroadcastSubject(kind: MemberBroadcastKind) {
  return kind === "giveaway"
    ? "Neues Gewinnspiel in der Anni Perka Fanclub App"
    : "Neue Umfrage in der Anni Perka Fanclub App";
}

export function composeMemberBroadcastBody(input: {
  kind: MemberBroadcastKind;
  firstName: string;
  signatureText: string;
  deepLink?: string | null;
}) {
  const name = input.firstName.trim() || "du";
  const middle =
    input.kind === "giveaway"
      ? "Wir haben ein neues Gewinnspiel für dich!"
      : "Wir haben eine neue Umfrage an der du teilnehmen kannst!";

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
) {
  const base = appBaseUrl();
  const deepLink = base ? `${base}${entityPath}` : null;
  const text = composeMemberBroadcastBody({
    kind,
    firstName: recipient.firstName,
    signatureText: sig.text,
    deepLink,
  });
  const html = buildHtmlFromPlain(text, sig.htmlBlock);
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
    subject: memberBroadcastSubject(kind),
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
  skippedReason?: string;
};

/**
 * Versendet in kleinen Batches mit Pause — schont SMTP-Limits bei vielen Empfängern.
 * Fehler einzelner Mails brechen den Lauf nicht ab.
 */
export async function sendMemberActivityBroadcast(input: {
  kind: MemberBroadcastKind;
  entityId: string;
}): Promise<MemberBroadcastResult> {
  const settingKey =
    input.kind === "giveaway" ? NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY : NOTIFY_MEMBERS_NEW_POLL_KEY;
  const enabled = await getAppSettingBool(settingKey, false);
  if (!enabled) {
    return { enabled: false, recipientCount: 0, sent: 0, failed: 0 };
  }

  const creds = await getDefaultSmtpAccountWithPassword();
  if (!creds) {
    return {
      enabled: true,
      recipientCount: 0,
      sent: 0,
      failed: 0,
      skippedReason: "no_smtp_account",
    };
  }

  let recipients = await listActiveMemberRecipients();
  if (recipients.length > MAX_RECIPIENTS) {
    recipients = recipients.slice(0, MAX_RECIPIENTS);
    console.warn(
      `[member-broadcast] Empfänger auf ${MAX_RECIPIENTS} begrenzt (${input.kind} ${input.entityId})`,
    );
  }

  if (!recipients.length) {
    return { enabled: true, recipientCount: 0, sent: 0, failed: 0 };
  }

  const entityPath =
    input.kind === "giveaway" ? `/giveaways/${input.entityId}` : `/polls/${input.entityId}`;

  const sig = await loadMailSignature(CLUB_SIGNATURE_ID);
  const subject = memberBroadcastSubject(input.kind);

  const transport = createTransportFromCredentials({
    server: creds.public.server,
    port: creds.public.port,
    encryption: creds.public.encryption,
    email: creds.public.email,
    password: creds.password,
  });

  const from = formatFromHeader(creds.public.email, creds.public.display_name);
  const replyTo = creds.public.reply_to ?? creds.public.email;

  let sent = 0;
  let failed = 0;

  try {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (recipient) => {
          try {
            const msg = buildMessageForRecipient(recipient, input.kind, entityPath, sig);
            await transport.sendMail({
              from,
              replyTo,
              to: recipient.email,
              subject,
              text: msg.text,
              html: msg.html,
              attachments: msg.attachments,
            });
            sent += 1;
          } catch (e) {
            failed += 1;
            console.error(
              `[member-broadcast] Fehler an ${recipient.email}:`,
              e instanceof Error ? e.message : e,
            );
          }
        }),
      );

      if (i + BATCH_SIZE < recipients.length) {
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }
  } finally {
    transport.close();
  }

  console.info(
    `[member-broadcast] ${input.kind} ${input.entityId}: ${sent} gesendet, ${failed} fehlgeschlagen, ${recipients.length} Empfänger`,
  );

  return {
    enabled: true,
    recipientCount: recipients.length,
    sent,
    failed,
  };
}

export async function notifyMembersNewGiveaway(giveawayId: string) {
  return sendMemberActivityBroadcast({ kind: "giveaway", entityId: giveawayId });
}

export async function notifyMembersNewPoll(pollId: string) {
  return sendMemberActivityBroadcast({ kind: "poll", entityId: pollId });
}
