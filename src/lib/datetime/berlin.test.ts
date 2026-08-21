import { describe, expect, it } from "vitest";
import {
  berlinWallClockToUtcIso,
  formatBerlinDateTime,
  formatBerlinTime,
  utcIsoToBerlinWallClock,
} from "./berlin";

describe("berlinWallClockToUtcIso", () => {
  it("maps CEST 21:00 to 19:00Z", () => {
    expect(berlinWallClockToUtcIso("2026-08-24T21:00")).toBe("2026-08-24T19:00:00.000Z");
  });

  it("maps CET 21:00 to 20:00Z", () => {
    expect(berlinWallClockToUtcIso("2026-01-15T21:00")).toBe("2026-01-15T20:00:00.000Z");
  });

  it("round-trips with utcIsoToBerlinWallClock", () => {
    const local = "2026-08-24T21:00";
    expect(utcIsoToBerlinWallClock(berlinWallClockToUtcIso(local))).toBe(local);
  });
});

describe("formatBerlin*", () => {
  it("shows 21:00 for stored 19:00Z in summer", () => {
    const iso = "2026-08-24T19:00:00.000Z";
    expect(formatBerlinTime(iso)).toMatch(/21:00/);
    expect(formatBerlinDateTime(iso)).toMatch(/21:00/);
  });
});
