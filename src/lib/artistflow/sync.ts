import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ArtistflowFeedItem } from "@/lib/artistflow/normalize";
import {
  normalizeArtistflowEvent,
  type NormalizedExternalEvent,
} from "@/lib/artistflow/normalize";
import { formatEventCity, formatTvBroadcaster } from "@/lib/events/format";
import {
  eventAddressChanged,
  geocodeAllPendingArtistflowEvents,
} from "@/lib/artistflow/geocode-event";
import { notifyAllActiveMembers } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import type { SupabaseClient } from "@supabase/supabase-js";

type SyncResult = {
  total: number;
  inserted: number;
  updated: number;
  hidden: number;
  geocoding_queued: number;
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

type NewEventNotice = {
  eventId: string;
  kind: NormalizedExternalEvent["kind"];
  title: string;
  startAt: string;
  city: string | null;
  country: string | null;
  broadcaster: string | null;
};

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
    hidden: 0,
    geocoding_queued: 0,
  };

  const newEventNotices: NewEventNotice[] = [];

  try {
    const raw = await fetchJson(feedUrl);
    if (!Array.isArray(raw)) throw new Error("Feed is not an array");

    const normalized = raw.map((item) =>
      normalizeArtistflowEvent(item as ArtistflowFeedItem),
    );
    result.total = normalized.length;

    await patchSyncLog(admin, logId, { total: result.total });

    const seenIds = new Set(normalized.map((e) => e.external_id));

    for (const e of normalized) {
      const is_visible = Boolean(e.published) && !e.secret;

      const { data: existing, error: exErr } = await admin
        .from("external_events")
        .select(
          "id,external_id,feed_updated_at,content_hash,ticket_url,address,postal_code,city,country,lat,lng,geocoding_status",
        )
        .eq("source", "artistflow")
        .eq("external_id", e.external_id)
        .maybeSingle();
      if (exErr) throw new Error(exErr.message);

      const shouldUpdate =
        !existing ||
        (e.feed_updated_at &&
          (!existing.feed_updated_at ||
            new Date(e.feed_updated_at).getTime() >
              new Date(existing.feed_updated_at).getTime())) ||
        (existing && existing.content_hash !== e.content_hash);

      if (!existing) {
        const { data: insertedRow, error } = await admin
          .from("external_events")
          .insert({
            source: "artistflow",
            external_id: e.external_id,
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
            geocoding_status: "pending",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        result.inserted += 1;

        if (is_visible && e.published && insertedRow?.id && e.start_at) {
          newEventNotices.push({
            eventId: insertedRow.id,
            kind: e.kind,
            title: e.title,
            startAt: e.start_at,
            city: e.city,
            country: e.country,
            broadcaster: e.broadcaster,
          });
        }
      } else if (shouldUpdate) {
        const addressChanged = eventAddressChanged(existing, e.address_signature);
        const updatePayload: Record<string, unknown> = {
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
        result.updated += 1;
      } else {
        const patch: Record<string, unknown> = {
          last_seen_at: new Date().toISOString(),
          is_visible,
        };
        if ((existing.ticket_url ?? "") !== (e.ticket_url ?? "")) {
          patch.ticket_url = e.ticket_url;
        }
        await admin.from("external_events").update(patch).eq("id", existing.id);
      }
    }

    const { data: allExisting, error: allErr } = await admin
      .from("external_events")
      .select("id,external_id,is_visible")
      .eq("source", "artistflow");
    if (allErr) throw new Error(allErr.message);

    const toHide = (allExisting ?? []).filter((r) => !seenIds.has(r.external_id));
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

    const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
      /\/$/,
      "",
    );
    for (const notice of newEventNotices) {
      const dateLabel = new Date(notice.startAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const location =
        notice.kind === "tv"
          ? formatTvBroadcaster(notice.broadcaster)
          : formatEventCity({ city: notice.city, country: notice.country });
      await notifyAllActiveMembers({
        kind: NOTIFICATION_KINDS.eventAvailable,
        title: notice.kind === "tv" ? "Neuer TV-Auftritt" : "Neues Event",
        body: `${notice.title} — ${dateLabel}${location ? `, ${location}` : ""}`,
        linkUrl: base ? `${base}/events` : "/events",
        linkLabel: "Zur Eventliste",
        metadata: { event_id: notice.eventId },
      }).catch(console.error);
    }

    result.geocoding_queued = await geocodeAllPendingArtistflowEvents(admin);

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
