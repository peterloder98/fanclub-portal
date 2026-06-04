/** PLZ → Koordinaten (Deutschland) via OpenPLZ API, mit einfachem In-Memory-Cache pro Prozess. */

const cache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeGermanPlz(plz: string): Promise<{ lat: number; lng: number } | null> {
  const key = plz.replace(/\D/g, "").slice(0, 5);
  if (key.length !== 5) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const res = await fetch(`https://openplzapi.org/de/Localities?postalCode=${key}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = (await res.json()) as Array<{ latitude?: number; longitude?: number }>;
    const row = data?.[0];
    const lat = row?.latitude;
    const lng = row?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") {
      cache.set(key, null);
      return null;
    }
    const coords = { lat, lng };
    cache.set(key, coords);
    return coords;
  } catch {
    cache.set(key, null);
    return null;
  }
}
