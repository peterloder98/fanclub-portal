/** Gemeinsame Geocodierung für Skripte (Straße + PLZ + Ort → Nominatim, sonst Zippopotam). */

export function isGermanCountry(country) {
  const c = (country ?? "DE").trim().toUpperCase();
  return c === "DE" || c === "DEU" || c === "DEUTSCHLAND" || c === "GERMANY";
}

function buildQueries({ street, postal_code, city }) {
  const plz = (postal_code ?? "").replace(/\D/g, "").slice(0, 5);
  const cityTrim = (city ?? "").trim();
  const streetTrim = (street ?? "").trim();
  const country = "Deutschland";
  return [
    [streetTrim, plz, cityTrim, country].filter(Boolean).join(", "),
    [plz, cityTrim, country].filter(Boolean).join(", "),
    cityTrim ? `${cityTrim}, ${country}` : null,
  ].filter(Boolean);
}

async function nominatimSearch(q) {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("format", "json");
  u.searchParams.set("limit", "1");
  u.searchParams.set("q", q);
  const res = await fetch(u, {
    headers: { "User-Agent": "AnniPerkaFanclubPortal/seed (contact: mail@peter-loder.de)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const first = data?.[0];
  const lat = first?.lat != null ? Number(first.lat) : NaN;
  const lng = first?.lon != null ? Number(first.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocodeViaZippopotam(plz) {
  try {
    const res = await fetch(`https://api.zippopotam.us/de/${plz}`);
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

export async function geocodeProfileAddress(profile) {
  const plz = (profile.postal_code ?? "").replace(/\D/g, "").slice(0, 5);
  const city = (profile.city ?? "").trim();
  const street = (profile.street ?? "").trim();
  if (!plz || plz.length !== 5 || !isGermanCountry(profile.country)) return null;

  for (const q of buildQueries({ street, postal_code: plz, city })) {
    const coords = await nominatimSearch(q);
    if (coords) return coords;
    await sleep(1100);
  }

  return geocodeViaZippopotam(plz);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
