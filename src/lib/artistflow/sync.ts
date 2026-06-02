import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { geocodeWithNominatim } from "@/lib/artistflow/geocode";
import type { ArtistflowFeedItem } from "@/lib/artistflow/normalize";
import { normalizeArtistflowEvent } from "@/lib/artistflow/normalize";

type SyncResult = {
  total: number;
  inserted: number;
  updated: number;
  hidden: number;
  geocoding_queued: number;
};

async function fetchJson(feedUrl: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(feedUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(t);
  }
}

export async function syncArtistflowEventsFromFeed(feedUrl: string) {
  const admin = createSupabaseAdminClient();

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

  try {
    const raw = await fetchJson(feedUrl);
    if (!Array.isArray(raw)) throw new Error("Feed is not an array");

    const normalized = raw.map((item) =>
      normalizeArtistflowEvent(item as ArtistflowFeedItem),
    );
    result.total = normalized.length;

    const seenIds = new Set(normalized.map((e) => e.external_id));

    for (const e of normalized) {
      // never visible if secret
      const is_visible = Boolean(e.published) && !e.secret;

      const { data: existing, error: exErr } = await admin
        .from("external_events")
        .select(
          "id,external_id,feed_updated_at,content_hash,address,postal_code,city,country,lat,lng,geocoding_status",
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
        const { error } = await admin.from("external_events").insert({
          source: "artistflow",
          external_id: e.external_id,
          title: e.title,
          start_at: e.start_at,
          timezone: e.timezone,
          venue: e.venue,
          address: e.address,
          postal_code: e.postal_code,
          city: e.city,
          country: e.country,
          ticket_url: e.ticket_url,
          published: e.published,
          secret: e.secret,
          feed_updated_at: e.feed_updated_at,
          content_hash: e.content_hash,
          last_seen_at: new Date().toISOString(),
          is_visible,
          geocoding_status: "pending",
        });
        if (error) throw new Error(error.message);
        result.inserted += 1;
      } else if (shouldUpdate) {
        const { error } = await admin
          .from("external_events")
          .update({
            title: e.title,
            start_at: e.start_at,
            timezone: e.timezone,
            venue: e.venue,
            address: e.address,
            postal_code: e.postal_code,
            city: e.city,
            country: e.country,
            ticket_url: e.ticket_url,
            published: e.published,
            secret: e.secret,
            feed_updated_at: e.feed_updated_at,
            content_hash: e.content_hash,
            last_seen_at: new Date().toISOString(),
            is_visible,
            geocoding_status: "pending",
          })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        result.updated += 1;
      } else {
        await admin
          .from("external_events")
          .update({ last_seen_at: new Date().toISOString(), is_visible })
          .eq("id", existing.id);
      }

      // Geocoding: allow city-only feeds (address/PLZ optional)
      if (e.city && e.country) {
        const { data: cached } = await admin
          .from("geocoding_cache")
          .select("lat,lng,status")
          .eq("address_signature", e.address_signature)
          .maybeSingle();

        if (cached?.status === "success" && cached.lat && cached.lng) {
          await admin
            .from("external_events")
            .update({
              lat: cached.lat,
              lng: cached.lng,
              geocoding_status: "success",
              geocoded_at: new Date().toISOString(),
            })
            .eq("source", "artistflow")
            .eq("external_id", e.external_id);
        } else if (!cached) {
          const addressForGeocode = e.address ?? e.venue ?? null;
          const geocoded = await geocodeWithNominatim({
            address: addressForGeocode,
            postal_code: e.postal_code,
            city: e.city,
            country: e.country,
          });

          if (geocoded.status === "success") {
            await admin.from("geocoding_cache").upsert(
              {
                address_signature: e.address_signature,
                lat: geocoded.lat,
                lng: geocoded.lng,
                status: "success",
              },
              { onConflict: "address_signature" },
            );

            await admin
              .from("external_events")
              .update({
                lat: geocoded.lat,
                lng: geocoded.lng,
                geocoding_status: "success",
                geocoded_at: new Date().toISOString(),
              })
              .eq("source", "artistflow")
              .eq("external_id", e.external_id);
            result.geocoding_queued += 1;
          } else {
            await admin.from("geocoding_cache").upsert(
              { address_signature: e.address_signature, status: "failed" },
              { onConflict: "address_signature" },
            );
            await admin
              .from("external_events")
              .update({
                geocoding_status: "failed",
                geocoded_at: new Date().toISOString(),
              })
              .eq("source", "artistflow")
              .eq("external_id", e.external_id);
          }
        }
      }
    }

    // Soft delete: hide events not in feed
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

    await admin
      .from("artistflow_sync_logs")
      .update({
        finished_at: new Date().toISOString(),
        total: result.total,
        inserted: result.inserted,
        updated: result.updated,
        hidden: result.hidden,
        geocoding_queued: result.geocoding_queued,
      })
      .eq("id", logId);

    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown sync error";
    await admin
      .from("artistflow_sync_logs")
      .update({ finished_at: new Date().toISOString(), error: message })
      .eq("id", logId);
    throw e;
  }
}

