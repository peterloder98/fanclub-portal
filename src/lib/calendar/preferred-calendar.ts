/** Bevorzugter Kalender — nur im Browser (localStorage), kein Server-Roundtrip. */

export type PreferredCalendar =
  | "ask"
  | "google"
  | "outlook"
  | "outlook-office"
  | "apple";

const STORAGE_KEY = "fanclub-preferred-calendar";

export const PREFERRED_CALENDAR_OPTIONS: { value: PreferredCalendar; label: string }[] = [
  { value: "ask", label: "Jedes Mal fragen" },
  { value: "google", label: "Google Kalender" },
  { value: "outlook", label: "Outlook (privat)" },
  { value: "outlook-office", label: "Outlook (Arbeit/Schule)" },
  { value: "apple", label: "Apple / andere (.ics)" },
];

export function getPreferredCalendar(): PreferredCalendar {
  if (typeof window === "undefined") return "ask";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (
    raw === "google" ||
    raw === "outlook" ||
    raw === "outlook-office" ||
    raw === "apple" ||
    raw === "ask"
  ) {
    return raw;
  }
  return "ask";
}

export function setPreferredCalendar(value: PreferredCalendar) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, value);
}
