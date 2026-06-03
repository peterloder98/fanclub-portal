"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { EventMapMarker } from "./event-map-marker";
import type { MapEvent } from "./events-map.types";

/** Deutschland, Österreich, Südtirol */
const DACH_SW: [number, number] = [47.2, 5.8];
const DACH_NE: [number, number] = [55.2, 15.2];
const DACH_BOUNDS: L.LatLngBoundsExpression = [DACH_SW, DACH_NE];
const GERMANY_CENTER: [number, number] = [51.1, 10.45];

function isDachCoord(lat: number, lng: number) {
  return lat >= DACH_SW[0] && lat <= DACH_NE[0] && lng >= DACH_SW[1] && lng <= DACH_NE[1];
}

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
  minHeight = 320,
  mapVariant = "events",
  fillHeight = false,
}: {
  events: MapEvent[];
  highlightedEventId?: string | null;
  /** Mindesthöhe der Karte in px */
  minHeight?: number;
  /** dashboard = näher auf Deutschland; events = Termine-Seite */
  mapVariant?: "dashboard" | "events";
  /** Karte füllt den Eltern-Container (Events-Seite) */
  fillHeight?: boolean;
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
    const dachMarkers = markers.filter((m) =>
      isDachCoord(m.lat as number, m.lng as number),
    );
    const maxZoom = mapVariant === "dashboard" ? 8 : 7;
    const minZoom = mapVariant === "dashboard" ? 6 : 5;

    if (dachMarkers.length) {
      const bounds = L.latLngBounds(
        dachMarkers.map((m) => [m.lat as number, m.lng as number]),
      );
      map.fitBounds(bounds, { padding: [16, 16], maxZoom });
      const z = map.getZoom();
      if (z < minZoom) map.setZoom(minZoom);
    } else {
      map.setView(GERMANY_CENTER, mapVariant === "dashboard" ? 6 : 6);
    }
    requestAnimationFrame(() => map.invalidateSize());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markers.length, mapVariant]);

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

  const heightStyle = fillHeight
    ? { height: "100%", width: "100%", minHeight }
    : { height: "100%", width: "100%", minHeight };

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-2xl border bg-slate-50"
      style={fillHeight ? { height: "100%", minHeight } : { minHeight }}
    >
      <MapContainer
        className="h-full w-full"
        style={heightStyle}
        bounds={DACH_BOUNDS}
        boundsOptions={{ padding: [12, 12] }}
        scrollWheelZoom
        doubleClickZoom
        zoomControl
        minZoom={4}
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
