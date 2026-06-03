"use client";

import { useState } from "react";
import { EventsMapClient } from "@/components/events/events-map.client";
import { EventsCountdown } from "@/components/events/events-countdown";
import { EventParticipationRow } from "@/components/events/event-participation-row";
import { formatEventStart, formatLocation } from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import type { MapEvent } from "@/components/events/events-map.types";
import type { UserListEntry } from "@/components/ui/user-list-popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type EventListRow = MapEvent & {
  venue?: string | null;
};

export type EventParticipationMeta = {
  count: number;
  joined: boolean;
  attendees: UserListEntry[];
};

export function EventsInteractivePanel({
  events,
  nextStartAt,
  nextTitle,
  participationByEventId,
}: {
  events: EventListRow[];
  nextStartAt: string | null;
  nextTitle?: string | null;
  participationByEventId: Record<string, EventParticipationMeta>;
}) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  return (
    <div
      className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,1fr)]"
    >
      <Card className="flex min-h-0 flex-col overflow-hidden rounded-2xl">
        <CardHeader className="shrink-0 border-b border-slate-100 pb-2 pt-4">
          <CardTitle className="text-base">Alle Termine</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <div className="grid gap-2 pb-1">
              {events.map((e) => {
                const { date, time } = formatEventStart(e.start_at);
                const location = formatLocation(e);
                const ticket = ticketDisplay(e.ticket_url);
                const active = highlightedId === e.id;
                const part = participationByEventId[e.id] ?? {
                  count: 0,
                  joined: false,
                  attendees: [],
                };
                return (
                  <div
                    key={e.id}
                    onMouseEnter={() => setHighlightedId(e.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                    className={
                      active
                        ? "rounded-xl border-2 border-blue-400 bg-blue-50/50 px-3 py-2.5 shadow-sm transition"
                        : "rounded-xl border bg-white px-3 py-2.5 shadow-sm shadow-slate-900/5 transition hover:border-slate-300"
                    }
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {e.title}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        <span className="font-medium text-slate-800">{date}</span>
                        {time ? <span> · {time} Uhr</span> : null}
                      </div>
                      {location ? (
                        <div className="mt-0.5 text-xs text-slate-600">{location}</div>
                      ) : null}
                    </div>
                    {ticket.href ? (
                      <a
                        href={ticket.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex text-xs font-medium text-blue-700 hover:underline"
                      >
                        Tickets / Infos →
                      </a>
                    ) : ticket.text ? (
                      <div className="mt-1.5 text-xs text-slate-700">{ticket.text}</div>
                    ) : null}
                    <EventParticipationRow
                      eventId={e.id}
                      initialCount={part.count}
                      initialJoined={part.joined}
                      initialAttendees={part.attendees}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex min-h-0 flex-col gap-3">
        <EventsCountdown
          compact
          nextStartAt={nextStartAt}
          nextTitle={nextTitle}
        />
        <Card className="shrink-0 overflow-hidden rounded-2xl">
          <CardContent className="p-2">
            <div className="h-[min(300px,32vh)] min-h-[220px] w-full">
              <EventsMapClient
                events={events}
                highlightedEventId={highlightedId}
                minHeight={220}
                mapVariant="events"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
