"use client";

import { formatEventStart, formatLocation } from "@/lib/events/format";
import type { MapEvent } from "./events-map.types";

/** Kompakte Vorschau beim Hover über einen Pin */
export function EventMapHoverContent({ event }: { event: MapEvent }) {
  const { date, time } = formatEventStart(event.start_at);
  const location = formatLocation({
    venue: event.venue,
    address: event.address,
    postal_code: event.postal_code,
    city: event.city,
  });

  return (
    <div className="max-w-[200px] leading-snug">
      <div className="line-clamp-2 text-[11px] font-semibold text-slate-900">{event.title}</div>
      <div className="mt-0.5 text-[10px] text-slate-600">
        {date}
        {time ? ` · ${time} Uhr` : ""}
      </div>
      {location ? (
        <div className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{location}</div>
      ) : null}
    </div>
  );
}
