import type { SupabaseClient } from "@supabase/supabase-js";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { listActiveMemberRecipients } from "@/lib/members/list-active-member-recipients";
import { createUserNotification, notifyAllActiveMembers } from "@/lib/notifications/create";
import { hasNotificationDedupe } from "@/lib/notifications/dedup";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
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

export async function sendLiveSessionInviteEmails(
  session: Pick<LiveSessionRow, "id" | "slug" | "title" | "starts_at">,
): Promise<{ emails: number; notifications: number; errors: number }> {
  const recipients = await listActiveMemberRecipients();
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
    try {
      const person = emailPersonVars({
        firstName: r.firstName,
        gender: genderById.get(r.userId),
      });
      const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.liveSessionInvite, {
        ...person,
        session_title: session.title,
        session_date: sessionDate,
        session_url: sessionUrl,
      });
      const result = await sendEmailViaAccount({
        to: r.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        attachments: rendered.signatureAttachment
          ? [
              {
                filename: rendered.signatureAttachment.filename,
                content: Buffer.from(rendered.signatureAttachment.content),
                contentType: rendered.signatureAttachment.contentType,
                cid: rendered.signatureAttachment.cid,
              },
            ]
          : undefined,
      });
      if (result.ok) emails += 1;
      else errors += 1;
    } catch {
      errors += 1;
    }
    await sleep(200);
  }

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
    notifications = recipients.length;
  }

  await admin
    .from("live_sessions")
    .update({ invites_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", session.id);

  return { emails, notifications, errors };
}

export async function runLiveSessionReminders(admin: SupabaseClient) {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 2);

  const { data: sessions, error } = await admin
    .from("live_sessions")
    .select("id,slug,title,starts_at,ends_at,status")
    .in("status", ["scheduled", "live"])
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString());

  if (error) {
    if (/live_sessions|does not exist/i.test(error.message)) return { sent: 0, emails: 0 };
    throw new Error(error.message);
  }
  if (!sessions?.length) return { sent: 0, emails: 0 };

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
      if (/live_session_rsvps|does not exist/i.test(rErr.message)) continue;
      throw new Error(rErr.message);
    }
    if (!rsvps?.length) continue;

    const userIds = rsvps.map((r) => r.user_id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,first_name,email,gender")
      .in("id", userIds);

    const sessionDate = formatLiveSessionDateLabel(session.starts_at);
    const sessionTime = formatLiveSessionTimeLabel(session.starts_at);
    const sessionUrl = base
      ? `${base}/live/${session.slug}`
      : `/live/${session.slug}`;

    for (const profile of profiles ?? []) {
      if (!profile.email) continue;
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
        const person = emailPersonVars({
          firstName: profile.first_name?.trim() || "Fan",
          gender: profile.gender,
        });
        const rendered = await renderEmailFromTemplate(
          EMAIL_TEMPLATE_KEYS.liveSessionReminder,
          {
            ...person,
            session_title: session.title,
            session_date: sessionDate,
            session_time: sessionTime,
            session_url: sessionUrl,
          },
        );
        const result = await sendEmailViaAccount({
          to: profile.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
          attachments: rendered.signatureAttachment
            ? [
                {
                  filename: rendered.signatureAttachment.filename,
                  content: Buffer.from(rendered.signatureAttachment.content),
                  contentType: rendered.signatureAttachment.contentType,
                  cid: rendered.signatureAttachment.cid,
                },
              ]
            : undefined,
        });
        if (result.ok) emails += 1;
      } catch (e) {
        console.error("[live-reminder] email failed", profile.id, e);
      }
      await sleep(200);
    }
  }

  return { sent, emails };
}
