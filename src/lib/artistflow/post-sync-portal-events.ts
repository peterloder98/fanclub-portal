import type { SupabaseClient } from "@supabase/supabase-js";
import {
  eventAddressSignature,
  geocodeAllPendingArtistflowEvents,
} from "@/lib/artistflow/geocode-event";
import { relinkOrphanedPortalEventData } from "@/lib/artistflow/relink-portal-event-data";

/**
 * Sichere Nachbearbeitung nach Sync: Teilnahmen/Reiseinfos verknüpfen,
 * Pins aus Cache übernehmen, offene Adressen geocodieren — ohne Events auszublenden.
 */
export async function postSyncPortalEvents(admin: SupabaseClient) {
  const relinked = await relinkOrphanedPortalEventData(admin);

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

  const geocoded = await geocodeAllPendingArtistflowEvents(admin, { maxEvents: 120 });

  return {
    participationsMoved: relinked.participationsMoved,
    travelNotesMoved: relinked.travelNotesMoved,
    geocoded,
    pinsRestored,
  };
}
