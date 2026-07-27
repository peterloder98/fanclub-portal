"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Map } from "lucide-react";
import { EventsMapClient } from "@/components/events/events-map.client";
import { EventsCountdown } from "@/components/events/events-countdown";
import { EventListItem } from "@/components/events/event-list-item.client";
import { FanclubMeetingListItem } from "@/components/events/fanclub-meeting-list-item";
import type { EventListRow, EventParticipationMeta } from "@/components/events/events-map.types";
import type { ClubMeetingListItem } from "@/lib/meetings/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventTravelNoteRow } from "@/lib/events/admin-notes";
import { cn } from "@/lib/cn";
import { scrollToFocusElement } from "@/lib/navigation/scroll-to-focus";

export type { EventListRow, EventParticipationMeta } from "@/components/events/events-map.types";

export function EventsInteractivePanel({
  events,
  nextStartAt,
  nextTitle,
  participationByEventId,
  travelNotesByEventId,
  clubMeetings = [],
  isAdmin,
  focusEventId = null,
  className,
}: {
  events: EventListRow[];
  clubMeetings?: ClubMeetingListItem[];
  nextStartAt: string | null;
  nextTitle?: string | null;
  participationByEventId: Record<string, EventParticipationMeta>;
  travelNotesByEventId?: Record<string, EventTravelNoteRow>;
  isAdmin?: boolean;
  focusEventId?: string | null;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const effectiveFocusId = focusEventId ?? searchParams.get("focus");

  useEffect(() => {
    if (!effectiveFocusId || !events.some((e) => e.id === effectiveFocusId)) return;
    setHighlightedId(effectiveFocusId);
    return scrollToFocusElement(`event-${effectiveFocusId}`, {
      highlightClass: "ring-2 ring-blue-400 ring-offset-2 shadow-md",
      delayMs: 300,
      maxAttempts: 12,
    });
  }, [effectiveFocusId, events]);

  const scheduleItems = [
    ...events.map((e) => ({
      key: `event-${e.id}`,
      sortAt: e.start_at ?? "",
      node: (() => {
        const part = participationByEventId[e.id] ?? {
          count: 0,
          joined: false,
          attendees: [],
        };
        return (
          <EventListItem
            key={`event-${e.id}`}
            event={e}
            active={highlightedId === e.id}
            isAdmin={isAdmin}
            participation={part}
            travelNote={travelNotesByEventId?.[e.id]}
            onMouseEnter={() => setHighlightedId(e.id)}
            onMouseLeave={() => setHighlightedId(null)}
          />
        );
      })(),
    })),
    ...clubMeetings.map((m) => ({
      key: `meeting-${m.id}`,
      sortAt: m.starts_at,
      node: (
        <FanclubMeetingListItem
          key={`meeting-${m.id}`}
          meeting={m}
          active={highlightedId === m.id}
          onMouseEnter={() => setHighlightedId(m.id)}
          onMouseLeave={() => setHighlightedId(null)}
        />
      ),
    })),
  ].sort((a, b) => {
    if (!a.sortAt && !b.sortAt) return 0;
    if (!a.sortAt) return 1;
    if (!b.sortAt) return -1;
    return a.sortAt.localeCompare(b.sortAt);
  });

  const eventItems = scheduleItems.length ? (
    <div className="grid gap-2 sm:gap-3">
      {scheduleItems.map((item) => (
        <div key={item.key}>{item.node}</div>
      ))}
    </div>
  ) : (
    <div className="px-3 py-8 text-center text-sm text-slate-600">
      Keine anstehenden Termine — abgelaufene Auftritte werden automatisch ausgeblendet.
    </div>
  );

  const list = (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl lg:h-full">
      <CardHeader className="shrink-0 border-b border-fc-ice pb-2 pt-4">
        <CardTitle className="text-base">Alle Termine</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        <div
          className="h-full min-h-0 overflow-y-auto overscroll-contain px-1 py-2 sm:px-2 sm:py-3 lg:px-3"
          role="region"
          aria-label="Eventliste"
        >
          {eventItems}
        </div>
      </CardContent>
    </Card>
  );

  const mapInner = (
    <div className="h-[220px] w-full lg:h-full lg:min-h-[240px]">
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

  return (
    <>
      {/* Mobile: Countdown → Karte eingeklappt → Liste */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-3 overflow-y-auto overscroll-contain lg:hidden",
          className,
        )}
      >
        <EventsCountdown compact nextStartAt={nextStartAt} nextTitle={nextTitle} />
        <Card className="shrink-0 rounded-2xl">
          <button
            type="button"
            onClick={() => setMapOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-fc-navy">
              <Map className="h-4 w-4 text-fc-blue" aria-hidden />
              Karte {mapOpen ? "ausblenden" : "anzeigen"}
            </span>
            <ChevronDown
              className={cn("h-5 w-5 shrink-0 text-slate-500 transition", mapOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          {mapOpen ? <div className="border-t p-2">{mapInner}</div> : null}
        </Card>
        <div className="min-h-[50vh] shrink-0">{list}</div>
      </div>

      {/* Desktop: Liste links (scrollt) | rechts Countdown + Karte ausgeklappt */}
      <div
        className={cn(
          "hidden min-h-0 h-full flex-1 gap-4 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(240px,320px)]",
          className,
        )}
      >
        {list}
        <aside className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
          <div className="shrink-0">
            <EventsCountdown compact nextStartAt={nextStartAt} nextTitle={nextTitle} />
          </div>
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
            <CardContent className="min-h-0 flex-1 p-1.5 sm:p-2">{mapInner}</CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
