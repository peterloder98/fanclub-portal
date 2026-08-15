/** Mitgliedsstandorte → Regionen-Cluster (Datenschutz: keine Einzel-Heimatadressen). */

import {
  regionMapLabel,
  snapToRegionalCenter,
  type RegionalCenter,
} from "@/lib/members/regional-centers";

export type MemberMapMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

export type MemberMapPoint = {
  userId: string;
  postalCode: string;
  city: string;
  /** ISO-ähnlich (DE/NL/CH/AT) — Snap bleibt im gleichen Land. */
  country?: string | null;
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
  regionName: string;
  members: MemberMapMember[];
};

function memberFromPoint(p: MemberMapPoint): MemberMapMember {
  return {
    userId: p.userId,
    name: p.name,
    avatarUrl: p.avatarUrl,
  };
}

function centerForPoint(p: MemberMapPoint): RegionalCenter {
  return snapToRegionalCenter(p.lat, p.lng, p.city || null, p.country ?? null);
}

/**
 * Aggregiert Mitglieder je Regionalzentrum (nächste größere Stadt/Region).
 * Einzelpins an Wohnadressen gibt es nicht.
 */
export function clusterMemberPoints(points: MemberMapPoint[]): MemberMapCluster[] {
  const byRegion = new Map<
    string,
    { center: RegionalCenter; members: MemberMapMember[] }
  >();

  for (const p of points) {
    const center = centerForPoint(p);
    const bucket = byRegion.get(center.id);
    if (bucket) {
      bucket.members.push(memberFromPoint(p));
    } else {
      byRegion.set(center.id, {
        center,
        members: [memberFromPoint(p)],
      });
    }
  }

  return [...byRegion.values()]
    .map(({ center, members }) => {
      const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, "de"));
      return {
        id: center.id,
        lat: center.lat,
        lng: center.lng,
        count: sorted.length,
        regionName: center.name,
        label: regionMapLabel(center, sorted.length),
        members: sorted,
      };
    })
    .sort((a, b) => b.count - a.count || a.regionName.localeCompare(b.regionName, "de"));
}

/** @deprecated Alias — bündelt nach Region, nicht nach km-Radius. */
export function groupMembersByMapLocation(points: MemberMapPoint[]): MemberMapCluster[] {
  return clusterMemberPoints(points);
}

/** @deprecated Radius-Clustering entfällt zugunsten von Regionalzentren. */
export function clusterMemberPointsByKm(points: MemberMapPoint[], _maxKm = 30): MemberMapCluster[] {
  return clusterMemberPoints(points);
}
