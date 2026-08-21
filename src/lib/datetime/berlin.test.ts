import { describe, expect, it } from "vitest";
import {
  berlinWallClockToUtcIso,
  formatBerlinDate,
  formatBerlinDateTime,
  formatBerlinDateTimeLong,
  formatBerlinDateTimeMedium,
  formatBerlinDateTimeShort,
  formatBerlinNotificationDateTime,
  formatBerlinTime,
  parseAdminWallClockToUtcIso,
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

describe("parseAdminWallClockToUtcIso", () => {
  it("parses wall clock as Berlin", () => {
    expect(parseAdminWallClockToUtcIso("2026-08-24T21:00")).toBe("2026-08-24T19:00:00.000Z");
  });

  it("passes through ISO with Z", () => {
    expect(parseAdminWallClockToUtcIso("2026-08-24T19:00:00.000Z")).toBe(
      "2026-08-24T19:00:00.000Z",
    );
  });
});

describe("formatBerlin*", () => {
  it("shows 21:00 for stored 19:00Z in summer", () => {
    const iso = "2026-08-24T19:00:00.000Z";
    expect(formatBerlinTime(iso)).toMatch(/21:00/);
    expect(formatBerlinDateTime(iso)).toMatch(/21:00/);
    expect(formatBerlinDateTimeLong(iso)).toMatch(/21:00/);
    expect(formatBerlinDateTimeMedium(iso)).toMatch(/21:00/);
    expect(formatBerlinDateTimeShort(iso)).toMatch(/21:00/);
    expect(formatBerlinNotificationDateTime(iso)).toMatch(/21:00/);
    expect(formatBerlinDate(iso)).toMatch(/24\.08\.2026/);
  });

  it("shows 20:50 for join_opens 18:50Z", () => {
    expect(formatBerlinTime("2026-08-24T18:50:00.000Z")).toMatch(/20:50/);
  });
});
