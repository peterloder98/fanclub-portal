"use client";

import { useState } from "react";
import { EventsMapClient } from "@/components/events/events-map.client";
import { EventsCountdown } from "@/components/events/events-countdown";
import { EventParticipationRow } from "@/components/events/event-participation-row";
import { EventCalendarButton } from "@/components/events/event-calendar-button";
import { formatEventStart, formatLocation } from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import type { MapEvent } from "@/components/events/events-map.types";
import type { UserListEntry } from "@/components/ui/user-list-popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventTravelInfoBlock } from "@/components/events/event-travel-info-block.client";
import { EventTravelEdit } from "@/components/events/event-travel-edit.client";
import type { EventTravelNoteRow } from "@/lib/events/admin-notes";
import { cn } from "@/lib/cn";

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
  travelNotesByEventId,
  isAdmin,
  className,
}: {
  events: EventListRow[];
  nextStartAt: string | null;
  nextTitle?: string | null;
  participationByEventId: Record<string, EventParticipationMeta>;
  travelNotesByEventId?: Record<string, EventTravelNoteRow>;
  isAdmin?: boolean;
  className?: string;
}) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,360px)]",
        className,
      )}
    >
      {/* Liste: volle Höhe bis unterer Bildschirmrand, Scroll nur innen */}
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
        <CardHeader className="shrink-0 border-b border-slate-100 pb-2 pt-4">
          <CardTitle className="text-base">Alle Termine</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
          <div
            className="h-full overflow-y-auto overscroll-contain px-3 py-3"
            role="region"
            aria-label="Eventliste"
          >
            <div className="grid gap-2">
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
                    {travelNotesByEventId?.[e.id]?.travel ? (
                      <div className="mt-3 border-t border-slate-100 pt-2">
                        <EventTravelInfoBlock travel={travelNotesByEventId[e.id].travel} />
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                      <EventParticipationRow
                        eventId={e.id}
                        initialCount={part.count}
                        initialJoined={part.joined}
                        initialAttendees={part.attendees}
                        inline
                      />
                      <EventCalendarButton
                        title={e.title}
                        startAt={e.start_at}
                        venue={e.venue}
                        address={e.address}
                        postalCode={e.postal_code}
                        city={e.city}
                      />
                    </div>
                    {isAdmin ? (
                      <div className="mt-2 border-t border-dashed border-slate-200 pt-2">
                        <EventTravelEdit
                          eventId={e.id}
                          initialTravel={travelNotesByEventId?.[e.id]?.travel}
                          compact
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Countdown + Karte: feste Spalte, füllt die Höhe ohne mitzuscrollen */}
      <aside className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="shrink-0">
          <EventsCountdown
            compact
            nextStartAt={nextStartAt}
            nextTitle={nextTitle}
          />
        </div>
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <CardContent className="min-h-0 flex-1 p-2">
            <div className="h-full min-h-[180px] w-full">
              <EventsMapClient
                events={events}
                highlightedEventId={highlightedId}
                minHeight={180}
                mapVariant="events"
                fillHeight
                onEventSelect={(id) => setHighlightedId(id)}
              />
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
