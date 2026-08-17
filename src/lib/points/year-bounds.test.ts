import { describe, expect, it } from "vitest";
import {
  berlinCalendarYear,
  berlinMidnightUtc,
  berlinYearStartIso,
  defaultPointsYearForYearEndRun,
  yearBoundsBerlin,
} from "./year-bounds";

describe("year-bounds Berlin", () => {
  it("maps 1 Jan 2026 00:00 Berlin to 31 Dec 2025 23:00 UTC (CET)", () => {
    expect(berlinYearStartIso(2026)).toBe("2025-12-31T23:00:00.000Z");
  });

  it("maps 1 Jan 2027 00:00 Berlin to 31 Dec 2026 23:00 UTC", () => {
    expect(berlinYearStartIso(2027)).toBe("2026-12-31T23:00:00.000Z");
  });

  it("treats 31 Dec 2026 23:30 UTC as 2027 in Berlin (CET +1)", () => {
    expect(berlinCalendarYear(new Date("2026-12-31T23:30:00.000Z"))).toBe(2027);
  });

  it("treats 31 Dec 2026 22:30 UTC as 2026 in Berlin (CET)", () => {
    expect(berlinCalendarYear(new Date("2026-12-31T22:30:00.000Z"))).toBe(2026);
  });

  it("uses previous year for lottery in January", () => {
    expect(defaultPointsYearForYearEndRun(new Date("2027-01-10T12:00:00.000Z"))).toBe(2026);
  });

  it("uses current year for lottery after March", () => {
    expect(defaultPointsYearForYearEndRun(new Date("2026-08-17T08:00:00.000Z"))).toBe(2026);
  });

  it("year bounds do not overlap", () => {
    const a = yearBoundsBerlin(2026);
    const b = yearBoundsBerlin(2027);
    expect(a.end).toBe(b.start);
    expect(berlinMidnightUtc(2026, 6, 15).toISOString() >= a.start).toBe(true);
    expect(berlinMidnightUtc(2026, 6, 15).toISOString() < a.end).toBe(true);
  });
});
