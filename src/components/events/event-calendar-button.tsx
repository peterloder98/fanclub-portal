"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { EventCalendarDialog } from "@/components/events/event-calendar-dialog";
import { openEventInPreferredCalendar } from "@/lib/calendar/open-event-calendar";
import {
  normalizePreferredCalendar,
  type PreferredCalendar,
} from "@/lib/calendar/preferred-calendar";
import { formatLocation } from "@/lib/events/format";

export function EventCalendarButton({
  title,
  startAt,
  venue,
  address,
  postalCode,
  city,
}: {
  title: string;
  startAt: string | null;
  venue?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<PreferredCalendar>("ask");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/profile/calendar-preference");
        if (res.ok) {
          const json = (await res.json()) as { preference?: string };
          setPreference(normalizePreferredCalendar(json.preference));
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const payload = useMemo(() => {
    if (!startAt) return null;
    const location = formatLocation({
      venue,
      address,
      postal_code: postalCode,
      city,
    });
    return {
      title,
      startAt,
      location: location ?? undefined,
      description: `Anni Perka Fanclub — ${title}`,
    };
  }, [title, startAt, venue, address, postalCode, city]);

  const handleClick = useCallback(() => {
    if (!payload) return;
    if (preference === "ask") {
      setOpen(true);
      return;
    }
    const result = openEventInPreferredCalendar(preference, payload, title);
    if (!result.ok) {
      window.alert(result.message);
      setOpen(true);
    }
  }, [payload, title, preference]);

  if (!startAt) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50"
        aria-label={`Termin „${title}“ in den Kalender speichern`}
      >
        <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
        In Kalender speichern
      </button>
      <EventCalendarDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        startAt={startAt}
        venue={venue}
        address={address}
        postalCode={postalCode}
        city={city}
        preferredCalendar={preference}
        onPreferenceChange={setPreference}
      />
    </>
  );
}
