"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";

const CARD_W = 220;
const CARD_H_EST = 76;
const MARGIN = 10;

/**
 * Hover-Karte im Karten-Container (nicht Leaflet-Tooltip) — bleibt lesbar und am Pin.
 */
export function MapHoverOverlay({
  lat,
  lng,
  pinOffsetY = 34,
  children,
}: {
  lat: number;
  lng: number;
  /** Abstand Pin-Spitze → Kartenrand (px) */
  pinOffsetY?: number;
  children: ReactNode;
}) {
  const map = useMap();
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const pt = map.latLngToContainerPoint([lat, lng]);
      const { x: w, y: h } = map.getSize();

      let left = pt.x - CARD_W / 2;
      let top = pt.y - pinOffsetY - CARD_H_EST - MARGIN;

      if (pt.y < h * 0.3) {
        top = pt.y + pinOffsetY + MARGIN;
      } else if (pt.x > w * 0.72) {
        left = pt.x - CARD_W - pinOffsetY;
        top = pt.y - CARD_H_EST / 2;
      } else if (pt.x < w * 0.28) {
        left = pt.x + pinOffsetY;
        top = pt.y - CARD_H_EST / 2;
      }

      left = Math.max(MARGIN, Math.min(left, w - CARD_W - MARGIN));
      top = Math.max(MARGIN, Math.min(top, h - CARD_H_EST - MARGIN));
      setBox({ left, top });
    };

    update();
    map.on("move zoom resize viewreset", update);
    return () => {
      map.off("move zoom resize viewreset", update);
    };
  }, [map, lat, lng, pinOffsetY]);

  if (!box) return null;

  return createPortal(
    <div
      className="pointer-events-none absolute z-[1000] rounded-[10px] border border-slate-200/90 bg-white px-2.5 py-2 text-slate-900 shadow-lg shadow-slate-900/15"
      style={{ left: box.left, top: box.top, width: CARD_W }}
      role="tooltip"
    >
      {children}
    </div>,
    map.getContainer(),
  );
}
