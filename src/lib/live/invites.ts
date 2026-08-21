import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attachment } from "nodemailer/lib/mailer";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS, type EmailTemplateKey } from "@/lib/email/template-keys";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
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
import { appBaseUrl, liveMemberUrl, type LiveSessionRow } from "@/lib/live/types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatLiveSessionDateLabel(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLiveSessionTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SessionMailFields = Pick<
  LiveSessionRow,
  "id" | "slug" | "title" | "starts_at" | "ends_at"
>;

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
  const result = await sendEmailViaAccount({
    to: input.to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments: mailAttachments(input.session, rendered.signatureAttachment),
  });
  return result.ok;
}

export async function sendLiveSessionInviteEmails(
  session: SessionMailFields,
): Promise<{ emails: number; notifications: number; errors: number }> {
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
  let emails = 0;
  let errors = 0;

  for (const r of recipients) {
    if (r.email.trim().toLowerCase() === resolveLiveAnniEmail().toLowerCase()) {
      continue; // Anni erhält den Host-Link separat
    }
    try {
      const person = emailPersonVars({
        firstName: r.firstName,
        gender: genderById.get(r.userId),
      });
      const ok = await sendOneLiveEmail({
        to: r.email,
        templateKey: EMAIL_TEMPLATE_KEYS.liveSessionInvite,
        vars: {
          ...person,
          session_title: session.title,
          session_date: sessionDate,
          session_url: sessionUrl,
          calendar_url: liveSessionCalendarUrl(session),
        },
        session,
      });
      if (ok) emails += 1;
      else errors += 1;
    } catch {
      errors += 1;
    }
    await sleep(200);
  }

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
      linkUrl: `/live/${session.slug}`,
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

  return { emails, notifications, errors };
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

async function sendAnniReminderEmail(
  admin: SupabaseClient,
  session: SessionMailFields & { anni_reminder_sent_at?: string | null },
): Promise<boolean> {
  if (session.anni_reminder_sent_at) return false;

  const anniEmail = resolveLiveAnniEmail();
  const sessionDate = formatLiveSessionDateLabel(session.starts_at);
  const sessionTime = formatLiveSessionTimeLabel(session.starts_at);
  const base = appBaseUrl();
  const sessionUrl = base ? `${base}/live/${session.slug}` : `/live/${session.slug}`;
  const person = emailPersonVars({ firstName: "Anni", gender: "female" });

  try {
    const ok = await sendOneLiveEmail({
      to: anniEmail,
      templateKey: EMAIL_TEMPLATE_KEYS.liveSessionReminder,
      vars: {
        ...person,
        session_title: session.title,
        session_date: sessionDate,
        session_time: sessionTime,
        session_url: sessionUrl,
        calendar_url: liveSessionCalendarUrl(session),
      },
      session,
    });
    if (ok) {
      await admin
        .from("live_sessions")
        .update({
          anni_reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);
    }
    return ok;
  } catch (e) {
    console.error("[live-reminder] Anni email failed", e);
    return false;
  }
}

export async function runLiveSessionReminders(admin: SupabaseClient) {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 2);

  const { data: sessions, error } = await admin
    .from("live_sessions")
    .select("id,slug,title,starts_at,ends_at,status,anni_reminder_sent_at")
    .in("status", ["scheduled", "live"])
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString());

  if (error) {
    if (/live_sessions|does not exist/i.test(error.message)) return { sent: 0, emails: 0 };
    // Spalte fehlt noch — ohne Anni-Flag weiter
    if (/anni_reminder_sent_at/i.test(error.message)) {
      const fallback = await admin
        .from("live_sessions")
        .select("id,slug,title,starts_at,ends_at,status")
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
    status: string;
    anni_reminder_sent_at?: string | null;
  }>,
  now: Date,
) {
  let sent = 0;
  let emails = 0;
  const base = appBaseUrl();

  for (const session of sessions) {
    const until = Math.round(
      (new Date(session.starts_at).getTime() - now.getTime()) / 86_400_000,
    );
    if (until !== 1) continue;

    const { data: rsvps, error: rErr } = await admin
      .from("live_session_rsvps")
      .select("user_id")
      .eq("session_id", session.id)
      .eq("status", "accepted");
    if (rErr) {
      if (/live_session_rsvps|does not exist/i.test(rErr.message)) {
        /* nur Anni */
      } else {
        throw new Error(rErr.message);
      }
    }

    const userIds = (rsvps ?? []).map((r) => r.user_id);
    const { data: profiles } = userIds.length
      ? await admin.from("profiles").select("id,first_name,email,gender").in("id", userIds)
      : { data: [] as Array<{ id: string; first_name: string | null; email: string | null; gender: string | null }> };

    const sessionDate = formatLiveSessionDateLabel(session.starts_at);
    const sessionTime = formatLiveSessionTimeLabel(session.starts_at);
    const sessionUrl = base ? `${base}/live/${session.slug}` : `/live/${session.slug}`;
    const anniEmail = resolveLiveAnniEmail().toLowerCase();
    let anniReminderDone = Boolean(session.anni_reminder_sent_at);

    for (const profile of profiles ?? []) {
      if (!isRealMemberEmail(profile.email)) continue;
      const dedupeKey = `${session.id}:1d`;
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
        linkUrl: `/live/${session.slug}`,
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
        if (!isAnni && !(await userAllowsMemberEmail(profile.id, "live"))) {
          continue;
        }
        const person = emailPersonVars({
          firstName: profile.first_name?.trim() || "Fan",
          gender: profile.gender,
        });
        const ok = await sendOneLiveEmail({
          to: profile.email,
          templateKey: EMAIL_TEMPLATE_KEYS.liveSessionReminder,
          vars: {
            ...person,
            session_title: session.title,
            session_date: sessionDate,
            session_time: sessionTime,
            session_url: sessionUrl,
            calendar_url: liveSessionCalendarUrl(session),
          },
          session,
        });
        if (ok) emails += 1;
        if (ok && isAnni) {
          anniReminderDone = true;
          await admin
            .from("live_sessions")
            .update({
              anni_reminder_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.id);
        }
      } catch (e) {
        console.error("[live-reminder] email failed", profile.id, e);
      }
      await sleep(200);
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
