import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncProfileMapCoords } from "@/lib/members/geocode-profile";

/** Max. Profile pro Seitenaufruf (Nominatim Rate-Limit). */
const BATCH_SIZE = 5;

let running = false;

/**
 * Geocodiert Profile ohne map_lat/map_lng aus Adresse (auch CH/NL).
 * Im Hintergrund nach Mitglieder-Seitenaufruf.
 */
export async function maybeGeocodeMissingProfiles(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const admin = createSupabaseAdminClient();
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id,postal_code,city,map_lat")
      .is("map_lat", null)
      .limit(40);
    if (error) {
      console.error("[geocode] missing-profiles query failed:", error.message);
      return;
    }

    const candidates = (profiles ?? []).filter(
      (p) => Boolean((p.postal_code ?? "").trim() || (p.city ?? "").trim()),
    );
    if (!candidates.length) return;

    for (const p of candidates.slice(0, BATCH_SIZE)) {
      try {
        await syncProfileMapCoords(admin, p.id);
      } catch (e) {
        console.error("[geocode] sync failed for", p.id, e);
      }
      await new Promise((r) => setTimeout(r, 1100));
    }
  } finally {
    running = false;
  }
}

/** Schedule background geocode after the response (Mitglieder-Seite). */
export function scheduleMissingProfileGeocode(): void {
  after(() => maybeGeocodeMissingProfiles());
}
