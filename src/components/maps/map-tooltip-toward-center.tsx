"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Tooltip, useMap } from "react-leaflet";
import type L from "leaflet";

/** Tooltip-Richtung je nach Pin-Position in der Karte (nicht abgeschnitten). */
export function MapTooltipTowardCenter({
  position,
  children,
  anchorOffset = 36,
  className,
}: {
  position: [number, number];
  children: ReactNode;
  anchorOffset?: number;
  className?: string;
}) {
  const map = useMap();
  const [direction, setDirection] = useState<L.Direction>("top");
  const [offset, setOffset] = useState<L.PointExpression>([0, -anchorOffset]);

  useEffect(() => {
    const update = () => {
      const pt = map.latLngToContainerPoint(position);
      const { x, y } = map.getSize();
      const topBand = y * 0.32;
      const bottomBand = y * 0.78;
      const leftBand = x * 0.22;
      const rightBand = x * 0.78;

      if (pt.y < topBand) {
        setDirection("bottom");
        setOffset([0, anchorOffset]);
      } else if (pt.y > bottomBand) {
        setDirection("top");
        setOffset([0, -anchorOffset]);
      } else if (pt.x > rightBand) {
        setDirection("left");
        setOffset([-anchorOffset, 0]);
      } else if (pt.x < leftBand) {
        setDirection("right");
        setOffset([anchorOffset, 0]);
      } else {
        const c = map.getCenter();
        const dLat = position[0] - c.lat;
        const dLng = position[1] - c.lng;
        if (Math.abs(dLat) >= Math.abs(dLng)) {
          if (dLat > 0) {
            setDirection("bottom");
            setOffset([0, anchorOffset]);
          } else {
            setDirection("top");
            setOffset([0, -anchorOffset]);
          }
        } else if (dLng > 0) {
          setDirection("left");
          setOffset([-anchorOffset, 0]);
        } else {
          setDirection("right");
          setOffset([anchorOffset, 0]);
        }
      }
    };

    update();
    map.on("move zoom resize", update);
    return () => {
      map.off("move zoom resize", update);
    };
  }, [map, position, anchorOffset]);

  return (
    <Tooltip
      direction={direction}
      offset={offset}
      opacity={1}
      sticky
      className={className}
    >
      {children}
    </Tooltip>
  );
}
