"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { computeMapHoverPlacement, type HoverPlacementSide } from "@/lib/maps/compute-hover-placement";

const CARD_W = 228;
const MARGIN = 10;

/**
 * Hover-Karte im Karten-Container — positioniert flexibel, damit der Pin sichtbar bleibt.
 */
export function MapHoverOverlay({
  lat,
  lng,
  pinOffsetY = 48,
  children,
}: {
  lat: number;
  lng: number;
  /** Höhe des Pins über dem Ankerpunkt (px) */
  pinOffsetY?: number;
  children: ReactNode;
}) {
  const map = useMap();
  const cardRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{
    left: number;
    top: number;
    side: HoverPlacementSide;
    ready: boolean;
  }>({ left: 0, top: 0, side: "top", ready: false });

  const reposition = () => {
    const el = cardRef.current;
    if (!el) return;

    const cardW = el.offsetWidth || CARD_W;
    const cardH = el.offsetHeight;
    if (cardH < 1) return;

    const pt = map.latLngToContainerPoint([lat, lng]);
    const { x: mapW, y: mapH } = map.getSize();
    const placement = computeMapHoverPlacement({
      pt,
      cardW,
      cardH,
      mapW,
      mapH,
      pinHeight: pinOffsetY,
      margin: MARGIN,
    });

    setBox({ left: placement.left, top: placement.top, side: placement.side, ready: true });
  };

  useLayoutEffect(() => {
    reposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, lat, lng, pinOffsetY, children]);

  useEffect(() => {
    reposition();
    map.on("move zoom resize viewreset", reposition);
    return () => {
      map.off("move zoom resize viewreset", reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, lat, lng, pinOffsetY]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(() => reposition());
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, lat, lng, pinOffsetY]);

  return createPortal(
    <div
      ref={cardRef}
      data-side={box.ready ? box.side : undefined}
      className="fc-map-hover-card pointer-events-none absolute z-[1000] overflow-hidden rounded-xl border-2 border-fc-navy/15 bg-gradient-to-br from-fc-ice via-white to-white px-3 py-2.5 text-fc-navy shadow-xl shadow-fc-navy/20 ring-2 ring-fc-gold/50"
      style={{
        left: box.ready ? box.left : -10_000,
        top: box.ready ? box.top : 0,
        width: CARD_W,
        visibility: box.ready ? "visible" : "hidden",
      }}
      role="tooltip"
    >
      <div className="fc-accent-bar mb-2" aria-hidden />
      {children}
    </div>,
    map.getContainer(),
  );
}
