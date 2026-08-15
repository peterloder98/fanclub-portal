/** Gemeinsame Geocodierung für Skripte — nur PLZ/Ort, dann grob (keine Straße). */

export function isGermanCountry(country) {
  const c = (country ?? "DE").trim().toUpperCase();
  return c === "DE" || c === "DEU" || c === "DEUTSCHLAND" || c === "GERMANY";
}

function buildQueries({ postal_code, city }) {
  const plz = (postal_code ?? "").replace(/\D/g, "").slice(0, 5);
  const cityTrim = (city ?? "").trim();
  const country = "Deutschland";
  return [
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

/** Grobe Koordinaten aus PLZ/Ort (ohne Straße) — für Mitglieder-Karte. */
export async function geocodeProfileAddress(profile) {
  const plz = (profile.postal_code ?? "").replace(/\D/g, "");
  const city = (profile.city ?? "").trim();
  const countryRaw = (profile.country ?? "DE").trim().toUpperCase();
  const countryLabel =
    countryRaw === "CH" || countryRaw === "SCHWEIZ"
      ? "Schweiz"
      : countryRaw === "NL" || countryRaw === "NIEDERLANDE"
        ? "Niederlande"
        : countryRaw === "AT" || countryRaw === "ÖSTERREICH"
          ? "Österreich"
          : "Deutschland";

  if (!plz && !city) return null;

  if (!isGermanCountry(profile.country)) {
    const q = [profile.postal_code, city, countryLabel].filter(Boolean).join(", ");
    return nominatimSearch(q);
  }

  const dePlz = plz.slice(0, 5);
  if (dePlz.length === 5) {
    const fromZip = await geocodeViaZippopotam(dePlz);
    if (fromZip) return fromZip;
  }

  for (const q of buildQueries({ postal_code: dePlz, city })) {
    const coords = await nominatimSearch(q);
    if (coords) return coords;
    await sleep(1100);
  }

  return null;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
