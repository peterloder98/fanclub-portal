import { buildEventIcs, downloadIcsFile } from "@/lib/calendar/build-ics";
import {
  buildGoogleCalendarUrl,
  buildOutlookOfficeUrl,
  buildOutlookWebUrl,
  type EventCalendarPayload,
} from "@/lib/calendar/event-calendar-links";
import type { PreferredCalendar } from "@/lib/calendar/preferred-calendar";

export function openEventInPreferredCalendar(
  preference: PreferredCalendar,
  payload: EventCalendarPayload,
  titleForFile: string,
): { ok: true } | { ok: false; message: string } {
  if (preference === "ask") return { ok: false, message: "ask" };

  if (preference === "google") {
    const url = buildGoogleCalendarUrl(payload);
    if (!url) return { ok: false, message: "Termin konnte nicht für Google erstellt werden." };
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true };
  }

  if (preference === "outlook") {
    const url = buildOutlookWebUrl(payload);
    if (!url) return { ok: false, message: "Termin konnte nicht für Outlook erstellt werden." };
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true };
  }

  if (preference === "outlook-office") {
    const url = buildOutlookOfficeUrl(payload);
    if (!url) return { ok: false, message: "Termin konnte nicht für Outlook erstellt werden." };
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true };
  }

  try {
    const ics = buildEventIcs({
      ...payload,
      uid: `fanclub-event-${titleForFile}-${payload.startAt}@anni-perka-fanclub`,
    });
    const safeName = titleForFile.replace(/[^\wäöüÄÖÜß\-]+/gi, "-").slice(0, 40);
    downloadIcsFile(ics, `${safeName || "termin"}.ics`);
    return { ok: true };
  } catch {
    return { ok: false, message: "Kalenderdatei konnte nicht erstellt werden." };
  }
}
