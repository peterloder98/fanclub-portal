import { geocodeAddressString } from "@/lib/artistflow/geocode";

export async function drivingDistanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AnniPerkaFanclubPortal/0.1" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { routes?: Array<{ distance?: number }> };
    const dist = json.routes?.[0]?.distance;
    return typeof dist === "number" && dist >= 0 ? Math.round(dist) : null;
  } catch {
    return null;
  }
}

export async function enrichTravelPlace(
  place: { name: string; address: string; link?: string | null },
  venue: { lat: number; lng: number } | null,
) {
  const geo = await geocodeAddressString(place.address || place.name);
  const lat = geo.status === "success" ? geo.lat : null;
  const lng = geo.status === "success" ? geo.lng : null;
  let distanceMeters: number | null = null;
  if (venue && lat != null && lng != null) {
    distanceMeters = await drivingDistanceMeters(venue, { lat, lng });
  }
  return {
    name: place.name,
    address: place.address,
    link: place.link ?? null,
    lat,
    lng,
    distanceMeters,
  };
}
