"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { EventMapMarker } from "./event-map-marker";
import type { MapEvent } from "./events-map.types";

const GERMANY_BOUNDS: L.LatLngBoundsExpression = [
  [46.9, 5.5],
  [55.9, 15.7],
];

function MapLifecycle({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    requestAnimationFrame(() => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function EventsMapClient({
  events,
  highlightedEventId = null,
}: {
  events: MapEvent[];
  highlightedEventId?: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const markers = useMemo(
    () =>
      events.filter(
        (e) =>
          typeof e.lat === "number" &&
          Number.isFinite(e.lat) &&
          typeof e.lng === "number" &&
          Number.isFinite(e.lng),
      ),
    [events],
  );

  useEffect(() => {
    if (!map) return;
    if (markers.length) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat as number, m.lng as number]));
      map.fitBounds(bounds, { padding: [18, 18] });
    } else {
      map.fitBounds(GERMANY_BOUNDS, { padding: [18, 18] });
    }
    requestAnimationFrame(() => map.invalidateSize());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markers.length]);

  useEffect(() => {
    if (!map) return;
    const t1 = setTimeout(() => map.invalidateSize(), 250);
    const t2 = setTimeout(() => map.invalidateSize(), 800);

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    const el = containerRef.current;
    const ro =
      el && "ResizeObserver" in window
        ? new ResizeObserver(() => {
            map.invalidateSize();
          })
        : null;
    if (el && ro) ro.observe(el);

    const onVisible = () => {
      if (document.visibilityState === "visible") map.invalidateSize();
    };
    document.addEventListener("visibilitychange", onVisible);

    const t3 = setTimeout(() => {
      const h = containerRef.current?.getBoundingClientRect().height ?? 0;
      if (h > 0) map.invalidateSize();
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisible);
      if (ro && el) ro.unobserve(el);
      ro?.disconnect();
    };
  }, [map]);

  if (!mounted) {
    return <div className="text-sm text-slate-600">Lade Karte…</div>;
  }

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[320px] w-full overflow-hidden rounded-2xl border bg-slate-50"
    >
      <MapContainer
        className="h-full min-h-[320px] w-full"
        style={{ height: "100%", width: "100%", minHeight: 320 }}
        bounds={GERMANY_BOUNDS}
        boundsOptions={{ padding: [18, 18] }}
        scrollWheelZoom
        doubleClickZoom
        zoomControl
        minZoom={5}
        maxZoom={18}
        attributionControl
      >
        <MapLifecycle onMap={setMap} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {markers.map((e) => (
          <EventMapMarker
            key={e.id}
            event={e}
            highlighted={e.id === highlightedEventId}
          />
        ))}
      </MapContainer>
    </div>
  );
}
