export type EventTravelPlace = {
  name: string;
  address: string;
  link?: string | null;
  lat?: number | null;
  lng?: number | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
};

export type EventTravelInfo = {
  station: EventTravelPlace | null;
  hotels: EventTravelPlace[];
  notes?: string | null;
};

export type EventTravelNoteRow = {
  eventId: string;
  travel: EventTravelInfo;
  updatedAt: string | null;
};

const emptyTravel = (): EventTravelInfo => ({
  station: null,
  hotels: [],
  notes: null,
});

function parsePlace(raw: unknown): EventTravelPlace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const address = typeof o.address === "string" ? o.address.trim() : "";
  if (!name && !address) return null;
  return {
    name,
    address,
    link: typeof o.link === "string" ? o.link.trim() || null : null,
    lat: typeof o.lat === "number" ? o.lat : null,
    lng: typeof o.lng === "number" ? o.lng : null,
    distanceMeters: typeof o.distanceMeters === "number" ? o.distanceMeters : null,
    durationSeconds: typeof o.durationSeconds === "number" ? o.durationSeconds : null,
  };
}

export function parseTravelInfo(raw: unknown): EventTravelInfo {
  if (!raw || typeof raw !== "object") return emptyTravel();
  const o = raw as Record<string, unknown>;
  const hotelsRaw = Array.isArray(o.hotels) ? o.hotels : [];
  const hotels = hotelsRaw
    .map(parsePlace)
    .filter((p): p is EventTravelPlace => Boolean(p))
    .slice(0, 3);
  return {
    station: parsePlace(o.station),
    hotels,
    notes: typeof o.notes === "string" ? o.notes.trim() || null : null,
  };
}

export function travelInfoHasContent(travel: EventTravelInfo) {
  return Boolean(
    travel.station?.name ||
      travel.station?.address ||
      travel.hotels.length ||
      travel.notes,
  );
}

export function formatWalkDistance(meters: number | null | undefined) {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}

export function formatWalkDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `ca. ${mins} Min.`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `ca. ${h} Std. ${m} Min.` : `ca. ${h} Std.`;
}

export function formatWalkingRoute(
  meters: number | null | undefined,
  seconds: number | null | undefined,
) {
  const dist = formatWalkDistance(meters);
  const dur = formatWalkDuration(seconds);
  if (dist && dur) return `${dist} · ${dur} zu Fuß`;
  if (dist) return `${dist} zu Fuß`;
  return null;
}

export function closestHotelIndex(hotels: EventTravelPlace[]) {
  let best = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  hotels.forEach((h, i) => {
    if (h.distanceMeters != null && h.distanceMeters < bestDist) {
      bestDist = h.distanceMeters;
      best = i;
    }
  });
  return best;
}

export function travelInfoSummary(travel: EventTravelInfo) {
  const parts: string[] = [];
  if (travel.station?.name) parts.push(`Bahnhof: ${travel.station.name}`);
  const closest = closestHotelIndex(travel.hotels);
  if (closest >= 0) parts.push(`Hotel: ${travel.hotels[closest].name}`);
  else if (travel.hotels[0]?.name) parts.push(`Hotel: ${travel.hotels[0].name}`);
  return parts.join(" · ");
}

export type TravelPlaceInput = {
  name: string;
  address: string;
  link?: string | null;
};

export type TravelInfoInput = {
  station: TravelPlaceInput | null;
  hotels: TravelPlaceInput[];
  notes?: string | null;
};

export function normalizeTravelInput(input: TravelInfoInput): EventTravelInfo {
  const station =
    input.station?.name?.trim() || input.station?.address?.trim()
      ? {
          name: input.station.name.trim(),
          address: input.station.address.trim(),
          link: null,
        }
      : null;
  const hotels = (input.hotels ?? [])
    .filter((h) => h.name?.trim() || h.address?.trim())
    .slice(0, 3)
    .map((h) => ({
      name: h.name.trim(),
      address: h.address.trim(),
      link: h.link?.trim() || null,
    }));
  return {
    station,
    hotels,
    notes: input.notes?.trim() || null,
  };
}
