"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import type { MemberMapCluster } from "@/lib/members/cluster-map";
import { MAP_CI } from "@/lib/maps/ci-colors";
import { Tooltip } from "react-leaflet";

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

function markerStyle(count: number, hovered: boolean) {
  const baseR = clusterRadius(count);
  return {
    radius: hovered ? baseR + 6 : baseR,
    pathOptions: {
      color: hovered ? MAP_CI.gold : MAP_CI.navy,
      fillColor: hovered ? MAP_CI.blue : MAP_CI.sky,
      fillOpacity: hovered ? 0.95 : 0.78,
      weight: hovered ? 3.5 : 2,
    },
  };
}

export function MembersMapClient({
  clusters,
  memberCount,
  totalActive,
}: {
  clusters: MemberMapCluster[];
  memberCount: number;
  totalActive?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const markers = useMemo(
    () => clusters.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)),
    [clusters],
  );

  if (!mounted) {
    return (
      <div
        className="grid h-full min-h-[360px] place-items-center rounded-xl border bg-fc-ice text-sm text-slate-500"
        role="status"
      >
        Karte wird geladen …
      </div>
    );
  }

  if (!markers.length) {
    return (
      <div
        className="grid h-full min-h-[360px] place-items-center rounded-xl border bg-fc-ice px-4 text-center text-sm text-slate-600"
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
          {markers.map((c) => {
            const hovered = hoveredId === c.id;
            const { radius, pathOptions } = markerStyle(c.count, hovered);
            return (
              <CircleMarker
                key={c.id}
                center={[c.lat, c.lng]}
                radius={radius}
                pathOptions={pathOptions}
                eventHandlers={{
                  mouseover: () => setHoveredId(c.id),
                  mouseout: () => setHoveredId(null),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, hovered ? -14 : -10]}
                  opacity={1}
                  className="fc-map-tooltip"
                >
                  <span className="text-sm font-bold text-fc-navy">{c.label}</span>
                  {c.count > 1 ? (
                    <span className="mt-0.5 block text-xs font-medium text-fc-blue">
                      {c.count} Mitglieder
                    </span>
                  ) : null}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      <p className="shrink-0 border-t bg-fc-ice px-2 py-1.5 text-center text-[11px] text-fc-navy/80">
        {memberCount} {memberCount === 1 ? "Mitglied" : "Mitglieder"} auf der Karte
        {typeof totalActive === "number" && totalActive > memberCount
          ? ` (${totalActive} aktiv)`
          : null}
        {markers.length > 0
          ? ` · ${markers.length} ${markers.length === 1 ? "Region" : "Regionen"}`
          : null}
      </p>
    </div>
  );
}
