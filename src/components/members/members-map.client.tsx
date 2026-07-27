"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import type { MemberMapCluster } from "@/lib/members/cluster-map";
import { MAP_CI } from "@/lib/maps/ci-colors";
import { MapHoverOverlay } from "@/components/maps/map-hover-overlay";
import { UserAvatar } from "@/components/ui/user-avatar";
import L from "leaflet";

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

function markerStyle(count: number, active: boolean) {
  const baseR = clusterRadius(count);
  return {
    radius: active ? baseR + 6 : baseR,
    pathOptions: {
      color: active ? MAP_CI.gold : MAP_CI.navy,
      fillColor: active ? MAP_CI.blue : MAP_CI.sky,
      fillOpacity: active ? 0.95 : 0.78,
      weight: active ? 3.5 : 2,
    },
  };
}

function MapClickDismiss({ onDismiss }: { onDismiss: () => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onDismiss();
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onDismiss]);
  return null;
}

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize();
    run();
    const t1 = window.setTimeout(run, 100);
    const t2 = window.setTimeout(run, 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [map]);
  return null;
}

function FitMembersBounds({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 9, { animate: false });
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.18), {
        padding: [28, 28],
        maxZoom: 9,
        animate: false,
      });
    }
    requestAnimationFrame(() => map.invalidateSize());
    // points captured via key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function ClusterMemberCard({
  cluster,
  pinned,
}: {
  cluster: MemberMapCluster;
  pinned: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-fc-navy">{cluster.label}</p>
      {pinned ? (
        <p className="mt-0.5 text-[10px] text-slate-500">Erneut klicken oder Karte tippen zum Schließen</p>
      ) : null}
      <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto overscroll-contain">
        {cluster.members.map((m) => (
          <li key={m.userId} className="flex items-center gap-2">
            <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="xs" />
            <span className="min-w-0 truncate text-xs font-medium text-slate-700">{m.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const markers = useMemo(
    () => clusters.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)),
    [clusters],
  );

  const activeId = selectedId ?? hoveredId;
  const activeCluster = useMemo(
    () => (activeId ? markers.find((c) => c.id === activeId) ?? null : null),
    [activeId, markers],
  );

  const dismissSelected = useCallback(() => setSelectedId(null), []);

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
    <div className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border">
      <div className="relative min-h-0 flex-1">
        <MapContainer
          center={GERMANY_CENTER}
          zoom={6}
          minZoom={4}
          maxZoom={12}
          maxBounds={GERMANY_BOUNDS}
          maxBoundsViscosity={0.85}
          className="h-full w-full"
          scrollWheelZoom
          aria-label="Mitgliederkarte Deutschland"
        >
          <FitMembersBounds points={markers.map((c) => ({ lat: c.lat, lng: c.lng }))} />
          <MapResizeFix />
          <MapClickDismiss onDismiss={dismissSelected} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((c) => {
            const active = activeId === c.id;
            const { radius, pathOptions } = markerStyle(c.count, active);
            return (
              <CircleMarker
                key={c.id}
                center={[c.lat, c.lng]}
                radius={radius}
                pathOptions={pathOptions}
                eventHandlers={{
                  mouseover: () => {
                    if (!selectedId) setHoveredId(c.id);
                  },
                  mouseout: () => {
                    if (!selectedId) setHoveredId(null);
                  },
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    setHoveredId(null);
                    setSelectedId((prev) => (prev === c.id ? null : c.id));
                  },
                }}
              />
            );
          })}
          {activeCluster ? (
            <MapHoverOverlay
              lat={activeCluster.lat}
              lng={activeCluster.lng}
              pinOffsetY={28}
              interactive={Boolean(selectedId)}
            >
              <ClusterMemberCard
                cluster={activeCluster}
                pinned={Boolean(selectedId && selectedId === activeCluster.id)}
              />
            </MapHoverOverlay>
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
