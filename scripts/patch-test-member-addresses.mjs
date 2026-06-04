/**
 * Trägt Fake-Adressen (Straße, PLZ, Ort) bei Testmitgliedern ein — ohne Neu-Seed.
 * node --env-file=.env.local scripts/patch-test-member-addresses.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key);

const MEMBER_ADDRESSES = [
  { street: "Sendlinger Str. 14", postal_code: "80331", city: "München" },
  { street: "Speersort 1", postal_code: "20095", city: "Hamburg" },
  { street: "Unter den Linden 77", postal_code: "10117", city: "Berlin" },
  { street: "Domkloster 4", postal_code: "50667", city: "Köln" },
  { street: "Zeil 85", postal_code: "60313", city: "Frankfurt am Main" },
  { street: "Königstraße 28", postal_code: "70173", city: "Stuttgart" },
  { street: "Nikolaistraße 33", postal_code: "04109", city: "Leipzig" },
  { street: "Prager Str. 4", postal_code: "01069", city: "Dresden" },
  { street: "Kröpcke 1", postal_code: "30159", city: "Hannover" },
  { street: "Königstraße 39", postal_code: "90402", city: "Nürnberg" },
];

let updated = 0;
for (let i = 0; i < MEMBER_ADDRESSES.length; i++) {
  const num = String(i + 1).padStart(2, "0");
  const email = `mail+mitglied${num}@peter-loder.de`;
  const addr = MEMBER_ADDRESSES[i];

  const { data: profile } = await admin
    .from("profiles")
    .select("id,first_name,last_name")
    .eq("email", email)
    .maybeSingle();

  if (!profile?.id) {
    console.log(`Übersprungen (nicht gefunden): ${email}`);
    continue;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      street: addr.street,
      postal_code: addr.postal_code,
      city: addr.city,
      country: "DE",
    })
    .eq("id", profile.id);

  if (!error) {
    const plz = addr.postal_code.replace(/\D/g, "").slice(0, 5);
    const res = await fetch(`https://api.zippopotam.us/de/${plz}`);
    if (res.ok) {
      const data = await res.json();
      const place = data.places?.[0];
      const lat = place?.latitude != null ? Number(place.latitude) : null;
      const lng = place?.longitude != null ? Number(place.longitude) : null;
      if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
        await admin.from("profiles").update({ map_lat: lat, map_lng: lng }).eq("id", profile.id);
      }
    }
  }

  if (error) {
    console.error(`${email}: ${error.message}`);
    continue;
  }

  updated += 1;
  console.log(`OK ${profile.first_name} ${profile.last_name} — ${addr.street}, ${addr.postal_code} ${addr.city}`);
}

console.log(`\nAktualisiert: ${updated} Profile`);
