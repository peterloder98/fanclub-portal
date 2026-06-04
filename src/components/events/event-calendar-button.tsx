"use client";

import { CalendarPlus } from "lucide-react";
import { buildEventIcs, downloadIcsFile } from "@/lib/calendar/build-ics";
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
  if (!startAt) return null;

  function save() {
    if (!startAt) return;
    try {
      const location = formatLocation({
        venue,
        address,
        postal_code: postalCode,
        city,
      });
      const ics = buildEventIcs({
        title,
        startAt,
        location: location ?? undefined,
        description: `Anni Perka Fanclub — ${title}`,
        uid: `fanclub-event-${title}-${startAt}@anni-perka-fanclub`,
      });
      const safeName = title.replace(/[^\wäöüÄÖÜß\-]+/gi, "-").slice(0, 40);
      downloadIcsFile(ics, `${safeName || "termin"}.ics`);
    } catch {
      window.alert(
        "Kalenderdatei konnte nicht erstellt werden. Bitte prüfe, ob ein Datum für den Termin hinterlegt ist.",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={save}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50"
      aria-label={`Termin „${title}“ in den Kalender speichern`}
      title="Öffnet eine Kalenderdatei — einfach antippen und in Handy oder PC einfügen"
    >
      <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
      In Kalender speichern
    </button>
  );
}
