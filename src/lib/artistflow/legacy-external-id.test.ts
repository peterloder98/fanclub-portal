import { describe, expect, it } from "vitest";
import { eventCalendarDay } from "./legacy-external-id";

describe("eventCalendarDay", () => {
  it("uses Europe/Berlin calendar day, not UTC", () => {
    expect(eventCalendarDay("2026-06-09T22:00:00.000Z")).toBe("2026-06-10");
    expect(eventCalendarDay("2026-06-09T00:00:00.000Z")).toBe("2026-06-09");
  });
});
