"use client";

import { X } from "lucide-react";
import { formatEventStart, formatEventAddress } from "@/lib/events/format";
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
  const addr = formatEventAddress({
    address: event.address,
    postal_code: event.postal_code,
    city: event.city,
  });
  const ticket = ticketDisplay(event.ticket_url);

  return (
    <div
      className="border-t border-slate-200 bg-white/98 px-3 py-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm"
      role="dialog"
      aria-label="Eventdetails"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug text-slate-900">{event.title}</div>
          <div className="mt-0.5 text-xs text-slate-600">
            <span className="font-medium text-slate-800">{date}</span>
            {time ? <span> · {time} Uhr</span> : null}
          </div>
          {addr ? <div className="mt-0.5 text-xs text-slate-600">{addr}</div> : null}
          {ticket.href ? (
            <a
              className="mt-1.5 inline-flex text-xs font-medium text-blue-700 hover:underline"
              href={ticket.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Tickets / Infos →
            </a>
          ) : ticket.text ? (
            <div className="mt-1 text-xs text-slate-700">{ticket.text}</div>
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
