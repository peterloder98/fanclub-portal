/**
 * Geocodiert alle Profile (Straße + PLZ + Ort) und speichert map_lat/map_lng.
 * node --env-file=.env.local scripts/backfill-profile-map-coords.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { geocodeProfileAddress, isGermanCountry, sleep } from "./lib/geocode-profile.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, key);

const { data: profiles, error } = await admin
  .from("profiles")
  .select("id,first_name,last_name,street,postal_code,city,country");
if (error) throw error;

let ok = 0;
let skip = 0;
for (const p of profiles ?? []) {
  const plz = (p.postal_code ?? "").replace(/\D/g, "").slice(0, 5);
  if (!plz || plz.length !== 5 || !isGermanCountry(p.country)) {
    skip += 1;
    continue;
  }

  const coords = await geocodeProfileAddress(p);
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
  console.log(`OK ${p.first_name} ${p.last_name} → ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
}

console.log(`\nFertig: ${ok} geocodiert, ${skip} übersprungen.`);
