"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import type { MemberMapCluster } from "@/lib/members/cluster-map";
import { MapTooltipTowardCenter } from "@/components/maps/map-tooltip-toward-center";

const GERMANY_BOUNDS: [[number, number], [number, number]] = [
  [47.0, 5.5],
  [55.4, 15.0],
];
const GERMANY_CENTER: [number, number] = [51.1, 10.45];

function clusterRadius(count: number) {
  if (count >= 6) return 16;
  if (count >= 3) return 13;
  if (count >= 2) return 11;
  return 9;
}

export function MembersMapClient({
  clusters,
  memberCount,
}: {
  clusters: MemberMapCluster[];
  memberCount: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const markers = useMemo(
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

  if (!markers.length) {
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
    <div className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-xl border">
      <div className="min-h-0 flex-1">
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
          {markers.map((c) => (
            <CircleMarker
              key={c.id}
              center={[c.lat, c.lng]}
              radius={clusterRadius(c.count)}
              pathOptions={{
                color: "#1d4ed8",
                fillColor: c.count >= 3 ? "#2563eb" : "#60a5fa",
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <MapTooltipTowardCenter position={[c.lat, c.lng]} anchorOffset={14}>
                <span className="text-sm font-semibold">{c.label}</span>
              </MapTooltipTowardCenter>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p className="shrink-0 border-t bg-slate-50 px-2 py-1.5 text-center text-[11px] text-slate-600">
        {memberCount} {memberCount === 1 ? "Mitglied" : "Mitglieder"} auf der Karte
        {markers.length < memberCount
          ? ` · ${markers.length} ${markers.length === 1 ? "Region" : "Regionen"}`
          : null}
      </p>
    </div>
  );
}
