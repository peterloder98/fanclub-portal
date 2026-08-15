import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncProfileMapCoords } from "@/lib/members/geocode-profile";
import { needsRegionalSnap } from "@/lib/members/regional-centers";

/** Max. Profile pro Seitenaufruf (Nominatim Rate-Limit). */
const BATCH_SIZE = 5;

let running = false;

/**
 * Geocodiert fehlende Kartenpositionen und migriert noch zu präzise gespeicherte
 * Koordinaten auf Regionalzentren (Datenschutz Mitglieder-Karte).
 */
export async function maybeGeocodeMissingProfiles(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const admin = createSupabaseAdminClient();
    const { data: missing, error: missingErr } = await admin
      .from("profiles")
      .select("id,postal_code,city,map_lat")
      .is("map_lat", null)
      .limit(40);
    if (missingErr) {
      console.error("[geocode] missing-profiles query failed:", missingErr.message);
      return;
    }

    const missingCandidates = (missing ?? []).filter(
      (p) => Boolean((p.postal_code ?? "").trim() || (p.city ?? "").trim()),
    );

    const toSync: string[] = missingCandidates.slice(0, BATCH_SIZE).map((p) => p.id);

    if (toSync.length < BATCH_SIZE) {
      const { data: existing, error: existingErr } = await admin
        .from("profiles")
        .select("id,postal_code,city,map_lat,map_lng")
        .not("map_lat", "is", null)
        .limit(80);
      if (existingErr) {
        console.error("[geocode] refresh-profiles query failed:", existingErr.message);
      } else {
        for (const p of existing ?? []) {
          if (toSync.length >= BATCH_SIZE) break;
          const lat = typeof p.map_lat === "number" ? p.map_lat : null;
          const lng = typeof p.map_lng === "number" ? p.map_lng : null;
          if (lat == null || lng == null) continue;
          if (!needsRegionalSnap(lat, lng)) continue;
          if (!((p.postal_code ?? "").trim() || (p.city ?? "").trim())) continue;
          toSync.push(p.id);
        }
      }
    }

    if (!toSync.length) return;

    for (const id of toSync) {
      try {
        await syncProfileMapCoords(admin, id);
      } catch (e) {
        console.error("[geocode] sync failed for", id, e);
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
