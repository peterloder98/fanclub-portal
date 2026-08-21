import type { SupabaseClient } from "@supabase/supabase-js";
import { formatEventCity, formatTvBroadcaster } from "@/lib/events/format";
import { formatBerlinDate } from "@/lib/datetime/berlin";
import { sendMemberActivityBroadcast } from "@/lib/email/member-activity-broadcast";
import { notifyAllActiveMembers } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

export type EventAvailableNotice = {
  eventId: string;
  kind: "event" | "tv";
  title: string;
  startAt: string;
  city: string | null;
  country: string | null;
  broadcaster: string | null;
};

export function maybeQueueEventAvailableNotice(
  notices: EventAvailableNotice[],
  input: {
    eventId: string;
    wasVisible: boolean;
    isVisible: boolean;
    published: boolean;
    startAt: string | null;
    kind: "event" | "tv";
    title: string;
    city: string | null;
    country: string | null;
    broadcaster: string | null;
  },
) {
  if (input.wasVisible || !input.isVisible || !input.published || !input.startAt) return;
  notices.push({
    eventId: input.eventId,
    kind: input.kind,
    title: input.title,
    startAt: input.startAt,
    city: input.city,
    country: input.country,
    broadcaster: input.broadcaster,
  });
}

async function filterNotYetNotified(
  admin: SupabaseClient,
  notices: EventAvailableNotice[],
): Promise<EventAvailableNotice[]> {
  const out: EventAvailableNotice[] = [];
  for (const notice of notices) {
    const { data } = await admin
      .from("user_notifications")
      .select("id")
      .eq("kind", NOTIFICATION_KINDS.eventAvailable)
      .filter("metadata->>event_id", "eq", notice.eventId)
      .limit(1)
      .maybeSingle();
    if (!data) out.push(notice);
  }
  return out;
}

export async function sendEventAvailableNotices(
  admin: SupabaseClient,
  notices: EventAvailableNotice[],
) {
  const pending = await filterNotYetNotified(admin, notices);
  if (!pending.length) return;

  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );

  for (const notice of pending) {
    const dateLabel = formatBerlinDate(notice.startAt);
    const location =
      notice.kind === "tv"
        ? formatTvBroadcaster(notice.broadcaster)
        : formatEventCity({ city: notice.city, country: notice.country });
    await notifyAllActiveMembers({
      kind: NOTIFICATION_KINDS.eventAvailable,
      title: notice.kind === "tv" ? "Neuer TV-Auftritt" : "Neues Event",
      body: `${notice.title} — ${dateLabel}${location ? `, ${location}` : ""}`,
      linkUrl: base
        ? `${base}/events?focus=${notice.eventId}`
        : `/events?focus=${notice.eventId}`,
      linkLabel: "Zur Eventliste",
      metadata: { event_id: notice.eventId },
    }).catch(console.error);

    await sendMemberActivityBroadcast({
      kind: "event",
      entityId: notice.eventId,
      eventMeta: {
        title: notice.title,
        dateLabel,
        location,
        tv: notice.kind === "tv",
      },
    }).catch(console.error);
  }
}
