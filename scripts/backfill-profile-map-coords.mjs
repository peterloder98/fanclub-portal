/**
 * Geocodiert alle Profile mit DE-PLZ und speichert map_lat/map_lng.
 * node --env-file=.env.local scripts/backfill-profile-map-coords.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, key);

function isGermanCountry(country) {
  const c = (country ?? "DE").trim().toUpperCase();
  return c === "DE" || c === "DEU" || c === "DEUTSCHLAND" || c === "GERMANY";
}

async function geocodeGermanPlz(plz, city) {
  const key = plz.replace(/\D/g, "").slice(0, 5);
  if (key.length !== 5) return null;
  try {
    const res = await fetch(`https://api.zippopotam.us/de/${key}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    const lat = place?.latitude != null ? Number(place.latitude) : NaN;
    const lng = place?.longitude != null ? Number(place.longitude) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

const { data: profiles, error } = await admin
  .from("profiles")
  .select("id,first_name,last_name,postal_code,city,country");
if (error) throw error;

let ok = 0;
let skip = 0;
for (const p of profiles ?? []) {
  const plz = (p.postal_code ?? "").replace(/\D/g, "").slice(0, 5);
  const city = (p.city ?? "").trim();
  if (!plz || plz.length !== 5 || !isGermanCountry(p.country)) {
    skip += 1;
    continue;
  }
  const coords = await geocodeGermanPlz(plz, city);
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
  console.log(`OK ${p.first_name} ${p.last_name} → ${coords.lat}, ${coords.lng}`);
}
console.log(`\nFertig: ${ok} geocodiert, ${skip} übersprungen.`);
