import { describe, expect, it } from "vitest";
import {
  filterVisibleEvents,
  isEventStillVisible,
  isEventUpcoming,
} from "@/lib/events/event-schedule";
import { pickNextEvent } from "@/lib/events/pick-next-event";

const now = new Date("2026-06-08T12:00:00Z").getTime();

describe("event-schedule", () => {
  it("hides past TV events after grace period", () => {
    const sundayTv = {
      start_at: "2026-06-08T08:00:00Z",
      kind: "tv",
    };
    expect(isEventStillVisible(sundayTv, now)).toBe(false);
  });

  it("keeps upcoming events visible", () => {
    const next = { start_at: "2026-06-10T18:00:00Z", kind: "event" };
    expect(isEventUpcoming(next, now)).toBe(true);
    expect(isEventStillVisible(next, now)).toBe(true);
  });

  it("pickNextEvent returns soonest future event only", () => {
    const events = [
      { title: "Past Sunday", start_at: "2026-06-01T08:00:00Z" },
      { title: "Next concert", start_at: "2026-06-15T19:00:00Z" },
      { title: "Later", start_at: "2026-06-20T19:00:00Z" },
    ];
    expect(pickNextEvent(events, now)?.title).toBe("Next concert");
    expect(filterVisibleEvents(events, now)).toHaveLength(2);
  });
});
