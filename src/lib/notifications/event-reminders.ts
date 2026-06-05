import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserNotification } from "@/lib/notifications/create";
import { hasNotificationDedupe } from "@/lib/notifications/dedup";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { formatEventStart, formatLocation } from "@/lib/events/format";

function daysUntilEvent(startAt: string, ref = new Date()) {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return null;
  return Math.round((start.getTime() - ref.getTime()) / 86_400_000);
}

export async function runEventParticipationReminders(admin: SupabaseClient) {
  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  let sent = 0;
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 8);

  const { data: events, error: eErr } = await admin
    .from("external_events")
    .select("id,kind,title,start_at,venue,city,country,broadcaster,address,postal_code")
    .eq("is_visible", true)
    .gte("start_at", now.toISOString())
    .lte("start_at", horizon.toISOString());
  if (eErr) throw new Error(eErr.message);
  if (!events?.length) return { sent: 0 };

  const eventIds = events.map((e) => e.id);
  const { data: parts, error: pErr } = await admin
    .from("event_participations")
    .select("event_id,user_id")
    .in("event_id", eventIds);
  if (pErr) throw new Error(pErr.message);

  const eventById = new Map(events.map((e) => [e.id, e]));

  for (const part of parts ?? []) {
    const event = eventById.get(part.event_id);
    if (!event?.start_at) continue;
    const until = daysUntilEvent(event.start_at, now);
    if (until !== 7 && until !== 2) continue;

    const days = until as 7 | 2;
    const kind =
      days === 7 ? NOTIFICATION_KINDS.eventReminder7d : NOTIFICATION_KINDS.eventReminder2d;
    const dedupeKey = `${part.event_id}:${days}`;
    if (await hasNotificationDedupe(part.user_id, kind, dedupeKey)) continue;

    const { date } = formatEventStart(event.start_at);
    const location = formatLocation(event);
    const title = days === 7 ? `In 7 Tagen: ${event.title}` : `In 2 Tagen: ${event.title}`;

    await createUserNotification({
      userId: part.user_id,
      kind,
      title,
      body: [date, location].filter(Boolean).join(" · "),
      linkUrl: base ? `${base}/events` : "/events",
      linkLabel: "Zum Event",
      metadata: { event_id: part.event_id, days_before: days, dedupe_key: dedupeKey },
    });
    sent += 1;
  }

  return { sent };
}
