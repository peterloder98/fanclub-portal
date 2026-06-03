"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { formatEventStart, formatEventAddress } from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import type { MapEvent } from "./events-map.types";

const GERMANY_BOUNDS: L.LatLngBoundsExpression = [
  [46.9, 5.5], // SW (with padding)
  [55.9, 15.7], // NE
];

function MapLifecycle({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    // Leaflet sometimes renders with wrong size after reload/layout shifts.
    // Do a couple of size recalcs after mount.
    requestAnimationFrame(() => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const PIN_W = 30;
const PIN_H = 40;
const PIN_HEAD = 20;
/** Leaflet anchor: tip of pin — fixed so highlight only scales visually upward */
const PIN_ANCHOR: [number, number] = [PIN_W / 2, PIN_H - 2];

function createFlagIcon(highlighted = false) {
  const scale = highlighted ? 1.45 : 1;
  const headGradient = highlighted
    ? "linear-gradient(135deg,#f59e0b,#22c55e)"
    : "linear-gradient(135deg,#2563eb,#f43f5e)";
  const footGradient = highlighted
    ? "linear-gradient(135deg,#22c55e,#eab308)"
    : "linear-gradient(135deg,#f43f5e,#2563eb)";
  const stemColor = highlighted ? "#14532d" : "#0f172a";
  const headBorder = highlighted ? "3px solid #fef08a" : "2px solid rgba(255,255,255,.92)";
  const glow = highlighted
    ? "0 0 0 4px rgba(250,204,21,.45), 0 0 18px rgba(34,197,94,.55)"
    : "inset 0 2px 5px rgba(255,255,255,.35), inset 0 -3px 6px rgba(15,23,42,.22)";
  return L.divIcon({
    className: highlighted ? "fc-event-pin-highlight" : "",
    iconSize: [PIN_W, PIN_H],
    iconAnchor: PIN_ANCHOR,
    popupAnchor: [0, -34],
    html: `
      <div style="
        width:${PIN_W}px;height:${PIN_H}px;position:relative;
        transform:scale(${scale});
        transform-origin:50% 100%;
        filter: drop-shadow(0 10px 14px rgba(15,23,42,.22));
        transition: transform 0.15s ease, filter 0.15s ease;
      ">
        <div style="
          position:absolute;left:50%;top:0;transform:translateX(-50%);
          width:${PIN_HEAD}px;height:${PIN_HEAD}px;border-radius:12px;
          background: ${headGradient};
          border:${headBorder};
          box-shadow: ${glow};
        "></div>
        <div style="
          position:absolute;left:50%;top:3px;transform:translateX(-50%);
          width:10px;height:6px;border-radius:999px;
          background: rgba(255,255,255,.55);
          filter: blur(.2px);
        "></div>
        <div style="
          position:absolute;left:50%;top:18px;transform:translateX(-50%);
          width:3px;height:18px;border-radius:2px;background:${stemColor};opacity:.88;
        "></div>
        <div style="
          position:absolute;left:50%;top:33px;transform:translateX(-50%) rotate(45deg);
          width:10px;height:10px;border-radius:2px;
          background: ${footGradient};
          border:1px solid rgba(255,255,255,.72);
        "></div>
      </div>
    `,
  });
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

  const icon = useMemo(() => createFlagIcon(false), []);
  const iconHighlighted = useMemo(() => createFlagIcon(true), []);
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
    // When markers arrive (after SSR/data load), ensure map fits them.
    if (markers.length) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat as number, m.lng as number]));
      map.fitBounds(bounds, { padding: [18, 18] });
    } else {
      map.fitBounds(GERMANY_BOUNDS, { padding: [18, 18] });
    }
    requestAnimationFrame(() => map.invalidateSize());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markers.length]);

  // If the container is present, ensure a final size recalc shortly after.
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

    // If the parent layout reports 0px height at first paint, wait until it has a height
    // and then force a recalculation. This avoids the classic "blank/white map" state.
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
          // Use the canonical OSM tile server (more reliable than regional mirrors).
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {markers.map((e) => {
          const { date, time } = formatEventStart(e.start_at);
          const addr = formatEventAddress({
            address: e.address,
            postal_code: e.postal_code,
            city: e.city,
          });
          const ticket = ticketDisplay(e.ticket_url);
          return (
            <Marker
              key={e.id}
              position={[e.lat as number, e.lng as number]}
              icon={e.id === highlightedEventId ? iconHighlighted : icon}
              zIndexOffset={e.id === highlightedEventId ? 1000 : 0}
            >
              {/* Hover: quick preview */}
              <Tooltip direction="top" offset={[0, -16]} opacity={0.98} sticky={false}>
                <div className="min-w-[220px]">
                  <div className="text-sm font-semibold text-slate-900">{e.title}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {date}
                    {time ? ` · ${time} Uhr` : ""}
                  </div>
                  {addr ? <div className="mt-1 text-xs text-slate-600">{addr}</div> : null}
                </div>
              </Tooltip>
              <Popup closeButton autoPan>
                <div className="min-w-[220px]">
                  <div className="text-sm font-semibold text-slate-900">
                    {e.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {date}
                    {time ? ` · ${time} Uhr` : ""}
                  </div>
                  {addr ? <div className="mt-1 text-xs text-slate-600">{addr}</div> : null}
                  {ticket.href ? (
                    <a
                      className="mt-2 inline-flex text-xs font-medium text-blue-700 hover:underline"
                      href={ticket.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Tickets / Infos →
                    </a>
                  ) : ticket.text ? (
                    <div className="mt-2 text-xs text-slate-700">{ticket.text}</div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

