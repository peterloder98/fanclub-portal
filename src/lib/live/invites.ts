import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attachment } from "nodemailer/lib/mailer";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS, type EmailTemplateKey } from "@/lib/email/template-keys";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { enqueueOutboundEmails } from "@/lib/email/outbound-queue";
import { paceBulkOutboundEmail } from "@/lib/smtp/outbound-throttle";
import { listActiveMemberRecipients } from "@/lib/members/list-active-member-recipients";
import { isRealMemberEmail } from "@/lib/email/is-real-member-email";
import {
  filterRecipientsByEmailPref,
  userAllowsMemberEmail,
} from "@/lib/email/member-email-prefs";
import { createUserNotification, notifyAllActiveMembers } from "@/lib/notifications/create";
import { hasNotificationDedupe } from "@/lib/notifications/dedup";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { resolveLiveAnniEmail } from "@/lib/live/anni-recipient";
import { liveSessionCalendarUrl, liveSessionIcsAttachment } from "@/lib/live/calendar-ics";
import { appBaseUrl, generateLiveHostToken, liveHostUrl, liveMemberUrl, type LiveSessionRow } from "@/lib/live/types";
import { formatBerlinDateTimeLong, formatBerlinTime } from "@/lib/datetime/berlin";


async function cancelPendingLiveInviteEmails(admin: SupabaseClient, sessionId: string) {
  await admin
    .from("email_outbound_queue")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .like("dedupe_key", `live_invite:${sessionId}:%`);
}

/** Einladungs-/Erinnerungsdatum — immer Europe/Berlin (nicht Server-UTC). */
export function formatLiveSessionDateLabel(iso: string): string {
  return formatBerlinDateTimeLong(iso);
}

export function formatLiveSessionTimeLabel(iso: string): string {
  return formatBerlinTime(iso);
}

