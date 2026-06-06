import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ArtistflowFeedItem } from "@/lib/artistflow/normalize";
import {
  normalizeArtistflowEvent,
  type NormalizedExternalEvent,
} from "@/lib/artistflow/normalize";
import { eventAddressChanged } from "@/lib/artistflow/geocode-event";
import { eventStartChanged } from "@/lib/artistflow/legacy-external-id";
import {
  matchExistingExternalEvent,
  type ExistingExternalEventRow,
} from "@/lib/artistflow/match-existing-event";
import { feedMatchKey } from "@/lib/artistflow/feed-match-key";
import { postSyncPortalEvents } from "@/lib/artistflow/post-sync-portal-events";
import {
  maybeQueueEventAvailableNotice,
  sendEventAvailableNotices,
  type EventAvailableNotice,
} from "@/lib/notifications/event-available";
import type { SupabaseClient } from "@supabase/supabase-js";

type SyncResult = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  hidden: number;
  geocoding_queued: number;
  participations_reset: number;
  merged_duplicates: number;
  participations_relinked: number;
  travel_notes_relinked: number;
};

const STALE_RUNNING_MS = 5 * 60 * 1000;
const CONCURRENT_BLOCK_MS = 90 * 1000;

async function fetchJson(feedUrl: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Feed-Timeout — termine.json antwortet nicht rechtzeitig");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function reconcileAbandonedSyncLogs(admin: SupabaseClient) {
  const cutoff = new Date(Date.now() - STALE_RUNNING_MS).toISOString();
  await admin
    .from("artistflow_sync_logs")
    .update({
      finished_at: new Date().toISOString(),
      error: "abgebrochen (Timeout oder Server-Neustart)",
    })
    .is("finished_at", null)
    .lt("started_at", cutoff);
}

async function assertSyncNotBlocked(admin: SupabaseClient) {
  const { data: running } = await admin
    .from("artistflow_sync_logs")
    .select("id, started_at")
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!running?.started_at) return;

  const age = Date.now() - new Date(running.started_at).getTime();
  if (age < CONCURRENT_BLOCK_MS) {
    throw new Error(
      "Ein Sync läuft gerade noch. Bitte 1–2 Minuten warten und die Seite neu laden.",
    );
  }
}

async function patchSyncLog(
  admin: SupabaseClient,
  logId: string,
  patch: Record<string, unknown>,
) {
  await admin.from("artistflow_sync_logs").update(patch).eq("id", logId);
}

