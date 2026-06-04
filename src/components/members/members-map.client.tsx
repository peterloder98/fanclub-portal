"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { MemberMapCluster } from "@/lib/members/cluster-map";

const GERMANY_BOUNDS: [[number, number], [number, number]] = [
  [47.0, 5.5],
  [55.4, 15.0],
];
const GERMANY_CENTER: [number, number] = [51.1, 10.45];

function clusterRadius(count: number) {
  if (count >= 10) return 18;
  if (count >= 5) return 14;
  if (count >= 2) return 11;
  return 8;
}

export function MembersMapClient({ clusters }: { clusters: MemberMapCluster[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const withCoords = useMemo(
    () => clusters.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)),
    [clusters],
  );

  if (!mounted) {
    return (
      <div
        className="grid h-full min-h-[360px] place-items-center rounded-xl border bg-slate-50 text-sm text-slate-500"
        role="status"
      >
        Karte wird geladen …
      </div>
    );
  }

  if (!withCoords.length) {
    return (
      <div
        className="grid h-full min-h-[360px] place-items-center rounded-xl border bg-slate-50 px-4 text-center text-sm text-slate-600"
        role="status"
      >
        Noch keine Standorte — sobald Mitglieder PLZ und Ort hinterlegt haben, erscheinen Pins.
      </div>
    );
  }

  return (
    <div className="h-full min-h-[360px] w-full overflow-hidden rounded-xl border">
      <MapContainer
        center={GERMANY_CENTER}
        zoom={5}
        minZoom={4}
        maxZoom={12}
        maxBounds={GERMANY_BOUNDS}
        maxBoundsViscosity={0.85}
        className="h-full w-full"
        scrollWheelZoom
        aria-label="Mitgliederkarte Deutschland"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={clusterRadius(c.count)}
            pathOptions={{
              color: "#1d4ed8",
              fillColor: c.count >= 5 ? "#2563eb" : "#60a5fa",
              fillOpacity: 0.75,
              weight: 2,
            }}
          >
            <Tooltip direction="top" opacity={0.95}>
              <span className="text-sm font-medium">
                {c.count === 1
                  ? `1 Mitglied · ${c.label}`
                  : `${c.count} Mitglieder · ${c.label}`}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
