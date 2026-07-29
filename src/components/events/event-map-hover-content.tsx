"use client";

import { formatEventDateRange, formatLocation } from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import { personenNehmenTeil } from "@/lib/text/plural-de";
import { ParticipantAvatarStack } from "@/components/ui/participant-avatar-stack";
import type { MapEvent } from "./events-map.types";

/** Kompakte Vorschau beim Hover über einen Pin */
export function EventMapHoverContent({ event }: { event: MapEvent }) {
  const { date, time } = formatEventDateRange(event.start_at, event.end_at);
  const location = formatLocation(event);
  const ticket = ticketDisplay(event.ticket_url);
  const count = event.participationCount ?? 0;
  const attendees = event.participationAttendees ?? [];
  const isTv = event.kind === "tv";

  return (
    <div className="max-w-[220px] leading-snug">
      <div className="line-clamp-2 text-[11px] font-bold text-fc-navy">{event.title}</div>
      <div className="mt-0.5 text-[10px] font-medium text-fc-blue">
        {date}
        {time ? ` · ${time} Uhr` : ""}
      </div>
      {location ? (
        <div className="mt-0.5 line-clamp-2 text-[10px] text-slate-600">{location}</div>
      ) : null}
      {ticket.text ? (
        <div className="mt-0.5 line-clamp-2 text-[10px] font-semibold text-fc-navy/80">
          {ticket.text}
        </div>
      ) : null}
      {count > 0 ? (
        <div className="mt-1.5 border-t border-slate-100 pt-1.5">
          <ParticipantAvatarStack
            attendees={attendees}
            count={count}
            label={
              isTv
                ? count === 1
                  ? "1 schaut zu"
                  : `${count} schauen zu`
                : personenNehmenTeil(count)
            }
            visibleMax={4}
            className="!px-0 !py-0"
          />
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-slate-500">
          {isTv ? "Noch niemand schaut zu" : "Noch niemand dabei"}
        </p>
      )}
    </div>
  );
}
