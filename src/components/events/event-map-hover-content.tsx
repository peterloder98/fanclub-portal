"use client";

import { formatEventStart } from "@/lib/events/format";
import type { MapEvent } from "./events-map.types";

/** Kompakte Vorschau beim Hover über einen Pin */
export function EventMapHoverContent({ event }: { event: MapEvent }) {
  const { date, time } = formatEventStart(event.start_at);
  const city = event.city?.trim();

  return (
    <div className="max-w-[168px] leading-snug">
      <div className="line-clamp-2 text-[11px] font-semibold text-slate-900">{event.title}</div>
      <div className="mt-0.5 text-[10px] text-slate-600">
        {date}
        {time ? ` · ${time}` : ""}
      </div>
      {city ? <div className="mt-0.5 truncate text-[10px] text-slate-500">{city}</div> : null}
    </div>
  );
}
