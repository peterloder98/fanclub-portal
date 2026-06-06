"use client";

import { useState } from "react";
import { EventCalendarButton } from "@/components/events/event-calendar-button";
import { EventParticipationRow } from "@/components/events/event-participation-row";
import {
  EventTravelEditForm,
  EventTravelEditTrigger,
} from "@/components/events/event-travel-edit.client";
import { EventTravelInfoBlock } from "@/components/events/event-travel-info-block.client";
import { EventTvBadge } from "@/components/events/event-tv-badge";
import type { EventListRow, EventParticipationMeta } from "@/components/events/events-map.types";
import type { EventTravelNoteRow } from "@/lib/events/admin-notes";
import {
  formatEventCity,
  formatEventListDate,
  formatEventListTime,
  formatEventVenueCityLine,
  formatTvBroadcaster,
  formatVenueName,
} from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";
import { cn } from "@/lib/cn";

function formatLocationLine(e: EventListRow, isTv: boolean): string | null {
  if (isTv) {
    const parts: string[] = [];
    const time = formatEventListTime(e.start_at);
    if (time) parts.push(time);
    const broadcaster = formatTvBroadcaster(e.broadcaster);
    if (broadcaster) parts.push(broadcaster);
    const venueCity = formatEventVenueCityLine({
      venue: e.venue,
      city: e.city,
      country: e.country,
    });
    if (venueCity) parts.push(venueCity);
    return parts.length ? parts.join(" · ") : null;
  }

  return formatEventVenueCityLine({
    venue: e.venue,
    city: e.city,
    country: e.country,
  });
}

export function EventListItem({
  event: e,
  active,
  isAdmin,
  participation,
  travelNote,
  onMouseEnter,
  onMouseLeave,
}: {
  event: EventListRow;
  index?: number;
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
  const locationLine = formatLocationLine(e, isTv);
  const ticket = ticketDisplay(e.ticket_url);
  const showAdminTravel = isAdmin && !isTv;

  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "overflow-hidden rounded-xl border bg-white px-2 py-2 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 sm:px-3 sm:py-2.5",
        active && "border-2 border-blue-400 bg-fc-ice/50",
      )}
    >
      <div className={cn("relative min-w-0", showAdminTravel && "lg:pr-24")}>
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <div className="w-[4.75rem] shrink-0 text-xs font-medium tabular-nums text-slate-800 sm:w-[5.75rem]">
            {listDate}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {isTv ? <EventTvBadge /> : null}
              <h3 className="min-w-0 text-xs font-bold uppercase leading-snug tracking-wide text-slate-900 sm:text-sm">
                {e.title}
              </h3>
            </div>
            {locationLine ? (
              <p className="mt-0.5 text-xs text-slate-600">{locationLine}</p>
            ) : null}
          </div>
        </div>

        {showAdminTravel ? (
          <div className="absolute right-0 top-0 hidden lg:block">
            <EventTravelEditTrigger
              hasTravel={Boolean(travelNote?.travel)}
              onClick={() => setTravelOpen((v) => !v)}
            />
          </div>
        ) : null}
      </div>

      {ticket.href || ticket.text || showAdminTravel ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {ticket.href ? (
            <a
              href={ticket.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-fc-blue hover:underline"
            >
              {isTv ? "Sendung / Infos" : "Tickets / Infos"}
            </a>
          ) : ticket.text ? (
            <p className="text-xs text-slate-700">{ticket.text}</p>
          ) : null}
          {showAdminTravel ? (
            <div className="lg:hidden">
              <EventTravelEditTrigger
                hasTravel={Boolean(travelNote?.travel)}
                onClick={() => setTravelOpen((v) => !v)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {travelOpen && showAdminTravel ? (
        <EventTravelEditForm
          eventId={e.id}
          initialTravel={travelNote?.travel}
          onClose={() => setTravelOpen(false)}
        />
      ) : null}

      {travelNote?.travel && !isTv && !travelOpen ? (
        <div className="mt-2 border-t border-slate-100 pt-2 sm:mt-3">
          <EventTravelInfoBlock
            travel={travelNote.travel}
            originAddress={[e.address, e.postal_code, e.city].filter(Boolean).join(", ")}
          />
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        <EventParticipationRow
          eventId={e.id}
          initialCount={participation.count}
          initialJoined={participation.joined}
          initialAttendees={participation.attendees}
          inline
          tvMode={isTv}
        />
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
