"use client";

import { formatEventStart, formatLocation } from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import type { MapEvent } from "./events-map.types";

/** Kompakte Vorschau beim Hover über einen Pin */
export function EventMapHoverContent({ event }: { event: MapEvent }) {
  const { date, time } = formatEventStart(event.start_at);
  const location = formatLocation(event);
  const ticket = ticketDisplay(event.ticket_url);

  return (
    <div className="max-w-[200px] leading-snug">
      <div className="line-clamp-2 text-[11px] font-bold text-fc-navy">{event.title}</div>
      <div className="mt-0.5 text-[10px] font-medium text-fc-blue">
        {date}
        {time ? ` · ${time} Uhr` : ""}
      </div>
      {location ? (
        <div className="mt-0.5 line-clamp-2 text-[10px] text-slate-600">{location}</div>
      ) : null}
      {ticket.text ? (
        <div className="mt-0.5 line-clamp-3 text-[10px] font-semibold text-fc-navy/80">
          {ticket.text}
        </div>
      ) : null}
    </div>
  );
}
