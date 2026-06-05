"use client";

import { useState } from "react";
import { ChevronDown, Map } from "lucide-react";
import { EventsMapClient } from "@/components/events/events-map.client";
import { EventsCountdown } from "@/components/events/events-countdown";
import { EventListItem } from "@/components/events/event-list-item.client";
import type { EventListRow, EventParticipationMeta } from "@/components/events/events-map.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventTravelNoteRow } from "@/lib/events/admin-notes";
import { cn } from "@/lib/cn";

export type { EventListRow, EventParticipationMeta } from "@/components/events/events-map.types";

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
    <div className="overflow-hidden rounded-xl border border-slate-200/90">
      {events.map((e, index) => {
        const part = participationByEventId[e.id] ?? {
          count: 0,
          joined: false,
          attendees: [],
        };
        return (
          <EventListItem
            key={e.id}
            event={e}
            index={index}
            active={highlightedId === e.id}
            isAdmin={isAdmin}
            participation={part}
            travelNote={travelNotesByEventId?.[e.id]}
            onMouseEnter={() => setHighlightedId(e.id)}
            onMouseLeave={() => setHighlightedId(null)}
          />
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
          className="px-2 py-2 sm:px-3 lg:h-full lg:overflow-y-auto lg:overscroll-contain"
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
