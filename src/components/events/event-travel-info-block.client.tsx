"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Hotel, MapPin, Train } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  closestHotelIndex,
  formatWalkingRoute,
  travelInfoHasContent,
  travelInfoSummary,
  type EventTravelInfo,
  type EventTravelPlace,
} from "@/lib/events/travel-info";

function PlaceLine({
  icon: Icon,
  place,
  badge,
  showLink,
}: {
  icon: typeof Train;
  place: EventTravelPlace;
  badge?: string;
  showLink?: boolean;
}) {
  const route = formatWalkingRoute(place.distanceMeters, place.durationSeconds);
  return (
    <div className="flex gap-2 py-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-900">{place.name}</span>
          {badge ? (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
              {badge}
            </span>
          ) : null}
        </div>
        {place.address ? (
          <p className="mt-0.5 flex items-start gap-1 text-[11px] text-slate-600">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-50" aria-hidden />
            <span>{place.address}</span>
          </p>
        ) : null}
        {route ? <p className="mt-0.5 text-[11px] font-medium text-blue-700">{route}</p> : null}
        {showLink && place.link ? (
          <a
            href={place.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-700 hover:underline"
          >
            Website
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function EventTravelInfoBlock({ travel }: { travel: EventTravelInfo }) {
  const [open, setOpen] = useState(false);
  if (!travelInfoHasContent(travel)) return null;

  const closestHotel = closestHotelIndex(travel.hotels);
  const summary = travelInfoSummary(travel);

  return (
    <div className="mt-2 rounded-lg border border-slate-200/90 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0 text-[11px] font-semibold text-slate-700">
          <span className="text-slate-500">Anreise & Hotel</span>
          {!open && summary ? (
            <span className="mt-0.5 block truncate font-normal text-slate-600">{summary}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-500 transition", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-slate-200/80 px-2.5 pb-2 pt-1 text-xs">
          {travel.station ? (
            <PlaceLine
              icon={Train}
              place={travel.station}
              badge="Nächstgelegener Bahnhof"
            />
          ) : null}
          {travel.hotels.map((h, i) => (
            <PlaceLine
              key={`${h.name}-${i}`}
              icon={Hotel}
              place={h}
              badge={
                travel.hotels.length === 1 || i === closestHotel ? "Nächstgelegenes Hotel" : undefined
              }
              showLink
            />
          ))}
          {travel.notes ? (
            <p className="mt-1 whitespace-pre-wrap border-t border-slate-200/60 pt-1.5 text-[11px] text-slate-600">
              {travel.notes}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
