"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import type { MemberMapPlacement } from "@/lib/members/spread-member-map";

const GERMANY_BOUNDS: [[number, number], [number, number]] = [
  [47.0, 5.5],
  [55.4, 15.0],
];
const GERMANY_CENTER: [number, number] = [51.1, 10.45];

export function MembersMapClient({
  placements,
  memberCount,
}: {
  placements: MemberMapPlacement[];
  memberCount: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const markers = useMemo(
    () => placements.filter((p) => Number.isFinite(p.position[0]) && Number.isFinite(p.position[1])),
    [placements],
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
        {markers.map((m) => (
          <CircleMarker
            key={m.point.userId}
            center={m.position}
            radius={9}
            pathOptions={{
              color: "#1d4ed8",
              fillColor: "#60a5fa",
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Tooltip direction="top" opacity={0.95}>
              <span className="text-sm font-medium">
                {[m.point.postalCode, m.point.city].filter(Boolean).join(" ")}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="mt-2 px-1 text-center text-[10px] text-slate-500">
        {memberCount} {memberCount === 1 ? "Mitglied" : "Mitglieder"} auf der Karte
      </p>
    </div>
  );
}
