/**
 * Land aus Excel-Ort (z. B. "Altdorf - Schweiz") in profiles.country setzen,
 * Ort bereinigen, fehlende auf DE setzen, danach Geocoding für die 3 Auslandsmitglieder.
 *
 * node --env-file=.env.local scripts/fix-member-countries-from-xlsx.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geocodeProfileAddress, sleep } from "./lib/geocode-profile.mjs";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const excelPath = [
  join(root, "data/mitgliedsliste-emails-2026-07-26.xlsx"),
  "/Users/peterloder/Downloads/Mitgliedsliste Peter Stand 26.07.2026.xlsx",
].find((p) => existsSync(p));

if (!excelPath) {
  console.error("Excel nicht gefunden");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, key);

function parseOrt(ortRaw) {
  const raw = String(ortRaw ?? "").trim();
  if (!raw) return { city: null, country: "DE" };
  const split = raw.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (split) {
    const city = split[1].trim();
    const suffix = split[2].trim().toUpperCase();
    if (/SCHWEIZ|SUISSE|SWITZERLAND/.test(suffix)) return { city, country: "CH" };
    if (/NIEDER|HOLLAND|NETHERLANDS/.test(suffix)) return { city, country: "NL" };
    if (/ÖSTERREICH|OESTERREICH|AUSTRIA/.test(suffix)) return { city, country: "AT" };
    if (/DEUTSCHLAND|GERMANY/.test(suffix)) return { city, country: "DE" };
  }
  return { city: raw, country: "DE" };
}

const wb = XLSX.readFile(excelPath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
const fromExcel = new Map();
for (const r of rows.slice(3)) {
  if (r?.[0] == null || !r?.[1]) continue;
  const nr = String(r[0]).trim();
  if (!/^\d+$/.test(nr)) continue;
  fromExcel.set(nr, parseOrt(r[4]));
}

const { data: profiles, error } = await admin
  .from("profiles")
  .select("id,membership_number,first_name,last_name,street,postal_code,city,country")
  .not("membership_number", "is", null);
if (error) throw error;

let updated = 0;
const reGeocode = [];

for (const p of profiles ?? []) {
  const nr = String(p.membership_number).trim();
  const parsed = fromExcel.get(nr) ?? {
    city: (p.city ?? "").replace(/\s*[-–—]\s*(Schweiz|Niederlande|Niederande|Holland).*$/i, "").trim() || p.city,
    country: "DE",
  };

  // Falls Stadt noch Suffix enthält, bereinigen
  const cleaned = parseOrt(p.city);
  const city = parsed.country !== "DE" ? parsed.city : cleaned.country !== "DE" ? cleaned.city : parsed.city ?? p.city;
  const country = parsed.country !== "DE" ? parsed.country : cleaned.country !== "DE" ? cleaned.country : "DE";

  if (p.country === country && p.city === city) continue;

  const { error: upErr } = await admin
    .from("profiles")
    .update({ country, city })
    .eq("id", p.id);
  if (upErr) throw upErr;
  updated += 1;
  console.log(
    `OK Nr. ${nr} ${p.first_name} ${p.last_name}: ${p.city} / ${p.country} → ${city} / ${country}`,
  );
  if (country !== "DE") reGeocode.push(p.id);
}

console.log(`\n${updated} Profile aktualisiert.`);

for (const id of reGeocode) {
  const { data: p } = await admin
    .from("profiles")
    .select("id,first_name,last_name,street,postal_code,city,country")
    .eq("id", id)
    .maybeSingle();
  if (!p) continue;
  const coords = await geocodeProfileAddress({
    ...p,
    // Script geocode is DE-only — call Nominatim-style via street/city/country string
  });
  // Extend: use Nominatim directly for non-DE
  let latlng = coords;
  if (!latlng) {
    const q = [p.street, p.postal_code, p.city, p.country === "CH" ? "Schweiz" : p.country === "NL" ? "Niederlande" : p.country]
      .filter(Boolean)
      .join(", ");
    const u = new URL("https://nominatim.openstreetmap.org/search");
    u.searchParams.set("format", "json");
    u.searchParams.set("limit", "1");
    u.searchParams.set("q", q);
    const res = await fetch(u, {
      headers: { "User-Agent": "AnniPerkaFanclubPortal/seed (contact: mail@peter-loder.de)" },
    });
    if (res.ok) {
      const data = await res.json();
      const lat = data?.[0]?.lat != null ? Number(data[0].lat) : NaN;
      const lng = data?.[0]?.lon != null ? Number(data[0].lon) : NaN;
      if (Number.isFinite(lat) && Number.isFinite(lng)) latlng = { lat, lng };
    }
  }
  await sleep(1100);
  if (latlng) {
    await admin.from("profiles").update({ map_lat: latlng.lat, map_lng: latlng.lng }).eq("id", id);
    console.log(`Geo ${p.first_name} ${p.last_name} → ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
  } else {
    console.log(`— Geo fehlgeschlagen: ${p.first_name} ${p.last_name}`);
  }
}

const { data: abroad } = await admin
  .from("profiles")
  .select("membership_number,first_name,last_name,city,country")
  .neq("country", "DE")
  .order("membership_number");
console.log("\nAusland:", abroad);
