import { describe, expect, it } from "vitest";
import {
  normalizeMemberCountryCode,
  parseCityAndCountryFromOrt,
} from "./country";

describe("parseCityAndCountryFromOrt", () => {
  it("extracts Schweiz from city suffix", () => {
    expect(parseCityAndCountryFromOrt("Altdorf - Schweiz")).toEqual({
      city: "Altdorf",
      country: "CH",
    });
  });

  it("extracts Niederlande despite typo", () => {
    expect(parseCityAndCountryFromOrt("Almelo - Niederande")).toEqual({
      city: "Almelo",
      country: "NL",
    });
  });

  it("keeps German cities as DE", () => {
    expect(parseCityAndCountryFromOrt("Rostock")).toEqual({
      city: "Rostock",
      country: "DE",
    });
  });
});

describe("normalizeMemberCountryCode", () => {
  it("maps aliases", () => {
    expect(normalizeMemberCountryCode("Schweiz")).toBe("CH");
    expect(normalizeMemberCountryCode("Niederlande")).toBe("NL");
    expect(normalizeMemberCountryCode("")).toBe("DE");
  });
});
