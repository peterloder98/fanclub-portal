import { describe, expect, it } from "vitest";
import {
  formatCalendarLocation,
  formatEventCity,
  formatLocation,
} from "./format";

describe("formatEventCity", () => {
  it("shows city only in Germany", () => {
    expect(formatEventCity({ city: "Koblenz", country: "DE" })).toBe("Koblenz");
  });

  it("appends country code abroad", () => {
    expect(formatEventCity({ city: "Weinfelden", country: "CH" })).toBe("Weinfelden (CH)");
  });
});

describe("formatLocation", () => {
  it("uses city only for events, not venue", () => {
    expect(
      formatLocation({
        kind: "event",
        city: "Koblenz",
        country: "DE",
        venue: "Rhein-Mosel-Halle",
      }),
    ).toBe("Koblenz");
  });

  it("shows broadcaster for tv", () => {
    expect(
      formatLocation({
        kind: "tv",
        broadcaster: "ZDF",
        city: "Mainz",
      }),
    ).toBe("TV · ZDF");
  });
});

describe("formatCalendarLocation", () => {
  it("keeps venue and full address for calendar export", () => {
    expect(
      formatCalendarLocation({
        venue: "Rhein-Mosel-Halle",
        address: "Rheingoldstraße 1",
        postal_code: "56068",
        city: "Koblenz",
        country: "DE",
      }),
    ).toBe("Rhein-Mosel-Halle, Rheingoldstraße 1, 56068 Koblenz");
  });
});
