"use client";

import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { MapEvent } from "./events-map.types";

const PIN_W = 30;
const PIN_H = 40;
const PIN_HEAD = 20;
const HIGHLIGHT_SCALE = 1.35;
const SLOT_W = Math.ceil(PIN_W * HIGHLIGHT_SCALE);
const SLOT_H = Math.ceil(PIN_H * HIGHLIGHT_SCALE);
const ICON_ANCHOR: [number, number] = [SLOT_W / 2, SLOT_H];

function pinHtml(highlighted: boolean, selected: boolean) {
  const scale = highlighted || selected ? HIGHLIGHT_SCALE : 1;
  const headGradient =
    selected || highlighted
      ? "linear-gradient(135deg,#f59e0b,#22c55e)"
      : "linear-gradient(135deg,#2563eb,#f43f5e)";
  const footGradient =
    selected || highlighted
      ? "linear-gradient(135deg,#22c55e,#eab308)"
      : "linear-gradient(135deg,#f43f5e,#2563eb)";
  const stemColor = selected || highlighted ? "#14532d" : "#0f172a";
  const headBorder =
    selected || highlighted ? "3px solid #fef08a" : "2px solid rgba(255,255,255,.92)";
  const glow =
    selected || highlighted
      ? "0 0 0 4px rgba(250,204,21,.45), 0 0 18px rgba(34,197,94,.55)"
      : "inset 0 2px 5px rgba(255,255,255,.35), inset 0 -3px 6px rgba(15,23,42,.22)";
  const left = (SLOT_W - PIN_W) / 2;

  return `
    <div style="width:${SLOT_W}px;height:${SLOT_H}px;position:relative;">
      <div style="
        position:absolute;left:${left}px;bottom:0;
        width:${PIN_W}px;height:${PIN_H}px;
        transform:scale(${scale});
        transform-origin:50% 100%;
        filter: drop-shadow(0 10px 14px rgba(15,23,42,.22));
        transition: transform 0.15s ease, filter 0.15s ease;
      ">
        <div style="
          position:absolute;left:50%;top:0;transform:translateX(-50%);
          width:${PIN_HEAD}px;height:${PIN_HEAD}px;border-radius:12px;
          background:${headGradient};
          border:${headBorder};
          box-shadow:${glow};
        "></div>
        <div style="
          position:absolute;left:50%;top:3px;transform:translateX(-50%);
          width:10px;height:6px;border-radius:999px;
          background:rgba(255,255,255,.55);
        "></div>
        <div style="
          position:absolute;left:50%;top:18px;transform:translateX(-50%);
          width:3px;height:18px;border-radius:2px;background:${stemColor};opacity:.88;
        "></div>
        <div style="
          position:absolute;left:50%;top:33px;transform:translateX(-50%) rotate(45deg);
          width:10px;height:10px;border-radius:2px;
          background:${footGradient};
          border:1px solid rgba(255,255,255,.72);
        "></div>
      </div>
    </div>
  `;
}

function createPinIcon(highlighted: boolean, selected: boolean) {
  return L.divIcon({
    className: highlighted || selected ? "fc-event-pin-highlight" : "",
    iconSize: [SLOT_W, SLOT_H],
    iconAnchor: ICON_ANCHOR,
    html: pinHtml(highlighted, selected),
  });
}

export function EventMapMarker({
  event,
  highlighted,
  selected,
  onSelect,
}: {
  event: MapEvent;
  highlighted: boolean;
  selected: boolean;
  onSelect: (eventId: string) => void;
}) {
  const icon = useMemo(
    () => createPinIcon(highlighted, selected),
    [highlighted, selected],
  );

  return (
    <Marker
      position={[event.lat as number, event.lng as number]}
      icon={icon}
      zIndexOffset={selected ? 1200 : highlighted ? 1000 : 0}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          onSelect(event.id);
        },
      }}
    />
  );
}
