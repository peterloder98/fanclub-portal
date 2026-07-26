/** Mitgliedsstandorte zu Karten-Clustern (Standard: 30 km Umkreis). */

export type MemberMapMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

export type MemberMapPoint = {
  userId: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
  name: string;
  avatarUrl: string | null;
};

export type MemberMapCluster = {
  id: string;
  lat: number;
  lng: number;
  count: number;
  label: string;
  members: MemberMapMember[];
};

const EARTH_KM = 6371;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(x)));
}

function memberFromPoint(p: MemberMapPoint): MemberMapMember {
  return {
    userId: p.userId,
    name: p.name,
    avatarUrl: p.avatarUrl,
  };
}

export function clusterMemberPoints(
  points: MemberMapPoint[],
  maxKm = 30,
): MemberMapCluster[] {
  const clusters: {
    lat: number;
    lng: number;
    count: number;
    members: MemberMapMember[];
  }[] = [];

  for (const p of points) {
    let placed = false;
    for (const c of clusters) {
      if (haversineKm(p, c) <= maxKm) {
        const n = c.count + 1;
        c.lat = (c.lat * c.count + p.lat) / n;
        c.lng = (c.lng * c.count + p.lng) / n;
        c.count = n;
        c.members.push(memberFromPoint(p));
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({
        lat: p.lat,
        lng: p.lng,
        count: 1,
        members: [memberFromPoint(p)],
      });
    }
  }

  return clusters.map((c, i) => ({
    id: `cluster-${i}`,
    lat: c.lat,
    lng: c.lng,
    count: c.count,
    label: c.count === 1 ? "1 Mitglied" : `${c.count} Mitglieder`,
    members: [...c.members].sort((a, b) => a.name.localeCompare(b.name, "de")),
  }));
}

/** Alias: bündelt ebenfalls im 30-km-Radius. */
export function groupMembersByMapLocation(points: MemberMapPoint[]): MemberMapCluster[] {
  return clusterMemberPoints(points, 30);
}
