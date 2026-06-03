"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { MapEvent } from "./events-map.types";

export type { MapEvent };

const EventsMapClient = dynamic(
  () => import("./events-map.client").then((m) => m.EventsMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[320px] place-items-center rounded-2xl border bg-slate-50 text-sm text-slate-600">
        Lade Karte…
      </div>
    ),
  },
);

export function EventsMap({
  events,
  minHeight,
  mapVariant,
}: {
  events: MapEvent[];
  minHeight?: number;
  mapVariant?: "dashboard" | "events";
}) {
  // Key by pathname to avoid Leaflet getting stuck across navigations.
  const pathname = usePathname();
  return (
    <EventsMapClient
      key={pathname}
      events={events}
      minHeight={minHeight}
      mapVariant={mapVariant}
    />
  );
}

