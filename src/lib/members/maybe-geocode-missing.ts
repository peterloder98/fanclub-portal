import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncProfileMapCoords } from "@/lib/members/geocode-profile";
import { isGermanCountry } from "@/lib/members/geocode-plz";

/** Max. Profile pro Seitenaufruf (Nominatim Rate-Limit). */
const BATCH_SIZE = 5;

let running = false;

/**
 * Geocodiert Profile ohne map_lat/map_lng aus PLZ/Adresse.
 * Im Hintergrund nach Mitglieder-Seitenaufruf, damit Import/Altbestand nachzieht.
 */
export async function maybeGeocodeMissingProfiles(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const admin = createSupabaseAdminClient();
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id,postal_code,country,map_lat,map_lng")
      .is("map_lat", null)
      .not("postal_code", "is", null)
      .limit(40);
    if (error) {
      console.error("[geocode] missing-profiles query failed:", error.message);
      return;
    }

    const candidates = (profiles ?? []).filter((p) => {
      const plz = (p.postal_code ?? "").replace(/\D/g, "").slice(0, 5);
      return plz.length === 5 && isGermanCountry(p.country);
    });
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
