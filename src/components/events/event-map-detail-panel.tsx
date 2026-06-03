"use client";

import { CalendarDays, MapPin, X } from "lucide-react";
import { formatEventStart, formatLocation } from "@/lib/events/format";
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
  const location = formatLocation({
    venue: event.venue,
    address: event.address,
    postal_code: event.postal_code,
    city: event.city,
  });
  const ticket = ticketDisplay(event.ticket_url);

  return (
    <div
      className="border-t border-slate-200 bg-white px-3 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]"
      role="dialog"
      aria-label="Eventdetails"
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h4 className="text-sm font-semibold leading-snug text-slate-900">{event.title}</h4>

          <div className="flex items-start gap-1.5 text-xs text-slate-600">
            <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span>
              <span className="font-medium text-slate-800">{date}</span>
              {time ? <span> · {time} Uhr</span> : null}
            </span>
          </div>

          {location ? (
            <div className="flex items-start gap-1.5 text-xs text-slate-600">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <span className="leading-snug">{location}</span>
            </div>
          ) : null}

          {ticket.href ? (
            <a
              className="inline-flex pt-0.5 text-xs font-semibold text-blue-700 hover:underline"
              href={ticket.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Tickets / Infos →
            </a>
          ) : ticket.text ? (
            <p className="text-xs text-slate-700">{ticket.text}</p>
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
