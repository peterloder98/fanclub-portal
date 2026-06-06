"use client";

import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { MAP_CI } from "@/lib/maps/ci-colors";
import type { MapEvent } from "./events-map.types";

const PIN_W = 22;
const PIN_H = 30;
const PIN_HEAD = 15;
const HOVER_SCALE = 1.5;
const SELECTED_SCALE = 1.58;
const SLOT_W = Math.ceil(PIN_W * SELECTED_SCALE);
const SLOT_H = Math.ceil(PIN_H * SELECTED_SCALE);
const ICON_ANCHOR: [number, number] = [SLOT_W / 2, SLOT_H];

function pinHtml(highlighted: boolean, selected: boolean) {
  const scale = selected ? SELECTED_SCALE : highlighted ? HOVER_SCALE : 1;

  let headGradient: string = `linear-gradient(145deg,${MAP_CI.navy},${MAP_CI.blue})`;
  let footColor: string = MAP_CI.sky;
  let stemColor: string = MAP_CI.navy;
  let headBorder: string = "2px solid rgba(255,255,255,0.94)";
  let glow: string =
    "inset 0 2px 5px rgba(255,255,255,.38), inset 0 -3px 6px rgba(20,49,101,.2)";
  let dropShadow: string = "drop-shadow(0 8px 12px rgba(20,49,101,.22))";

  if (highlighted && !selected) {
    headGradient = `linear-gradient(145deg,${MAP_CI.blue},${MAP_CI.sky})`;
    footColor = MAP_CI.gold;
    headBorder = `3px solid ${MAP_CI.gold}`;
    glow = `0 0 0 5px ${MAP_CI.goldSoft}, 0 0 22px ${MAP_CI.navyGlow}`;
    dropShadow = "drop-shadow(0 14px 20px rgba(20,49,101,.38))";
  }

  if (selected) {
    headGradient = `linear-gradient(145deg,${MAP_CI.gold},${MAP_CI.blue})`;
    footColor = MAP_CI.navy;
    headBorder = "3px solid #ffffff";
    glow = `0 0 0 6px rgba(201,162,39,0.7), 0 0 26px rgba(20,49,101,0.55)`;
    dropShadow = "drop-shadow(0 16px 22px rgba(20,49,101,.42))";
  }

  const left = (SLOT_W - PIN_W) / 2;

  return `
    <div style="width:${SLOT_W}px;height:${SLOT_H}px;position:relative;">
      <div style="
        position:absolute;left:${left}px;bottom:0;
        width:${PIN_W}px;height:${PIN_H}px;
        transform:scale(${scale});
        transform-origin:50% 100%;
        filter:${dropShadow};
        transition:transform 0.18s ease, filter 0.18s ease;
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
          width:8px;height:5px;border-radius:999px;
          background:rgba(255,255,255,.6);
        "></div>
        <div style="
          position:absolute;left:50%;top:14px;transform:translateX(-50%);
          width:2px;height:13px;border-radius:2px;background:${stemColor};opacity:.9;
        "></div>
        <div style="
          position:absolute;left:50%;top:24px;transform:translateX(-50%) rotate(45deg);
          width:8px;height:8px;border-radius:2px;
          background:${footColor};
          border:1px solid rgba(255,255,255,.78);
        "></div>
      </div>
    </div>
  `;
}

function createPinIcon(highlighted: boolean, selected: boolean) {
  return L.divIcon({
    className: highlighted || selected ? "fc-event-pin-active" : "fc-event-pin",
    iconSize: [SLOT_W, SLOT_H],
    iconAnchor: ICON_ANCHOR,
    html: pinHtml(highlighted, selected),
  });
}

export function EventMapMarker({
  event,
  position,
  highlighted,
  selected,
  onSelect,
  onHover,
}: {
  event: MapEvent;
  position: [number, number];
  highlighted: boolean;
  selected: boolean;
  onSelect: (eventId: string) => void;
  onHover?: (eventId: string | null) => void;
}) {
  const icon = useMemo(
    () => createPinIcon(highlighted, selected),
    [highlighted, selected],
  );

  return (
    <Marker
      position={position}
      icon={icon}
      zIndexOffset={selected ? 1200 : highlighted ? 1000 : 0}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          onSelect(event.id);
        },
        mousedown: (e) => {
          L.DomEvent.stopPropagation(e);
        },
        mouseover: () => onHover?.(event.id),
        mouseout: () => onHover?.(null),
      }}
    />
  );
}
