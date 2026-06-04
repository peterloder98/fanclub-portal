import { buildEventIcs, downloadIcsFile } from "@/lib/calendar/build-ics";
import {
  buildGoogleCalendarUrl,
  buildOutlookWebUrl,
  type EventCalendarPayload,
} from "@/lib/calendar/event-calendar-links";
import type { PreferredCalendar } from "@/lib/calendar/preferred-calendar";

const POPUP_FEATURES = "width=520,height=700,noopener,noreferrer";

export function openGoogleCalendarPopup(url: string) {
  const w = window.open(url, "fanclub-google-calendar", POPUP_FEATURES);
  if (!w) window.open(url, "_blank", "noopener,noreferrer");
}

export function openEventInPreferredCalendar(
  preference: PreferredCalendar,
  payload: EventCalendarPayload,
  titleForFile: string,
): { ok: true; mode?: "popup" | "download" } | { ok: false; message: string } {
  if (preference === "ask") return { ok: false, message: "ask" };

  if (preference === "google") {
    const url = buildGoogleCalendarUrl(payload);
    if (!url) return { ok: false, message: "Termin konnte nicht für Google erstellt werden." };
    openGoogleCalendarPopup(url);
    return { ok: true, mode: "popup" };
  }

  if (preference === "outlook") {
    const url = buildOutlookWebUrl(payload);
    if (!url) return { ok: false, message: "Termin konnte nicht für Outlook erstellt werden." };
    const w = window.open(url, "fanclub-outlook-calendar", POPUP_FEATURES);
    if (!w) window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true, mode: "popup" };
  }

  try {
    const ics = buildEventIcs({
      ...payload,
      uid: `fanclub-event-${titleForFile}-${payload.startAt}@anni-perka-fanclub`,
    });
    const safeName = titleForFile.replace(/[^\wäöüÄÖÜß\-]+/gi, "-").slice(0, 40);
    downloadIcsFile(ics, `${safeName || "termin"}.ics`);
    return { ok: true, mode: "download" };
  } catch {
    return { ok: false, message: "Kalenderdatei konnte nicht erstellt werden." };
  }
}
