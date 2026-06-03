import type { MapEvent } from "@/components/events/events-map.types";

const BUCKET_DECIMALS = 3;

export type MapMarkerPlacement = {
  event: MapEvent;
  /** Angezeigte Position (leicht versetzt bei Überlappung) */
  position: [number, number];
};

/** Gleiche/nahe Koordinaten leicht kreisförmig versetzen, damit Pins lesbar bleiben. */
export function spreadMapMarkerPlacements(events: MapEvent[]): MapMarkerPlacement[] {
  const buckets = new Map<string, MapEvent[]>();

  for (const e of events) {
    if (typeof e.lat !== "number" || typeof e.lng !== "number") continue;
    const key = `${e.lat.toFixed(BUCKET_DECIMALS)},${e.lng.toFixed(BUCKET_DECIMALS)}`;
    const list = buckets.get(key) ?? [];
    list.push(e);
    buckets.set(key, list);
  }

  const out: MapMarkerPlacement[] = [];

  for (const group of buckets.values()) {
    if (group.length === 1) {
      const e = group[0];
      out.push({ event: e, position: [e.lat as number, e.lng as number] });
      continue;
    }

    const baseLat = group[0].lat as number;
    const baseLng = group[0].lng as number;
    const radius = 0.12 / Math.max(2, Math.sqrt(group.length));

    group.forEach((e, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      out.push({
        event: e,
        position: [
          baseLat + radius * Math.sin(angle),
          baseLng + radius * Math.cos(angle),
        ],
      });
    });
  }

  return out;
}
