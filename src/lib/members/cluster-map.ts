/** Mitgliedsstandorte zu Karten-Clustern (max. ~20 km Umkreis). */

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
  cities: string[];
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
  maxKm = 20,
): MemberMapCluster[] {
  const clusters: {
    lat: number;
    lng: number;
    count: number;
    cityCounts: Map<string, number>;
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
        const cityLabel = [p.postalCode, p.city].filter(Boolean).join(" ");
        c.cityCounts.set(cityLabel, (c.cityCounts.get(cityLabel) ?? 0) + 1);
        c.members.push(memberFromPoint(p));
        placed = true;
        break;
      }
    }
    if (!placed) {
      const cityLabel = [p.postalCode, p.city].filter(Boolean).join(" ");
      clusters.push({
        lat: p.lat,
        lng: p.lng,
        count: 1,
        cityCounts: new Map([[cityLabel, 1]]),
        members: [memberFromPoint(p)],
      });
    }
  }

  return clustersToResult(clusters);
}

/** Ein Pin pro Standort-Bucket (gleiche Koordinaten) — mit Mitgliederzahl, ohne 20-km-Zusammenlegung. */
export function groupMembersByMapLocation(points: MemberMapPoint[]): MemberMapCluster[] {
  const buckets = new Map<
    string,
    {
      lat: number;
      lng: number;
      count: number;
      cityCounts: Map<string, number>;
      members: MemberMapMember[];
    }
  >();

  for (const p of points) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      const cityLabel = p.city || p.postalCode;
      existing.cityCounts.set(cityLabel, (existing.cityCounts.get(cityLabel) ?? 0) + 1);
      existing.members.push(memberFromPoint(p));
    } else {
      buckets.set(key, {
        lat: p.lat,
        lng: p.lng,
        count: 1,
        cityCounts: new Map([[p.city || p.postalCode, 1]]),
        members: [memberFromPoint(p)],
      });
    }
  }

  const clusters = [...buckets.values()].map((b) => ({
    lat: b.lat,
    lng: b.lng,
    count: b.count,
    cityCounts: b.cityCounts,
    members: b.members,
  }));

  return clustersToResult(clusters);
}

function clustersToResult(
  clusters: {
    lat: number;
    lng: number;
    count: number;
    cityCounts: Map<string, number>;
    members: MemberMapMember[];
  }[],
): MemberMapCluster[] {
  return clusters.map((c, i) => {
    const cities = [...c.cityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    const label = c.count === 1 ? "1 Mitglied" : `${c.count} Mitglieder`;
    const members = [...c.members].sort((a, b) => a.name.localeCompare(b.name, "de"));
    return {
      id: `cluster-${i}`,
      lat: c.lat,
      lng: c.lng,
      count: c.count,
      label,
      cities,
      members,
    };
  });
}
