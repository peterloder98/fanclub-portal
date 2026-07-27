"use client";

import { useState } from "react";
import { ChevronDown, Map } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EventsMap } from "@/components/events/events-map";
import type { MapEvent } from "@/components/events/events-map";
import { cn } from "@/lib/cn";

export function DashboardEventsMapCard({ events }: { events: MapEvent[] }) {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <>
      <Card className="shrink-0 overflow-hidden lg:hidden">
        <button
          type="button"
          onClick={() => setMapOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-fc-navy">
            <Map className="h-4 w-4 text-fc-blue" aria-hidden />
            Events-Karte {mapOpen ? "ausblenden" : "anzeigen"}
          </span>
          <ChevronDown
            className={cn("h-5 w-5 shrink-0 text-slate-500 transition", mapOpen && "rotate-180")}
            aria-hidden
          />
        </button>
        {mapOpen ? (
          <CardContent className="border-t p-1">
            <EventsMap events={events} minHeight={220} mapVariant="dashboard" fillHeight />
          </CardContent>
        ) : null}
      </Card>

      <Card className="hidden min-h-[280px] flex-1 flex-col overflow-hidden sm:min-h-[320px] lg:flex">
        <CardContent className="flex h-full min-h-0 flex-1 flex-col p-1">
          <EventsMap events={events} minHeight={280} mapVariant="dashboard" fillHeight />
        </CardContent>
      </Card>
    </>
  );
}