async function loadExistingEventIndex(admin: SupabaseClient) {
  const { data: events, error } = await admin
    .from("external_events")
    .select("id,external_id,title,start_at,city,content_hash,is_visible,address,postal_code,country,lat,lng,geocoding_status")
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
    for (const n of notes ?? []) {
      travelNoteIds.add(n.event_id);
    }
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

  return {
    rows,
    byId: new Map((events ?? []).map((e) => [e.id, e])),
  };
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

export async function syncArtistflowEventsFromFeed(feedUrl: string) {
  const admin = createSupabaseAdminClient();

  await reconcileAbandonedSyncLogs(admin);
  await assertSyncNotBlocked(admin);

  const { data: logRow, error: logErr } = await admin
    .from("artistflow_sync_logs")
    .insert({ feed_url: feedUrl })
    .select("id")
    .single();
  if (logErr) throw new Error(logErr.message);

  const logId = logRow.id as string;

  const result: SyncResult = {
    total: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    hidden: 0,
    geocoding_queued: 0,
    participations_reset: 0,
    merged_duplicates: 0,
    participations_relinked: 0,
    travel_notes_relinked: 0,
  };

  const newEventNotices: EventAvailableNotice[] = [];
  const matchedInternalIds = new Set<string>();
  const matchedFeedKeys = new Set<string>();

  try {
    const raw = await fetchJson(feedUrl);
    if (!Array.isArray(raw)) throw new Error("Feed is not an array");

    const normalized = raw.map((item) =>
      normalizeArtistflowEvent(item as ArtistflowFeedItem),
    );
    result.total = normalized.length;
    await patchSyncLog(admin, logId, { total: result.total });

    const { rows: existingRows, byId } = await loadExistingEventIndex(admin);
    let rows = [...existingRows];
    const feedKeys = new Set(normalized.map((e) => feedMatchKey(e)));

    for (const e of normalized) {
      const is_visible = Boolean(e.published) && !e.secret;
      const existing = matchExistingExternalEvent(e, rows, {
        excludeIds: matchedInternalIds,
      });
      const existingFull = existing ? byId.get(existing.id) : null;

      if (!existing || !existingFull) {
        const { data: insertedRow, error } = await admin
          .from("external_events")
          .insert({
            source: "artistflow",
            external_id: e.external_id,
            ...buildFeedFieldsPatch(e, is_visible),
            geocoding_status: "pending",
          })
          .select("id,external_id,title,start_at,city,content_hash,is_visible,address,postal_code,country,lat,lng,geocoding_status")
          .single();
        if (error) throw new Error(error.message);

        rows.push({
          id: insertedRow.id,
          external_id: insertedRow.external_id,
          title: insertedRow.title,
          start_at: insertedRow.start_at,
          city: insertedRow.city,
          content_hash: insertedRow.content_hash,
          is_visible: insertedRow.is_visible,
          participation_count: 0,
          has_travel_note: false,
        });
        byId.set(insertedRow.id, insertedRow);
        matchedInternalIds.add(insertedRow.id);
        matchedFeedKeys.add(feedMatchKey(e));
        result.inserted += 1;

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
        continue;
      }

      matchedInternalIds.add(existing.id);
      matchedFeedKeys.add(feedMatchKey(e));

      if (existing.content_hash === e.content_hash) {
        const wasVisible = existing.is_visible;
        await admin
          .from("external_events")
          .update({
            last_seen_at: new Date().toISOString(),
            is_visible,
            external_id: e.external_id,
          })
          .eq("id", existing.id);
        if (existing.external_id !== e.external_id) {
          existing.external_id = e.external_id;
        }
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
        existing.is_visible = is_visible;
        result.skipped += 1;
        continue;
      }

      const wasVisible = existing.is_visible;
      const dateChanged = eventStartChanged(existingFull.start_at, e.start_at);
      const addressChanged = eventAddressChanged(existingFull, e.address_signature);

      const updatePayload: Record<string, unknown> = {
        ...buildFeedFieldsPatch(e, is_visible),
        external_id: e.external_id,
      };
      if (addressChanged) {
        updatePayload.geocoding_status = "pending";
        updatePayload.lat = null;
        updatePayload.lng = null;
      }

      const { error } = await admin
        .from("external_events")
        .update(updatePayload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);

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
      existing.content_hash = e.content_hash;
      existing.external_id = e.external_id;
      existing.is_visible = is_visible;
      result.updated += 1;

      if (dateChanged) {
        const { error: delErr } = await admin
          .from("event_participations")
          .delete()
          .eq("event_id", existing.id);
        if (delErr) throw new Error(delErr.message);
        existing.participation_count = 0;
        result.participations_reset += 1;
      }

      const eventKey = feedMatchKey(e);
      const duplicateIds = rows
        .filter((r) => r.id !== existing.id)
        .filter(
          (r) =>
            feedMatchKey({
              kind: r.kind,
              title: r.title,
              start_at: r.start_at,
              city: r.city,
              broadcaster: r.broadcaster,
            }) === eventKey,
        )
        .map((r) => r.id);

      if (duplicateIds.length) {
        await admin
          .from("external_events")
          .update({ is_visible: false })
          .in("id", duplicateIds);
        rows = rows.map((r) =>
          duplicateIds.includes(r.id) ? { ...r, is_visible: false } : r,
        );
        result.merged_duplicates += duplicateIds.length;
      }
    }

    const toHide = rows.filter((r) => {
      if (!r.is_visible) return false;
      if (matchedInternalIds.has(r.id)) return false;
      const key = feedMatchKey({
        kind: r.kind,
        title: r.title,
        start_at: r.start_at,
        city: r.city,
        broadcaster: r.broadcaster,
      });
      if (!feedKeys.has(key)) return true;
      return matchedFeedKeys.has(key);
    });
    if (toHide.length) {
      const { error } = await admin
        .from("external_events")
        .update({ is_visible: false })
        .in(
          "id",
          toHide.map((x) => x.id),
        );
      if (error) throw new Error(error.message);
      result.hidden += toHide.length;
    }

    await sendEventAvailableNotices(admin, newEventNotices);

    const postSync = await postSyncPortalEvents(admin);
    result.participations_relinked = postSync.participationsMoved;
    result.travel_notes_relinked = postSync.travelNotesMoved;

    result.geocoding_queued = postSync.geocoded + postSync.pinsRestored;

    await patchSyncLog(admin, logId, {
      finished_at: new Date().toISOString(),
      total: result.total,
      inserted: result.inserted,
      updated: result.updated,
      hidden: result.hidden,
      geocoding_queued: result.geocoding_queued,
    });

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown sync error";
    await patchSyncLog(admin, logId, {
      finished_at: new Date().toISOString(),
      error: message,
    });
    throw e;
  }
}
