"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { EventMapMarker } from "./event-map-marker";
import { EventMapDetailPanel } from "./event-map-detail-panel";
import { MapClickDismiss } from "./map-click-dismiss";
import { spreadMapMarkerPlacements } from "@/lib/events/spread-map-markers";
import type { MapEvent } from "./events-map.types";

/** Deutschland (Dashboard: ganzes Land sichtbar), Events etwas enger */
const GERMANY_BOUNDS: L.LatLngBoundsExpression = [
  [47.0, 5.5],
  [55.4, 15.0],
];
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
  onEventSelect,
}: {
  events: MapEvent[];
  highlightedEventId?: string | null;
  /** Mindesthöhe der Karte in px */
  minHeight?: number;
  /** dashboard = näher auf Deutschland; events = Termine-Seite */
  mapVariant?: "dashboard" | "events";
  /** Karte füllt den Eltern-Container (Events-Seite) */
  fillHeight?: boolean;
  onEventSelect?: (eventId: string | null) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);

  const dismissDetails = useCallback(() => {
    setSelectedEventId(null);
    onEventSelect?.(null);
  }, [onEventSelect]);

  const selectEvent = useCallback(
    (eventId: string) => {
      ignoreNextMapClickRef.current = true;
      setHoveredEventId(null);
      setSelectedEventId((prev) => {
        const next = prev === eventId ? null : eventId;
        onEventSelect?.(next);
        return next;
      });
    },
    [onEventSelect],
  );

  const handleMapDismiss = useCallback(() => {
    if (ignoreNextMapClickRef.current) {
      ignoreNextMapClickRef.current = false;
      return;
    }
    dismissDetails();
  }, [dismissDetails]);

  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const ignoreNextMapClickRef = useRef(false);

  const effectiveHighlight = highlightedEventId ?? hoveredEventId;

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

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

  const placements = useMemo(() => spreadMapMarkerPlacements(markers), [markers]);

  const tooltipEventId = hoveredEventId && !selectedEventId ? hoveredEventId : null;

  useEffect(() => {
    if (!map) return;
    const dachMarkers = markers.filter((m) =>
      isDachCoord(m.lat as number, m.lng as number),
    );
    if (mapVariant === "dashboard") {
      map.fitBounds(GERMANY_BOUNDS, { padding: [10, 10], maxZoom: 6 });
    } else if (dachMarkers.length) {
      const bounds = L.latLngBounds(
        dachMarkers.map((m) => [m.lat as number, m.lng as number]),
      );
      map.fitBounds(bounds, { padding: [16, 16], maxZoom: 7 });
      const z = map.getZoom();
      if (z < 5) map.setZoom(5);
    } else {
      map.fitBounds(DACH_BOUNDS, { padding: [12, 12], maxZoom: 7 });
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

  useEffect(() => {
    if (!map || !selectedEventId) return;
    const placement = placements.find((p) => p.event.id === selectedEventId);
    if (!placement) return;
    const point = map.project(placement.position);
    const shifted = point.subtract([0, 72]);
    map.panTo(map.unproject(shifted), { animate: true, duration: 0.35 });
  }, [map, selectedEventId, placements]);

  useEffect(() => {
    if (!map) return;
    requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map, selectedEventId]);

  if (!mounted) {
    return <div className="text-sm text-slate-600">Lade Karte…</div>;
  }

  const heightStyle = fillHeight
    ? { height: "100%", width: "100%", minHeight }
    : { height: "100%", width: "100%", minHeight };

  const useFullHeight = fillHeight || mapVariant === "dashboard";

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-slate-50"
      style={
        useFullHeight
          ? { height: "100%", minHeight }
          : { minHeight, height: minHeight }
      }
    >
      <div className="relative min-h-0 flex-1">
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
          <MapClickDismiss onDismiss={handleMapDismiss} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {placements.map(({ event, position }) => (
            <EventMapMarker
              key={event.id}
              event={event}
              position={position}
              highlighted={event.id === effectiveHighlight}
              selected={event.id === selectedEventId}
              showTooltip={event.id === tooltipEventId && event.id !== selectedEventId}
              onSelect={selectEvent}
              onHover={setHoveredEventId}
            />
          ))}
        </MapContainer>

        {selectedEvent ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] px-1 pb-1">
            <div className="pointer-events-auto">
              <EventMapDetailPanel event={selectedEvent} onClose={dismissDetails} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
