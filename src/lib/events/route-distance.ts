import { geocodeAddressString } from "@/lib/artistflow/geocode";

export async function walkingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<{ distanceMeters: number; durationSeconds: number } | null> {
  const url = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AnniPerkaFanclubPortal/0.1" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: Array<{ distance?: number; duration?: number }>;
    };
    const route = json.routes?.[0];
    const distanceMeters = route?.distance;
    const durationSeconds = route?.duration;
    if (
      typeof distanceMeters !== "number" ||
      typeof durationSeconds !== "number" ||
      distanceMeters < 0
    ) {
      return null;
    }
    return {
      distanceMeters: Math.round(distanceMeters),
      durationSeconds: Math.round(durationSeconds),
    };
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
  let durationSeconds: number | null = null;
  if (venue && lat != null && lng != null) {
    const route = await walkingRoute(venue, { lat, lng });
    if (route) {
      distanceMeters = route.distanceMeters;
      durationSeconds = route.durationSeconds;
    }
  }
  return {
    name: place.name,
    address: place.address,
    link: place.link ?? null,
    lat,
    lng,
    distanceMeters,
    durationSeconds,
  };
}
