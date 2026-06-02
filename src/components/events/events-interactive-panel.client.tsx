"use client";

import { useState } from "react";
import { EventsMapClient } from "@/components/events/events-map.client";
import { formatEventStart, formatLocation } from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import type { MapEvent } from "@/components/events/events-map.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type EventListRow = MapEvent & {
  venue?: string | null;
};

export function EventsInteractivePanel({ events }: { events: EventListRow[] }) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  return (
    <div
      className="grid min-h-0 flex-1 items-stretch gap-5"
      style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
    >
      <Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Alle Termine</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 pb-3">
          <div className="h-full overflow-y-auto pr-1">
            <div className="grid gap-3">
              {events.map((e) => {
                const { date, time } = formatEventStart(e.start_at);
                const location = formatLocation(e);
                const ticket = ticketDisplay(e.ticket_url);
                const active = highlightedId === e.id;
                return (
                  <div
                    key={e.id}
                    onMouseEnter={() => setHighlightedId(e.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                    className={
                      active
                        ? "rounded-2xl border-2 border-blue-400 bg-blue-50/50 px-4 py-3 shadow-sm shadow-slate-900/5 transition"
                        : "rounded-2xl border bg-white px-4 py-3 shadow-sm shadow-slate-900/5 transition hover:border-slate-300"
                    }
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {e.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        <span className="font-medium text-slate-800">{date}</span>
                        {time ? <span> · {time} Uhr</span> : null}
                      </div>
                      {location ? (
                        <div className="mt-1 text-sm text-slate-600">{location}</div>
                      ) : null}
                    </div>
                    {ticket.href ? (
                      <a
                        href={ticket.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-sm font-medium text-blue-700 hover:underline"
                      >
                        Tickets / Infos →
                      </a>
                    ) : ticket.text ? (
                      <div className="mt-2 text-sm text-slate-700">{ticket.text}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex h-full min-h-0 flex-col overflow-hidden">
        <CardContent className="min-h-0 flex-1 p-3">
          <div className="h-full">
            <EventsMapClient events={events} highlightedEventId={highlightedId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
