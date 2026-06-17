/** TV-Auftritte kurz nach Start ausblenden; Konzerte etwas länger sichtbar lassen. */
const TV_GRACE_MS = 3 * 60 * 60 * 1000;
const CONCERT_GRACE_MS = 6 * 60 * 60 * 1000;

function graceMs(kind?: string | null) {
  return kind === "tv" ? TV_GRACE_MS : CONCERT_GRACE_MS;
}

export function eventStartMs(startAt: string | null | undefined): number | null {
  if (!startAt) return null;
  const ms = new Date(startAt).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Termin noch relevant (läuft oder kurz danach) — für Listen. */
export function isEventStillVisible(
  event: { start_at: string | null; kind?: string | null },
  now = Date.now(),
): boolean {
  const start = eventStartMs(event.start_at);
  if (start === null) return false;
  return start + graceMs(event.kind) >= now;
}

/** Nächster Countdown-Zieltermin — nur zukünftige Starts. */
export function isEventUpcoming(
  event: { start_at: string | null },
  now = Date.now(),
): boolean {
  const start = eventStartMs(event.start_at);
  return start !== null && start > now;
}

export function filterVisibleEvents<T extends { start_at: string | null; kind?: string | null }>(
  events: T[],
  now = Date.now(),
): T[] {
  return events.filter((e) => isEventStillVisible(e, now));
}

export function filterUpcomingEvents<T extends { start_at: string | null }>(
  events: T[],
  now = Date.now(),
): T[] {
  return events.filter((e) => isEventUpcoming(e, now));
}
