"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/** Klick auf die Karte (nicht auf Marker) schließt die Detailleiste. */
export function MapClickDismiss({ onDismiss }: { onDismiss: () => void }) {
  const map = useMap();

  useEffect(() => {
    const handler = () => onDismiss();
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onDismiss]);

  return null;
}
