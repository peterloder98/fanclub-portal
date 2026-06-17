import { eventStartMs, isEventUpcoming } from "@/lib/events/event-schedule";

export function pickNextEvent<T extends { start_at: string | null; title: string }>(
  events: T[],
  now = Date.now(),
): T | null {
  const upcoming = events
    .filter((e) => isEventUpcoming(e, now))
    .sort((a, b) => eventStartMs(a.start_at)! - eventStartMs(b.start_at)!);

  return upcoming[0] ?? null;
}
