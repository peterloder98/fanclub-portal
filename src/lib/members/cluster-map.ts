/** Mitgliedsstandorte zu Karten-Clustern (max. ~20 km Umkreis). */

export type MemberMapPoint = {
  userId: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
};

export type MemberMapCluster = {
  id: string;
  lat: number;
  lng: number;
  count: number;
  label: string;
  cities: string[];
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

export function clusterMemberPoints(
  points: MemberMapPoint[],
  maxKm = 20,
): MemberMapCluster[] {
  const clusters: {
    lat: number;
    lng: number;
    count: number;
    cityCounts: Map<string, number>;
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
      });
    }
  }

  return clusters.map((c, i) => {
    const cities = [...c.cityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    const top = cities[0] ?? "Region";
    const label =
      c.count === 1
        ? top
        : cities.length === 1
          ? `${top} (${c.count} Mitglieder)`
          : `Region · ${c.count} Mitglieder`;
    return {
      id: `cluster-${i}`,
      lat: c.lat,
      lng: c.lng,
      count: c.count,
      label,
      cities,
    };
  });
}
