/** PLZ → Koordinaten (Deutschland), mit Cache pro Prozess. */

import { geocodeWithNominatim } from "@/lib/artistflow/geocode";

const cache = new Map<string, { lat: number; lng: number } | null>();

export function isGermanCountry(country: string | null | undefined): boolean {
  const c = (country ?? "DE").trim().toUpperCase();
  return c === "DE" || c === "DEU" || c === "DEUTSCHLAND" || c === "GERMANY";
}

export async function geocodeGermanPlz(
  plz: string,
  city?: string | null,
): Promise<{ lat: number; lng: number } | null> {
  const key = plz.replace(/\D/g, "").slice(0, 5);
  if (key.length !== 5) return null;
  const cacheKey = city?.trim() ? `${key}|${city.trim().toLowerCase()}` : key;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  const fromZip = await geocodeViaZippopotam(key);
  if (fromZip) {
    cache.set(cacheKey, fromZip);
    return fromZip;
  }

  const fromNominatim = await geocodeWithNominatim({
    postal_code: key,
    city: city?.trim() || "",
    country: "Deutschland",
    timeoutMs: 6000,
  });
  if (fromNominatim.status === "success") {
    const coords = { lat: fromNominatim.lat, lng: fromNominatim.lng };
    cache.set(cacheKey, coords);
    return coords;
  }

  cache.set(cacheKey, null);
  return null;
}

async function geocodeViaZippopotam(plz: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/de/${plz}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: Array<{ latitude?: string; longitude?: string }>;
    };
    const place = data.places?.[0];
    const lat = place?.latitude != null ? Number(place.latitude) : NaN;
    const lng = place?.longitude != null ? Number(place.longitude) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
