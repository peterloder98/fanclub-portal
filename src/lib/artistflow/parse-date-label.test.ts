import { describe, expect, it } from "vitest";
import { parseArtistflowDateLabel } from "./parse-date-label";

describe("parseArtistflowDateLabel", () => {
  it("parses single day", () => {
    expect(parseArtistflowDateLabel("26.07.2026")).toEqual({
      startDate: "2026-07-26",
      endDate: null,
    });
  });

  it("parses range with year only on end", () => {
    expect(parseArtistflowDateLabel("08.10. - 11.10.2026")).toEqual({
      startDate: "2026-10-08",
      endDate: "2026-10-11",
    });
  });

  it("parses winter range", () => {
    expect(parseArtistflowDateLabel("27.01. - 31.01.2027")).toEqual({
      startDate: "2027-01-27",
      endDate: "2027-01-31",
    });
  });

  it("handles year boundary when start month > end month", () => {
    expect(parseArtistflowDateLabel("27.12. - 03.01.2027")).toEqual({
      startDate: "2026-12-27",
      endDate: "2027-01-03",
    });
  });

  it("parses range with years on both sides", () => {
    expect(parseArtistflowDateLabel("08.10.2026 - 11.10.2026")).toEqual({
      startDate: "2026-10-08",
      endDate: "2026-10-11",
    });
  });
});
