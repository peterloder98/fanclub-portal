"use client";

import { CalendarDays, MapPin, X } from "lucide-react";
import { formatEventStart, formatLocation, formatVenueName } from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import type { MapEvent } from "./events-map.types";

export function EventMapDetailPanel({
  event,
  onClose,
}: {
  event: MapEvent;
  onClose: () => void;
}) {
  const { date, time } = formatEventStart(event.start_at);
  const location = formatLocation(event);
  const venueName = event.kind === "tv" ? null : formatVenueName(event.venue);
  const ticket = ticketDisplay(event.ticket_url);

  return (
    <div
      className="rounded-t-xl border border-fc-navy/15 bg-gradient-to-b from-fc-ice/95 to-white/98 px-3 py-3 shadow-[0_-10px_32px_rgba(20,49,101,0.22)] backdrop-blur-sm"
      role="dialog"
      aria-label="Eventdetails"
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1 space-y-2">
          <h4 className="text-[13px] font-bold leading-snug text-fc-navy">{event.title}</h4>

          <div className="flex items-start gap-1.5 text-xs text-slate-600">
            <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fc-sky" aria-hidden />
            <span className="leading-snug">
              <span className="font-semibold text-fc-blue">{date}</span>
              {time ? <span> · {time} Uhr</span> : null}
            </span>
          </div>

          {venueName ? (
            <div className="text-xs text-slate-500">{venueName}</div>
          ) : null}
          {location ? (
            <div className="flex items-start gap-1.5 text-xs text-slate-600">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fc-sky" aria-hidden />
              <span className="leading-snug">{location}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Ort wird noch ergänzt</p>
          )}

          {ticket.href ? (
            <a
              className="inline-flex text-xs font-semibold text-fc-blue hover:underline"
              href={ticket.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Tickets / Infos →
            </a>
          ) : ticket.text ? (
            <p className="text-xs font-medium text-slate-700">{ticket.text}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          aria-label="Details schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
