import type { SupabaseClient } from "@supabase/supabase-js";
import {
  eventAddressSignature,
  geocodeAllPendingArtistflowEvents,
} from "@/lib/artistflow/geocode-event";
import {
  eventCalendarDay,
  normalizeEventTitle,
} from "@/lib/artistflow/legacy-external-id";
import { relinkOrphanedPortalEventData } from "@/lib/artistflow/relink-portal-event-data";

type EventRow = {
  id: string;
  external_id: string;
  title: string;
  start_at: string | null;
  city: string | null;
  is_visible: boolean;
  kind: string | null;
  address: string | null;
  postal_code: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  participation_count: number;
  has_travel_note: boolean;
};

function groupKey(row: Pick<EventRow, "title" | "start_at">) {
  return `${normalizeEventTitle(row.title)}|${eventCalendarDay(row.start_at)}`;
}

function canonicalScore(row: EventRow) {
  let score = 0;
  score += row.participation_count * 100;
  if (row.has_travel_note) score += 50;
  if (row.lat != null && row.lng != null) score += 25;
  if (row.is_visible) score += 5;
  return score;
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
 * Führt Duplikat-Gruppen zusammen: Event mit Teilnahmen/Reiseinfos bleibt sichtbar,
 * leere Feed-Klone werden ausgeblendet. Anschließend Geocoding für sichtbare Events.
 */
export async function repairPortalEventData(admin: SupabaseClient) {
  const { data: events, error } = await admin
    .from("external_events")
    .select(
      "id,external_id,title,start_at,city,is_visible,kind,address,postal_code,country,lat,lng",
    )
    .eq("source", "artistflow");
  if (error) throw new Error(error.message);
  if (!events?.length) {
    return {
      groupsMerged: 0,
      eventsHidden: 0,
      participationsMoved: 0,
      travelNotesMoved: 0,
      geocoded: 0,
      pinsRestored: 0,
    };
  }

  const eventIds = events.map((e) => e.id);
  const participationCount = new Map<string, number>();
  const travelNoteIds = new Set<string>();

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

  const rows: EventRow[] = events.map((e) => ({
    id: e.id,
    external_id: e.external_id,
    title: e.title,
    start_at: e.start_at,
    city: e.city,
    is_visible: e.is_visible,
    kind: (e as { kind?: string }).kind ?? "event",
    address: e.address,
    postal_code: e.postal_code,
    country: e.country,
    lat: e.lat,
    lng: e.lng,
    participation_count: participationCount.get(e.id) ?? 0,
    has_travel_note: travelNoteIds.has(e.id),
  }));

  const groups = new Map<string, EventRow[]>();
  for (const row of rows) {
    const key = groupKey(row);
    if (!key.endsWith("|")) {
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
  }

  let groupsMerged = 0;
  let eventsHidden = 0;
  let participationsMoved = 0;
  let travelNotesMoved = 0;

  for (const [, members] of groups) {
    if (members.length < 2) continue;

    const sorted = [...members].sort((a, b) => canonicalScore(b) - canonicalScore(a));
    const canonical = sorted[0]!;
    const feedClone =
      sorted.find((m) => m.is_visible && m.participation_count === 0 && !m.has_travel_note) ??
      sorted.find((m) => m.is_visible) ??
      canonical;

    const { data: feedRow } = await admin
      .from("external_events")
      .select(
        "external_id,kind,title,start_at,timezone,venue,address,postal_code,city,country,broadcaster,ticket_url,published,secret,feed_updated_at,content_hash",
      )
      .eq("id", feedClone.id)
      .maybeSingle();

    const mergePatch: Record<string, unknown> = { is_visible: true };
    if (feedRow) Object.assign(mergePatch, feedRow);
    await admin.from("external_events").update(mergePatch).eq("id", canonical.id);

    for (const other of members) {
      if (other.id === canonical.id) continue;
      participationsMoved += await moveParticipations(admin, other.id, canonical.id);
      if (await moveTravelNote(admin, other.id, canonical.id)) travelNotesMoved += 1;
      await admin.from("external_events").update({ is_visible: false }).eq("id", other.id);
      eventsHidden += 1;
    }
    groupsMerged += 1;
  }

  const { data: visibleNoCoords } = await admin
    .from("external_events")
    .select("id,address,postal_code,city,country,geocoding_status")
    .eq("source", "artistflow")
    .eq("is_visible", true)
    .neq("kind", "tv")
    .is("lat", null)
    .not("city", "is", null);

  let pinsRestored = 0;
  for (const row of visibleNoCoords ?? []) {
    const sig = eventAddressSignature(row);
    await admin.from("geocoding_cache").delete().eq("address_signature", sig);
    await admin
      .from("external_events")
      .update({ geocoding_status: "pending" })
      .eq("id", row.id);
  }

  const { data: withCachedCoords } = await admin
    .from("external_events")
    .select("id,address,postal_code,city,country")
    .eq("source", "artistflow")
    .eq("is_visible", true)
    .is("lat", null)
    .not("city", "is", null);

  for (const row of withCachedCoords ?? []) {
    const sig = eventAddressSignature(row);
    const { data: cached } = await admin
      .from("geocoding_cache")
      .select("lat,lng,status")
      .eq("address_signature", sig)
      .eq("status", "success")
      .maybeSingle();
    if (cached?.lat != null && cached.lng != null) {
      await admin
        .from("external_events")
        .update({
          lat: cached.lat,
          lng: cached.lng,
          geocoding_status: "success",
          geocoded_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      pinsRestored += 1;
    }
  }

  const relinked = await relinkOrphanedPortalEventData(admin);
  participationsMoved += relinked.participationsMoved;
  travelNotesMoved += relinked.travelNotesMoved;

  const geocoded = await geocodeAllPendingArtistflowEvents(admin, { maxEvents: 120 });

  return {
    groupsMerged,
    eventsHidden,
    participationsMoved,
    travelNotesMoved,
    geocoded,
    pinsRestored,
  };
}
