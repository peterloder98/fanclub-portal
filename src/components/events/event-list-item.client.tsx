"use client";

import { useState } from "react";
import { EventCalendarButton } from "@/components/events/event-calendar-button";
import { EventParticipationRow } from "@/components/events/event-participation-row";
import { EventTravelEditForm, EventTravelEditTrigger } from "@/components/events/event-travel-edit.client";
import { EventTravelInfoBlock } from "@/components/events/event-travel-info-block.client";
import { EventTvBadge } from "@/components/events/event-tv-badge";
import type { EventListRow, EventParticipationMeta } from "@/components/events/events-map.types";
import type { EventTravelNoteRow } from "@/lib/events/admin-notes";
import {
  formatEventCity,
  formatEventListDate,
  formatTvBroadcaster,
} from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import { cn } from "@/lib/cn";

export function EventListItem({
  event: e,
  index,
  active,
  isAdmin,
  participation,
  travelNote,
  onMouseEnter,
  onMouseLeave,
}: {
  event: EventListRow;
  index: number;
  active: boolean;
  isAdmin?: boolean;
  participation: EventParticipationMeta;
  travelNote?: EventTravelNoteRow;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [travelOpen, setTravelOpen] = useState(false);
  const isTv = e.kind === "tv";
  const listDate = formatEventListDate(e.start_at);
  const cityLabel = (
    formatEventCity({ city: e.city, country: e.country }) ??
    (isTv ? formatTvBroadcaster(e.broadcaster) : null)
  )?.toUpperCase() ?? null;
  const ticket = ticketDisplay(e.ticket_url);

  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "overflow-hidden border-b border-slate-200/80 last:border-b-0",
        index % 2 === 0 ? "bg-violet-100/35" : "bg-white",
        active && "ring-2 ring-inset ring-blue-400",
      )}
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[min(100%,28rem)] grid-cols-[minmax(6.5rem,auto)_minmax(4rem,5.5rem)_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2 sm:min-w-0 sm:grid-cols-[minmax(7.5rem,auto)_minmax(4.5rem,8rem)_1fr_auto] sm:gap-x-3">
        <div className="text-[11px] font-medium tabular-nums text-slate-800 sm:text-xs">{listDate}</div>

        <div className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-900 sm:text-xs">
          {cityLabel ?? "—"}
        </div>

        <div className="flex min-w-0 items-center gap-1.5">
          {isTv ? <EventTvBadge /> : null}
          <h3 className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wide text-slate-900 sm:text-sm">
            {e.title}
          </h3>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5">
          {ticket.href ? (
            <a
              href={ticket.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center rounded-md bg-slate-900 px-2.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-slate-800"
            >
              {isTv ? "Infos" : "Tickets"}
            </a>
          ) : ticket.text ? (
            <span className="max-w-[8rem] truncate text-[10px] font-semibold text-slate-700">
              {ticket.text}
            </span>
          ) : null}
          {isAdmin && !isTv ? (
            <EventTravelEditTrigger
              hasTravel={Boolean(travelNote?.travel)}
              onClick={() => setTravelOpen((v) => !v)}
            />
          ) : null}
        </div>
        </div>
      </div>

      {travelOpen && isAdmin && !isTv ? (
        <EventTravelEditForm
          eventId={e.id}
          initialTravel={travelNote?.travel}
          onClose={() => setTravelOpen(false)}
        />
      ) : null}

      {travelNote?.travel && !isTv && !travelOpen ? (
        <div className="px-3 pb-2">
          <EventTravelInfoBlock
            travel={travelNote.travel}
            originAddress={[e.address, e.postal_code, e.city].filter(Boolean).join(", ")}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/50 px-3 py-1.5">
        {!isTv ? (
          <EventParticipationRow
            eventId={e.id}
            initialCount={participation.count}
            initialJoined={participation.joined}
            initialAttendees={participation.attendees}
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
    </article>
  );
}
