"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { EventMapHoverContent } from "./event-map-hover-content";
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

/** Tooltip zeigt zur Kartenmitte, damit er im sichtbaren Bereich bleibt */
function TooltipTowardCenter({
  position,
  children,
}: {
  position: [number, number];
  children: ReactNode;
}) {
  const map = useMap();
  const [direction, setDirection] = useState<"top" | "bottom" | "left" | "right">("top");
  const [offset, setOffset] = useState<L.PointExpression>([0, -SLOT_H]);

  useEffect(() => {
    const update = () => {
      const c = map.getCenter();
      const dLat = position[0] - c.lat;
      const dLng = position[1] - c.lng;
      const pad = SLOT_H + 6;

      if (Math.abs(dLat) > Math.abs(dLng)) {
        if (dLat > 0) {
          setDirection("bottom");
          setOffset([0, pad]);
        } else {
          setDirection("top");
          setOffset([0, -pad]);
        }
      } else if (dLng > 0) {
        setDirection("left");
        setOffset([-pad, -SLOT_H / 2]);
      } else {
        setDirection("right");
        setOffset([pad, -SLOT_H / 2]);
      }
    };
    update();
    map.on("move zoom", update);
    return () => {
      map.off("move zoom", update);
    };
  }, [map, position]);

  return (
    <Tooltip
      direction={direction}
      offset={offset}
      opacity={1}
      sticky={false}
      className="fc-event-hover-tip"
    >
      {children}
    </Tooltip>
  );
}

export function EventMapMarker({
  event,
  highlighted,
  selected,
  onSelect,
  onHover,
}: {
  event: MapEvent;
  highlighted: boolean;
  selected: boolean;
  onSelect: (eventId: string) => void;
  onHover?: (eventId: string | null) => void;
}) {
  const icon = useMemo(
    () => createPinIcon(highlighted, selected),
    [highlighted, selected],
  );
  const position: [number, number] = [event.lat as number, event.lng as number];

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
        mouseover: () => onHover?.(event.id),
        mouseout: () => onHover?.(null),
      }}
    >
      {!selected ? (
        <TooltipTowardCenter position={position}>
          <EventMapHoverContent event={event} />
        </TooltipTowardCenter>
      ) : null}
    </Marker>
  );
}
