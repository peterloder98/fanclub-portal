export const BERLIN_TZ = "Europe/Berlin";

/** Anzeige für Admins & Termine — immer deutsche Lokalzeit. */
export function formatBerlinDateTime(
  value: string | Date | null | undefined,
  opts?: { withSeconds?: boolean },
): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    timeZone: BERLIN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: opts?.withSeconds ? "2-digit" : undefined,
  });
}

/** Lange Live-/Einladungs-Anzeige: „Montag, 21. August 2026 um 21:00“. */
export function formatBerlinDateTimeLong(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    timeZone: BERLIN_TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Nur Uhrzeit in Europe/Berlin, z. B. „21:00“. */
export function formatBerlinTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("de-DE", {
    timeZone: BERLIN_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Wandelt eine Berlin-Wanduhr (`YYYY-MM-DDTHH:mm` oder mit Sekunden) in einen UTC-Instant (ISO).
 * Vorstand meint immer Europe/Berlin — unabhängig von Server- oder Browser-Zeitzone.
 */
export function berlinWallClockToUtcIso(localValue: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localValue.trim());
  if (!m) {
    throw new Error("Ungültiges Datum/Uhrzeit (erwartet YYYY-MM-DDTHH:mm).");
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] ?? "0");
  if (
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new Error("Ungültiges Datum/Uhrzeit.");
  }

  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const HH = String(hour).padStart(2, "0");
  const MM = String(minute).padStart(2, "0");
  const SS = String(second).padStart(2, "0");
  const target = `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;

  // Start: interpret as UTC, then shift by Berlin offset until wall clock matches.
  let guess = Date.parse(`${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}.000Z`);
  for (let i = 0; i < 4; i++) {
    const shown = new Date(guess).toLocaleString("sv-SE", { timeZone: BERLIN_TZ });
    if (shown === target) return new Date(guess).toISOString();
    const shownAsUtc = Date.parse(shown.replace(" ", "T") + "Z");
    const targetAsUtc = Date.parse(target.replace(" ", "T") + "Z");
    const diff = targetAsUtc - shownAsUtc;
    if (diff === 0) break;
    guess += diff;
  }

  const finalShown = new Date(guess).toLocaleString("sv-SE", { timeZone: BERLIN_TZ });
  if (finalShown !== target) {
    throw new Error("Datum/Uhrzeit konnte nicht nach Europe/Berlin umgerechnet werden.");
  }
  return new Date(guess).toISOString();
}

/**
 * ISO-Instant → `YYYY-MM-DDTHH:mm` in Europe/Berlin (für Admin-Formulare).
 */
export function utcIsoToBerlinWallClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
