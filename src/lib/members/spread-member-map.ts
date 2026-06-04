import type { MemberMapPoint } from "@/lib/members/cluster-map";

const BUCKET_DECIMALS = 3;

export type MemberMapPlacement = {
  point: MemberMapPoint;
  position: [number, number];
};

/** Gleiche Koordinaten leicht versetzen — jeder aktive Member bekommt einen sichtbaren Pin. */
export function spreadMemberMapPlacements(points: MemberMapPoint[]): MemberMapPlacement[] {
  const buckets = new Map<string, MemberMapPoint[]>();

  for (const p of points) {
    const key = `${p.lat.toFixed(BUCKET_DECIMALS)},${p.lng.toFixed(BUCKET_DECIMALS)}`;
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }

  const out: MemberMapPlacement[] = [];

  for (const group of buckets.values()) {
    if (group.length === 1) {
      const p = group[0];
      out.push({ point: p, position: [p.lat, p.lng] });
      continue;
    }

    const baseLat = group[0].lat;
    const baseLng = group[0].lng;
    const radius = 0.14 / Math.max(2, Math.sqrt(group.length));

    group.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      out.push({
        point: p,
        position: [
          baseLat + radius * Math.sin(angle),
          baseLng + radius * Math.cos(angle),
        ],
      });
    });
  }

  return out;
}
