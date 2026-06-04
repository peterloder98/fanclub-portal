/** Bevorzugter Kalender — gespeichert am Profil (profiles.preferred_calendar). */

export type PreferredCalendar = "ask" | "google" | "outlook" | "ics";

export const PREFERRED_CALENDAR_OPTIONS: { value: PreferredCalendar; label: string }[] = [
  { value: "ask", label: "Jedes Mal fragen" },
  { value: "google", label: "Google Kalender" },
  { value: "outlook", label: "Outlook" },
  { value: "ics", label: ".ics-Datei für deine App" },
];

export function normalizePreferredCalendar(raw: string | null | undefined): PreferredCalendar {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "google") return "google";
  if (v === "outlook" || v === "outlook-office") return "outlook";
  if (v === "ics" || v === "apple") return "ics";
  return "ask";
}
