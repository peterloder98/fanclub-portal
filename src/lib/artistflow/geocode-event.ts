import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeWithNominatim } from "@/lib/artistflow/geocode";
import { canGeocodeNormalizedEvent, computeHash } from "@/lib/artistflow/normalize";

export type GeocodeableEvent = {
  external_id: string;
  kind?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  address_signature?: string;
};

export function eventAddressSignatureBasis(parts: {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  return `${parts.address ?? ""}|${parts.postal_code ?? ""}|${parts.city ?? ""}|${parts.country ?? "DE"}`
    .toLowerCase()
    .trim();
}

export function eventAddressSignature(parts: {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  return computeHash(eventAddressSignatureBasis(parts));
}

export function eventAddressChanged(
  existing: {
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
  },
  nextSignature: string,
) {
  return eventAddressSignature(existing) !== nextSignature;
}

/** Einmalig geocodieren und in geocoding_cache + external_events speichern. */
export async function geocodeAndPersistEvent(
  admin: SupabaseClient,
  event: GeocodeableEvent,
): Promise<"cached" | "geocoded" | "skipped" | "failed"> {
  const payload = {
    kind: (event.kind ?? "event") as "event" | "tv",
    address: event.address ?? null,
    postal_code: event.postal_code ?? null,
    city: event.city ?? null,
    country: event.country ?? null,
  };

  if (!canGeocodeNormalizedEvent(payload)) {
    await admin
      .from("external_events")
      .update({ geocoding_status: "failed", geocoded_at: new Date().toISOString() })
      .eq("source", "artistflow")
      .eq("external_id", event.external_id);
    return "skipped";
  }

  const address_signature =
    event.address_signature ?? eventAddressSignature(payload);

  const { data: cached } = await admin
    .from("geocoding_cache")
    .select("lat,lng,status")
    .eq("address_signature", address_signature)
    .maybeSingle();

  if (cached?.status === "success" && cached.lat != null && cached.lng != null) {
    await admin
      .from("external_events")
      .update({
        lat: cached.lat,
        lng: cached.lng,
        geocoding_status: "success",
        geocoded_at: new Date().toISOString(),
      })
      .eq("source", "artistflow")
      .eq("external_id", event.external_id);
    return "cached";
  }

  if (cached?.status === "failed") {
    await admin
      .from("external_events")
      .update({ geocoding_status: "failed", geocoded_at: new Date().toISOString() })
      .eq("source", "artistflow")
      .eq("external_id", event.external_id);
    return "failed";
  }

  const geocoded = await geocodeWithNominatim({
    address: payload.address,
    postal_code: payload.postal_code,
    city: (payload.city ?? "").trim(),
    country: (payload.country ?? "DE").trim() || "DE",
    timeoutMs: 6000,
  });

  if (geocoded.status === "success") {
    await admin.from("geocoding_cache").upsert(
      {
        address_signature,
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
      .eq("external_id", event.external_id);
    return "geocoded";
  }

  await admin.from("geocoding_cache").upsert(
    { address_signature, status: "failed" },
    { onConflict: "address_signature" },
  );
  await admin
    .from("external_events")
    .update({ geocoding_status: "failed", geocoded_at: new Date().toISOString() })
    .eq("source", "artistflow")
    .eq("external_id", event.external_id);
  return "failed";
}

/** Alle pending Events geocodieren (Cache zuerst, dann Nominatim). */
export async function geocodeAllPendingArtistflowEvents(
  admin: SupabaseClient,
  { maxEvents = 80 }: { maxEvents?: number } = {},
): Promise<number> {
  let geocoded = 0;
  let rounds = 0;

  while (rounds < 20 && geocoded < maxEvents) {
    const { data: pending, error } = await admin
      .from("external_events")
      .select("external_id,kind,address,postal_code,city,country")
      .eq("source", "artistflow")
      .eq("geocoding_status", "pending")
      .eq("is_visible", true)
      .neq("kind", "tv")
      .limit(Math.min(10, maxEvents - geocoded));

    if (error || !pending?.length) break;

    for (const row of pending) {
      const result = await geocodeAndPersistEvent(admin, row);
      if (result === "geocoded") geocoded += 1;
    }
    rounds += 1;
  }

  return geocoded;
}
