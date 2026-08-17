const BERLIN = "Europe/Berlin";

function berlinDateParts(at: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: num("year"), month: num("month"), day: num("day") };
}

/** Kalenderjahr in Europe/Berlin. */
export function berlinCalendarYear(at = new Date()): number {
  return berlinDateParts(at).year;
}

/** Kalendermonat 1–12 in Europe/Berlin. */
export function berlinCalendarMonth(at = new Date()): number {
  return berlinDateParts(at).month;
}

/**
 * UTC-Instant für 00:00:00 am Kalendertag `year-month-day` in Europe/Berlin.
 */
export function berlinMidnightUtc(year: number, month = 1, day = 1): Date {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const dayKey = `${yyyy}-${mm}-${dd}`;
  const base = Date.parse(`${dayKey}T00:00:00.000Z`);
  for (let deltaH = -14; deltaH <= 14; deltaH++) {
    const t = new Date(base + deltaH * 3_600_000);
    const local = t.toLocaleString("sv-SE", { timeZone: BERLIN });
    if (local === `${dayKey} 00:00:00`) return t;
  }
  return new Date(`${dayKey}T00:00:00+01:00`);
}

export function berlinYearStartIso(year: number): string {
  return berlinMidnightUtc(year, 1, 1).toISOString();
}

export function berlinYearEndIso(year: number): string {
  return berlinMidnightUtc(year + 1, 1, 1).toISOString();
}

export function currentBerlinYearStartIso(at = new Date()): string {
  return berlinYearStartIso(berlinCalendarYear(at));
}

export function yearBoundsBerlin(pointsYear: number): { start: string; end: string } {
  return { start: berlinYearStartIso(pointsYear), end: berlinYearEndIso(pointsYear) };
}

/**
 * Jahr, dessen Top-10 verlost wird: im Januar–März das Vorjahr
 * (Auslosung oft erst nach Silvester), sonst das laufende Berliner Jahr.
 */
export function defaultPointsYearForYearEndRun(at = new Date()): number {
  const year = berlinCalendarYear(at);
  const month = berlinCalendarMonth(at);
  return month <= 3 ? year - 1 : year;
}
