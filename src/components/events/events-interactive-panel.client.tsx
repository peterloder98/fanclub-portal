"use client";

import { useState } from "react";
import { ChevronDown, Map } from "lucide-react";
import { EventsMapClient } from "@/components/events/events-map.client";
import { EventsCountdown } from "@/components/events/events-countdown";
import { EventParticipationRow } from "@/components/events/event-participation-row";
import { EventCalendarButton } from "@/components/events/event-calendar-button";
import { Badge } from "@/components/ui/badge";
import { formatEventStart, formatLocation, formatVenueName } from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import type { MapEvent } from "@/components/events/events-map.types";
import type { UserListEntry } from "@/components/ui/user-list-popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventTravelInfoBlock } from "@/components/events/event-travel-info-block.client";
import { EventTravelEdit } from "@/components/events/event-travel-edit.client";
import type { EventTravelNoteRow } from "@/lib/events/admin-notes";
import { cn } from "@/lib/cn";

export type EventListRow = MapEvent;

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
  const [mapOpen, setMapOpen] = useState(false);

  const eventItems = (
          <div className="grid gap-2">
            {events.map((e) => {
              const { date, time } = formatEventStart(e.start_at);
              const location = formatLocation(e);
              const venueName = e.kind === "tv" ? null : formatVenueName(e.venue);
              const ticket = ticketDisplay(e.ticket_url);
              const isTv = e.kind === "tv";
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
                      ? "overflow-hidden rounded-xl border-2 border-blue-400 bg-blue-50/50 px-3 py-2.5 shadow-sm transition"
                      : "overflow-hidden rounded-xl border bg-white px-3 py-2.5 shadow-sm shadow-slate-900/5 transition hover:border-slate-300"
                  }
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                      {e.title}
                    </div>
                    {isTv ? (
                      <Badge variant="brand" className="shrink-0 text-[10px]">
                        TV
                      </Badge>
                    ) : null}
                  </div>
                  {venueName ? (
                    <div className="mt-0.5 truncate text-xs text-slate-500">{venueName}</div>
                  ) : null}
                  <div className="mt-0.5 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{date}</span>
                      {time ? <span>· {time} Uhr</span> : null}
                      {location ? <span>· {location}</span> : null}
                    </div>
                    {isAdmin && !isTv ? (
                      <div className="shrink-0 self-center">
                        <EventTravelEdit
                          eventId={e.id}
                          initialTravel={travelNotesByEventId?.[e.id]?.travel}
                          compact
                        />
                      </div>
                    ) : null}
                  </div>
                  {ticket.href ? (
                    <a
                      href={ticket.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex text-xs font-medium text-blue-700 hover:underline"
                    >
                      {isTv ? "Sendung / Infos →" : "Tickets / Infos →"}
                    </a>
                  ) : ticket.text ? (
                    <div className="mt-1.5 text-xs text-slate-700">{ticket.text}</div>
                  ) : null}
                  {travelNotesByEventId?.[e.id]?.travel && !isTv ? (
                    <div className="mt-3 border-t border-slate-100 pt-2">
                      <EventTravelInfoBlock
                        travel={travelNotesByEventId[e.id].travel}
                        originAddress={[e.address, e.postal_code, e.city]
                          .filter(Boolean)
                          .join(", ")}
                      />
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                    {!isTv ? (
                      <EventParticipationRow
                        eventId={e.id}
                        initialCount={part.count}
                        initialJoined={part.joined}
                        initialAttendees={part.attendees}
                        inline
                      />
                    ) : null}
                    <EventCalendarButton
                      title={e.title}
                      startAt={e.start_at}
                      venue={e.venue}
                      address={e.address}
                      postalCode={e.postal_code}
                      city={e.city}
                      country={e.country}
                    />
                  </div>
                </div>
              );
            })}
          </div>
  );

  const list = (
    <Card className="rounded-2xl lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <CardHeader className="shrink-0 border-b border-slate-100 pb-2 pt-4">
        <CardTitle className="text-base">Alle Termine</CardTitle>
      </CardHeader>
      <CardContent className="p-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div
          className="px-3 py-3 lg:h-full lg:overflow-y-auto lg:overscroll-contain"
          role="region"
          aria-label="Eventliste"
        >
          {eventItems}
        </div>
      </CardContent>
    </Card>
  );

  const mapInner = (
    <div className="h-[200px] w-full lg:h-full lg:min-h-[180px]">
      <EventsMapClient
        events={events}
        highlightedEventId={highlightedId}
        minHeight={180}
        mapVariant="events"
        fillHeight
        onEventSelect={(id) => setHighlightedId(id)}
      />
    </div>
  );

  const map = (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
      <CardContent className="min-h-0 flex-1 p-2">{mapInner}</CardContent>
    </Card>
  );

  return (
    <>
      {/* Mobile: Countdown → volle Liste (Seite scrollt) → Karte optional */}
      <div className={cn("flex flex-col gap-3 lg:hidden", className)}>
        <EventsCountdown compact nextStartAt={nextStartAt} nextTitle={nextTitle} />
        {list}
        <Card className="rounded-2xl">
          <button
            type="button"
            onClick={() => setMapOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Map className="h-4 w-4 text-blue-600" aria-hidden />
              Karte {mapOpen ? "ausblenden" : "anzeigen"}
            </span>
            <ChevronDown
              className={cn("h-5 w-5 shrink-0 text-slate-500 transition", mapOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          {mapOpen ? <div className="border-t p-2">{mapInner}</div> : null}
        </Card>
      </div>

      {/* Desktop: Liste links, Countdown+Karte rechts */}
      <div
        className={cn(
          "hidden h-full min-h-0 gap-4 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,360px)]",
          className,
        )}
      >
        {list}
        <aside className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
          <div className="shrink-0">
            <EventsCountdown compact nextStartAt={nextStartAt} nextTitle={nextTitle} />
          </div>
          {map}
        </aside>
      </div>
    </>
  );
}
