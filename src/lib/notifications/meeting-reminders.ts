import type { SupabaseClient } from "@supabase/supabase-js";
import { formatEur } from "@/lib/club/ledger";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { createUserNotification } from "@/lib/notifications/create";
import { hasNotificationDedupe } from "@/lib/notifications/dedup";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

function daysUntil(startAt: string, ref = new Date()) {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return null;
  return Math.round((start.getTime() - ref.getTime()) / 86_400_000);
}

export async function runClubMeetingReminders(admin: SupabaseClient) {
  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 8);

  const { data: meetings, error: mErr } = await admin
    .from("club_meetings")
    .select("id,title,starts_at,venue,city,cost_cents,cost_label")
    .eq("status", "published")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString());
  if (mErr) {
    if (/club_meetings|does not exist/i.test(mErr.message)) return { sent: 0, emails: 0 };
    throw new Error(mErr.message);
  }
  if (!meetings?.length) return { sent: 0, emails: 0 };

  let sent = 0;
  let emails = 0;

  for (const meeting of meetings) {
    const until = daysUntil(meeting.starts_at, now);
    if (until !== 7 && until !== 2) continue;
    const days = until as 7 | 2;

    const { data: parts, error: pErr } = await admin
      .from("club_meeting_participations")
      .select("user_id,charge_cents,charge_status")
      .eq("meeting_id", meeting.id);
    if (pErr) throw new Error(pErr.message);
    if (!parts?.length) continue;

    const userIds = parts.map((p) => p.user_id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,first_name,email")
      .in("id", userIds);
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const dateLabel = new Date(meeting.starts_at).toLocaleString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const location = [meeting.venue, meeting.city].filter(Boolean).join(" · ");
    const meetingUrl = base ? `${base}/treffen/${meeting.id}` : `/treffen/${meeting.id}`;

    for (const part of parts) {
      const profile = profileById.get(part.user_id);
      if (!profile?.email) continue;

      const dedupeKey = `${meeting.id}:${days}`;
      const kind =
        days === 7
          ? NOTIFICATION_KINDS.eventReminder7d
          : NOTIFICATION_KINDS.eventReminder2d;
      if (await hasNotificationDedupe(part.user_id, kind, dedupeKey)) continue;

      const costHint =
        part.charge_status === "open" && (part.charge_cents ?? 0) > 0
          ? `Offener Kostenbeitrag: ${formatEur(part.charge_cents as number)}.`
          : meeting.cost_label?.trim() || "";

      await createUserNotification({
        userId: part.user_id,
        kind,
        title:
          days === 7
            ? `Fanclub-Treffen in 7 Tagen: ${meeting.title}`
            : `Fanclub-Treffen in 2 Tagen: ${meeting.title}`,
        body: [dateLabel, location, costHint].filter(Boolean).join(" · "),
        linkUrl: meetingUrl,
        linkLabel: "Zum Treffen",
        metadata: {
          meeting_id: meeting.id,
          days_before: days,
          dedupe_key: dedupeKey,
          type: "club_meeting",
        },
      });
      sent += 1;

      try {
        const rendered = await renderEmailFromTemplate(
          EMAIL_TEMPLATE_KEYS.clubMeetingReminder,
          {
            first_name: profile.first_name?.trim() || "Fan",
            meeting_title: meeting.title,
            meeting_date: dateLabel,
            meeting_location: location || "—",
            meeting_url: meetingUrl,
            cost_hint: costHint,
          },
        );
        await sendEmailViaAccount({
          to: profile.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
        emails += 1;
      } catch (e) {
        console.error("[meeting-reminder] email:", e);
      }
    }
  }

  return { sent, emails };
}
