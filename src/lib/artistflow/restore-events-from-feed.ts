import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArtistflowFeedItem } from "@/lib/artistflow/normalize";
import {
  normalizeArtistflowEvent,
  type NormalizedExternalEvent,
} from "@/lib/artistflow/normalize";
import { feedMatchKey } from "@/lib/artistflow/feed-match-key";
import {
  matchExistingExternalEvent,
  type ExistingExternalEventRow,
} from "@/lib/artistflow/match-existing-event";
import { postSyncPortalEvents } from "@/lib/artistflow/post-sync-portal-events";
import { relinkOrphanedPortalEventData } from "@/lib/artistflow/relink-portal-event-data";
import {
  maybeQueueEventAvailableNotice,
  sendEventAvailableNotices,
  type EventAvailableNotice,
} from "@/lib/notifications/event-available";

async function fetchFeed(feedUrl: string) {
  const res = await fetch(feedUrl, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
  const raw = (await res.json()) as unknown;
  if (!Array.isArray(raw)) throw new Error("Feed is not an array");
  return raw.map((item) => normalizeArtistflowEvent(item as ArtistflowFeedItem));
}

function buildFeedFieldsPatch(e: NormalizedExternalEvent, is_visible: boolean) {
  return {
    kind: e.kind,
    title: e.title,
    start_at: e.start_at,
    timezone: e.timezone,
    venue: e.venue,
    address: e.address,
    postal_code: e.postal_code,
    city: e.city,
    country: e.country,
    broadcaster: e.broadcaster,
    ticket_url: e.ticket_url,
    published: e.published,
    secret: e.secret,
    feed_updated_at: e.feed_updated_at,
    content_hash: e.content_hash,
    last_seen_at: new Date().toISOString(),
    is_visible,
  };
}

async function moveParticipations(
  admin: SupabaseClient,
  fromId: string,
  toId: string,
): Promise<number> {
  if (fromId === toId) return 0;
  const { data: parts } = await admin
    .from("event_participations")
    .select("user_id")
    .eq("event_id", fromId);
  let moved = 0;
  for (const p of parts ?? []) {
    const { error } = await admin.from("event_participations").insert({
      event_id: toId,
      user_id: p.user_id,
    });
    if (!error) moved += 1;
    else if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
  }
  if (parts?.length) {
    await admin.from("event_participations").delete().eq("event_id", fromId);
  }
  return moved;
}

async function moveTravelNote(
  admin: SupabaseClient,
  fromId: string,
  toId: string,
): Promise<boolean> {
  if (fromId === toId) return false;
  const { data: note } = await admin
    .from("event_admin_notes")
    .select("event_id,travel_info,updated_at,updated_by")
    .eq("event_id", fromId)
    .maybeSingle();
  if (!note) return false;

  const { data: targetNote } = await admin
    .from("event_admin_notes")
    .select("event_id")
    .eq("event_id", toId)
    .maybeSingle();

  if (!targetNote) {
    await admin.from("event_admin_notes").upsert({
      event_id: toId,
      travel_info: note.travel_info,
      updated_at: note.updated_at,
      updated_by: note.updated_by,
    });
  }
  await admin.from("event_admin_notes").delete().eq("event_id", fromId);
  return true;
}

/**
 * Stellt alle Feed-Events als sichtbar wieder her — ohne Events zu verstecken,
 * die nicht eindeutig Duplikate eines Feed-Eintrags sind.
 */
export async function restoreVisibleEventsFromFeed(
  admin: SupabaseClient,
  feedUrl: string,
) {
  const normalized = await fetchFeed(feedUrl);
  const feedKeys = new Set(normalized.map((e) => feedMatchKey(e)));

  const { data: events, error } = await admin
    .from("external_events")
    .select(
      "id,external_id,title,start_at,city,kind,broadcaster,content_hash,is_visible",
    )
    .eq("source", "artistflow");
  if (error) throw new Error(error.message);

  const eventIds = (events ?? []).map((e) => e.id);
  const participationCount = new Map<string, number>();
  const travelNoteIds = new Set<string>();

  if (eventIds.length) {
    const { data: parts } = await admin
      .from("event_participations")
      .select("event_id")
      .in("event_id", eventIds);
    for (const p of parts ?? []) {
      participationCount.set(p.event_id, (participationCount.get(p.event_id) ?? 0) + 1);
    }

    const { data: notes } = await admin
      .from("event_admin_notes")
      .select("event_id")
      .in("event_id", eventIds);
    for (const n of notes ?? []) travelNoteIds.add(n.event_id);
  }

  const rows: ExistingExternalEventRow[] = (events ?? []).map((e) => ({
    id: e.id,
    external_id: e.external_id,
    title: e.title,
    start_at: e.start_at,
    city: e.city,
    kind: (e as { kind?: string }).kind ?? "event",
    broadcaster: (e as { broadcaster?: string | null }).broadcaster ?? null,
    content_hash: e.content_hash,
    is_visible: e.is_visible,
    participation_count: participationCount.get(e.id) ?? 0,
    has_travel_note: travelNoteIds.has(e.id),
  }));

  const usedIds = new Set<string>();
  const newEventNotices: EventAvailableNotice[] = [];
  let restored = 0;
  let inserted = 0;
  let duplicatesHidden = 0;
  let participationsMoved = 0;
  let travelNotesMoved = 0;

  for (const e of normalized) {
    const is_visible = Boolean(e.published) && !e.secret;
    const available = rows.filter((r) => !usedIds.has(r.id));
    const existing = matchExistingExternalEvent(e, available);

    if (existing) {
      const wasVisible = existing.is_visible;
      await admin
        .from("external_events")
        .update({
          ...buildFeedFieldsPatch(e, is_visible),
          external_id: e.external_id,
        })
        .eq("id", existing.id);
      maybeQueueEventAvailableNotice(newEventNotices, {
        eventId: existing.id,
        wasVisible,
        isVisible: is_visible,
        published: e.published,
        startAt: e.start_at,
        kind: e.kind,
        title: e.title,
        city: e.city,
        country: e.country,
        broadcaster: e.broadcaster,
      });
      usedIds.add(existing.id);
      restored += 1;

      const key = feedMatchKey(e);
      const dupes = rows.filter(
        (r) => r.id !== existing.id && feedMatchKey(r) === key && !usedIds.has(r.id),
      );
      for (const dupe of dupes) {
        participationsMoved += await moveParticipations(admin, dupe.id, existing.id);
        if (await moveTravelNote(admin, dupe.id, existing.id)) travelNotesMoved += 1;
        await admin.from("external_events").update({ is_visible: false }).eq("id", dupe.id);
        usedIds.add(dupe.id);
        duplicatesHidden += 1;
      }
      continue;
    }

    const { data: insertedRow, error: insErr } = await admin
      .from("external_events")
      .insert({
        source: "artistflow",
        external_id: e.external_id,
        ...buildFeedFieldsPatch(e, is_visible),
        geocoding_status: "pending",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    maybeQueueEventAvailableNotice(newEventNotices, {
      eventId: insertedRow.id,
      wasVisible: false,
      isVisible: is_visible,
      published: e.published,
      startAt: e.start_at,
      kind: e.kind,
      title: e.title,
      city: e.city,
      country: e.country,
      broadcaster: e.broadcaster,
    });
    usedIds.add(insertedRow.id);
    inserted += 1;
    restored += 1;
  }

  const toHideNotInFeed = (events ?? []).filter((e) => {
    if (!e.is_visible) return false;
    if (usedIds.has(e.id)) return false;
    const key = feedMatchKey({
      kind: (e as { kind?: string }).kind,
      title: e.title,
      start_at: e.start_at,
      city: e.city,
      broadcaster: (e as { broadcaster?: string | null }).broadcaster,
    });
    return !feedKeys.has(key);
  });

  let hiddenNotInFeed = 0;
  if (toHideNotInFeed.length) {
    const { error: hideErr } = await admin
      .from("external_events")
      .update({ is_visible: false })
      .in(
        "id",
        toHideNotInFeed.map((x) => x.id),
      );
    if (hideErr) throw new Error(hideErr.message);
    hiddenNotInFeed = toHideNotInFeed.length;
  }

  const relinked = await relinkOrphanedPortalEventData(admin);
  participationsMoved += relinked.participationsMoved;
  travelNotesMoved += relinked.travelNotesMoved;

  const post = await postSyncPortalEvents(admin);
  await sendEventAvailableNotices(admin, newEventNotices);

  return {
    feedTotal: normalized.length,
    restored,
    inserted,
    duplicatesHidden,
    hiddenNotInFeed,
    participationsMoved,
    travelNotesMoved,
    geocoded: post.geocoded,
    pinsRestored: post.pinsRestored,
  };
}
