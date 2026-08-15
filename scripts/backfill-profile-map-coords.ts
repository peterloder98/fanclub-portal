/**
 * Geocodiert Profile für die Mitglieder-Karte (PLZ/Ort → Regionalzentrum im gleichen Land).
 * Mit --all auch bereits gesetzte Koordinaten neu berechnen.
 *
 *   npx --yes tsx --env-file=.env.local scripts/backfill-profile-map-coords.ts
 *   npx --yes tsx --env-file=.env.local scripts/backfill-profile-map-coords.ts --all
 */
import { createClient } from "@supabase/supabase-js";
import { geocodeProfileMapCoords } from "../src/lib/members/geocode-profile";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env");
    process.exit(1);
  }

  const forceAll = process.argv.includes("--all");
  const admin = createClient(url, key);

  let query = admin
    .from("profiles")
    .select("id,first_name,last_name,postal_code,city,country,map_lat");
  if (!forceAll) query = query.is("map_lat", null);

  const { data: profiles, error } = await query;
  if (error) throw error;

  console.log(
    `${profiles?.length ?? 0} Profile zu geocodieren${forceAll ? " (--all)" : " (ohne map_lat)"}…`,
  );

  let ok = 0;
  let skip = 0;
  for (const p of profiles ?? []) {
    const hasAddress = Boolean((p.postal_code ?? "").trim() || (p.city ?? "").trim());
    if (!hasAddress) {
      skip += 1;
      continue;
    }

    const coords = await geocodeProfileMapCoords(p);
    await sleep(1100);

    if (!coords) {
      skip += 1;
      console.log(`— ${p.first_name} ${p.last_name} (keine Koordinaten)`);
      continue;
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update({ map_lat: coords.lat, map_lng: coords.lng })
      .eq("id", p.id);
    if (upErr) {
      if (upErr.message.includes("map_lat")) {
        console.error("Spalten map_lat/map_lng fehlen — bitte supabase/045 ausführen.");
        process.exit(1);
      }
      throw upErr;
    }
    ok += 1;
    console.log(
      `OK ${p.first_name} ${p.last_name} (${p.city ?? "?"}, ${p.country ?? "DE"}) → Raum ${coords.regionName}`,
    );
  }

  console.log(`\nFertig: ${ok} geocodiert, ${skip} übersprungen.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