/** Minuten vor Start, ab denen der Raum für Mitglieder offen ist (Default 10). */
export function liveJoinOpensMinutesBefore(
  startsAt: string,
  joinOpensAt?: string | null,
): number {
  if (!joinOpensAt) return 10;
  const ms = new Date(startsAt).getTime() - new Date(joinOpensAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 10;
  return Math.max(0, Math.round(ms / 60_000));
}

type SessionMailFields = Pick<
  LiveSessionRow,
  "id" | "slug" | "title" | "starts_at" | "ends_at"
> & {
  join_opens_at?: string | null;
};

function mailAttachments(
  session: SessionMailFields,
  signatureAttachment?: {
    filename: string;
    content: Uint8Array | Buffer;
    contentType: string;
    cid: string;
  } | null,
): Attachment[] {
  const list: Attachment[] = [liveSessionIcsAttachment(session)];
  if (signatureAttachment) {
    list.push({
      filename: signatureAttachment.filename,
      content: Buffer.from(signatureAttachment.content),
      contentType: signatureAttachment.contentType,
      cid: signatureAttachment.cid,
    });
  }
  return list;
}

async function sendOneLiveEmail(input: {
  to: string;
  templateKey: EmailTemplateKey;
  vars: Record<string, string>;
  session: SessionMailFields;
}): Promise<boolean> {
  const rendered = await renderEmailFromTemplate(input.templateKey, input.vars);
  const result = await sendEmailWithLog({
    to: input.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments: mailAttachments(input.session, rendered.signatureAttachment),
    templateKey: input.templateKey,
    context: { session_id: input.session.id },
  });
  return result.ok;
}

export async function sendLiveSessionInviteEmails(
  session: SessionMailFields,
  options?: { resend?: boolean },
): Promise<{ emails: number; notifications: number; errors: number; queued?: boolean }> {
  const allRecipients = await listActiveMemberRecipients();
  const recipients = await filterRecipientsByEmailPref(allRecipients, "live");
  const admin = (await import("@/lib/supabase/admin")).createSupabaseAdminClient();
  const { data: genders } = await admin
    .from("profiles")
    .select("id,gender")
    .in(
      "id",
      recipients.map((r) => r.userId),
    );
  const genderById = new Map((genders ?? []).map((g) => [g.id, g.gender as string | null]));

  const sessionUrl = liveMemberUrl(session.slug);
  const sessionDate = formatLiveSessionDateLabel(session.starts_at);
  const joinOpensMinutes = String(
    liveJoinOpensMinutesBefore(session.starts_at, session.join_opens_at),
  );

  if (options?.resend) {
    await cancelPendingLiveInviteEmails(admin, session.id);
  }

  const queueItems = recipients
    .filter(
      (r) => r.email.trim().toLowerCase() !== resolveLiveAnniEmail().toLowerCase(),
    )
    .map((r) => {
      const person = emailPersonVars({
        firstName: r.firstName,
        gender: genderById.get(r.userId),
      });
      return {
        to: r.email,
        templateKey: EMAIL_TEMPLATE_KEYS.liveSessionInvite,
        templateVars: {
          ...person,
          session_title: session.title,
          session_date: sessionDate,
          session_url: sessionUrl,
          calendar_url: liveSessionCalendarUrl(session),
          join_opens_minutes: joinOpensMinutes,
        },
        context: { session_mail: session },
        dedupeKey: `live_invite:${session.id}:${r.userId}`,
      };
    });

  const { queued, errors } = await enqueueOutboundEmails(admin, queueItems);
  // Anni bekommt separat den Host-Link (sendAnniHostLinkEmail) — nicht den Mitglieder-Link.

  const { data: sessionRow } = await admin
    .from("live_sessions")
    .select("invites_sent_at")
    .eq("id", session.id)
    .maybeSingle();
  const alreadyInvited = Boolean(sessionRow?.invites_sent_at);
  let notifications = 0;
  if (!alreadyInvited) {
    await notifyAllActiveMembers({
      kind: NOTIFICATION_KINDS.liveSessionInvite,
      title: "Live mit Anni — Einladung",
      body: `${session.title} · ${sessionDate}. Bitte zusagen oder absagen.`,
      linkUrl: "/live",
      linkLabel: "Zur Live-Session",
      metadata: {
        session_id: session.id,
        slug: session.slug,
        dedupe_key: `invite:${session.id}`,
      },
    });
    notifications = allRecipients.length;
  }

  await admin
    .from("live_sessions")
    .update({ invites_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", session.id);

  return { emails: queued, notifications, errors, queued: true };
}

/** Host-Link nur an Anni — mehrfach nutzbar bis Token neu generiert wird. */
export async function sendAnniHostLinkEmail(input: {
  session: SessionMailFields;
  hostUrl: string;
}): Promise<{ ok: boolean }> {
  const anniEmail = resolveLiveAnniEmail();
  const sessionDate = formatLiveSessionDateLabel(input.session.starts_at);
  const person = emailPersonVars({ firstName: "Anni", gender: "female" });

  try {
    const ok = await sendOneLiveEmail({
      to: anniEmail,
      templateKey: EMAIL_TEMPLATE_KEYS.liveSessionHostInvite,
      vars: {
        ...person,
        session_title: input.session.title,
        session_date: sessionDate,
        host_url: input.hostUrl,
        calendar_url: liveSessionCalendarUrl(input.session),
      },
      session: input.session,
    });
    if (!ok) {
      console.error("[live] Anni host-link email failed (smtp)");
    }
    return { ok };
  } catch (e) {
    console.error("[live] Anni host-link email failed", e);
    return { ok: false };
  }
}

/** Erinnerung an Anni: Host-Link (kein Mitglieder-Login), Token wird für den Versand rotiert. */
async function sendAnniReminderEmail(
  admin: SupabaseClient,
  session: SessionMailFields & { anni_reminder_sent_at?: string | null },
): Promise<boolean> {
  if (session.anni_reminder_sent_at) return false;

  const { token, hash } = generateLiveHostToken();
  const { error: updErr } = await admin
    .from("live_sessions")
    .update({ host_token_hash: hash, updated_at: new Date().toISOString() })
    .eq("id", session.id);
  if (updErr) {
    console.error("[live-reminder] Anni host token rotate failed:", updErr.message);
    return false;
  }

  const hostUrl = liveHostUrl(token);
  const result = await sendAnniHostLinkEmail({ session, hostUrl });
  if (result.ok) {
    await admin
      .from("live_sessions")
      .update({
        anni_reminder_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
  }
  return result.ok;
}

export async function runLiveSessionReminders(admin: SupabaseClient) {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 2);

  const { data: sessions, error } = await admin
    .from("live_sessions")
    .select("id,slug,title,starts_at,ends_at,join_opens_at,status,anni_reminder_sent_at")
    .in("status", ["scheduled", "live"])
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString());

  if (error) {
    if (/live_sessions|does not exist/i.test(error.message)) return { sent: 0, emails: 0 };
    // Spalte fehlt noch — ohne Anni-Flag weiter
    if (/anni_reminder_sent_at/i.test(error.message)) {
      const fallback = await admin
        .from("live_sessions")
        .select("id,slug,title,starts_at,ends_at,join_opens_at,status")
        .in("status", ["scheduled", "live"])
        .gte("starts_at", now.toISOString())
        .lte("starts_at", horizon.toISOString());
      if (fallback.error) throw new Error(fallback.error.message);
      return runRemindersForSessions(
        admin,
        (fallback.data ?? []).map((s) => ({ ...s, anni_reminder_sent_at: null })),
        now,
      );
    }
    throw new Error(error.message);
  }
  if (!sessions?.length) return { sent: 0, emails: 0 };
  return runRemindersForSessions(admin, sessions, now);
}

async function runRemindersForSessions(
  admin: SupabaseClient,
  sessions: Array<{
    id: string;
    slug: string;
    title: string;
    starts_at: string;
    ends_at: string;
    join_opens_at?: string | null;
    status: string;
    anni_reminder_sent_at?: string | null;
  }>,
  now: Date,
) {
  let sent = 0;
  let emails = 0;
  const base = appBaseUrl();
  const anniEmail = resolveLiveAnniEmail().toLowerCase();

  for (const session of sessions) {
    const until = Math.round(
      (new Date(session.starts_at).getTime() - now.getTime()) / 86_400_000,
    );
    if (until !== 1) continue;

    const sessionDate = formatLiveSessionDateLabel(session.starts_at);
    const sessionTime = formatLiveSessionTimeLabel(session.starts_at);
    const sessionUrl = base ? `${base}/live/${session.slug}` : `/live/${session.slug}`;
    const joinOpensMinutes = String(
      liveJoinOpensMinutesBefore(session.starts_at, session.join_opens_at),
    );
    const sessionMail: SessionMailFields & { join_opens_at?: string | null } = {
      id: session.id,
      slug: session.slug,
      title: session.title,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
      join_opens_at: session.join_opens_at,
    };
    let anniReminderDone = Boolean(session.anni_reminder_sent_at);

    const { data: rsvps, error: rErr } = await admin
      .from("live_session_rsvps")
      .select("user_id,status")
      .eq("session_id", session.id);
    if (rErr && !/live_session_rsvps|does not exist/i.test(rErr.message)) {
      throw new Error(rErr.message);
    }

    const acceptedIds = new Set(
      (rsvps ?? []).filter((r) => r.status === "accepted").map((r) => r.user_id),
    );
    const respondedIds = new Set((rsvps ?? []).map((r) => r.user_id));

    const { data: profiles } = acceptedIds.size
      ? await admin
          .from("profiles")
          .select("id,first_name,email,gender")
          .in("id", [...acceptedIds])
      : { data: [] as Array<{ id: string; first_name: string | null; email: string | null; gender: string | null }> };

    let emailSendIndex = 0;

    for (const profile of profiles ?? []) {
      if (!isRealMemberEmail(profile.email)) continue;
      const dedupeKey = `${session.id}:1d:accepted`;
      if (
        await hasNotificationDedupe(
          profile.id,
          NOTIFICATION_KINDS.liveSessionReminder1d,
          dedupeKey,
        )
      ) {
        continue;
      }

      await createUserNotification({
        userId: profile.id,
        kind: NOTIFICATION_KINDS.liveSessionReminder1d,
        title: "Erinnerung: Live mit Anni morgen",
        body: `${session.title} · ${sessionDate}`,
        linkUrl: "/live",
        linkLabel: "Zum Live-Raum",
        metadata: {
          session_id: session.id,
          slug: session.slug,
          dedupe_key: dedupeKey,
        },
      });
      sent += 1;

      try {
        const isAnni = profile.email.trim().toLowerCase() === anniEmail;
        if (isAnni) {
          if (!anniReminderDone) {
            const anniOk = await sendAnniReminderEmail(admin, {
              ...sessionMail,
              anni_reminder_sent_at: session.anni_reminder_sent_at ?? null,
            });
            if (anniOk) emails += 1;
            anniReminderDone = true;
          }
          continue;
        }
        if (!(await userAllowsMemberEmail(profile.id, "live"))) {
          continue;
        }
        const person = emailPersonVars({
          firstName: profile.first_name?.trim() || "Fan",
          gender: profile.gender,
        });
        if (emailSendIndex > 0) await paceBulkOutboundEmail(emailSendIndex);
        const ok = await sendOneLiveEmail({
          to: profile.email,
          templateKey: EMAIL_TEMPLATE_KEYS.liveSessionReminder,
          vars: {
            ...person,
            session_title: session.title,
            session_date: sessionDate,
            session_time: sessionTime,
            session_url: sessionUrl,
            calendar_url: liveSessionCalendarUrl(sessionMail),
          },
          session: sessionMail,
        });
        emailSendIndex += 1;
        if (ok) emails += 1;
      } catch (e) {
        console.error("[live-reminder] email failed", profile.id, e);
      }
    }

    const allRecipients = await listActiveMemberRecipients();
    const noRsvpRecipients = allRecipients.filter(
      (r) => !respondedIds.has(r.userId) && r.email.trim().toLowerCase() !== anniEmail,
    );
    const noRsvpEmailRecipients = await filterRecipientsByEmailPref(noRsvpRecipients, "live");

    const { data: noRsvpGenders } = noRsvpEmailRecipients.length
      ? await admin
          .from("profiles")
          .select("id,gender")
          .in(
            "id",
            noRsvpEmailRecipients.map((r) => r.userId),
          )
      : { data: [] as Array<{ id: string; gender: string | null }> };
    const genderById = new Map((noRsvpGenders ?? []).map((g) => [g.id, g.gender as string | null]));

    const queueItems: Array<Parameters<typeof enqueueOutboundEmails>[1][number]> = [];

    for (const recipient of noRsvpRecipients) {
      const dedupeKey = `${session.id}:1d:no_rsvp`;
      if (
        await hasNotificationDedupe(
          recipient.userId,
          NOTIFICATION_KINDS.liveSessionReminder1dNoRsvp,
          dedupeKey,
        )
      ) {
        continue;
      }

      await createUserNotification({
        userId: recipient.userId,
        kind: NOTIFICATION_KINDS.liveSessionReminder1dNoRsvp,
        title: "Morgen: Live mit Anni — noch offen",
        body: `${session.title} · ${sessionDate}. Du hast noch nicht reagiert — bitte kurz zusagen oder absagen.`,
        linkUrl: "/live",
        linkLabel: "Zur Live-Einladung",
        metadata: {
          session_id: session.id,
          slug: session.slug,
          dedupe_key: dedupeKey,
        },
      });
      sent += 1;

      if (!noRsvpEmailRecipients.some((r) => r.userId === recipient.userId)) continue;
      if (!isRealMemberEmail(recipient.email)) continue;

      const person = emailPersonVars({
        firstName: recipient.firstName,
        gender: genderById.get(recipient.userId),
      });
      queueItems.push({
        to: recipient.email,
        templateKey: EMAIL_TEMPLATE_KEYS.liveSessionReminderNoRsvp,
        templateVars: {
          ...person,
          session_title: session.title,
          session_date: sessionDate,
          session_url: sessionUrl,
          calendar_url: liveSessionCalendarUrl(sessionMail),
          join_opens_minutes: joinOpensMinutes,
        },
        context: { session_mail: sessionMail },
        dedupeKey: `live_reminder_no_rsvp:${session.id}:${recipient.userId}`,
      });
    }

    if (queueItems.length) {
      const { queued, errors } = await enqueueOutboundEmails(admin, queueItems);
      emails += queued;
      if (errors) {
        console.error("[live-reminder] no-rsvp queue errors:", errors);
      }
    }

    if (!anniReminderDone) {
      const anniOk = await sendAnniReminderEmail(admin, {
        ...session,
        anni_reminder_sent_at: null,
      });
      if (anniOk) emails += 1;
    }
  }

  return { sent, emails };
}
