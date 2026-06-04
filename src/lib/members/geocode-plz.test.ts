import { describe, expect, it } from "vitest";
import { isGermanCountry } from "./geocode-plz";

describe("isGermanCountry", () => {
  it("accepts common German country values", () => {
    expect(isGermanCountry("DE")).toBe(true);
    expect(isGermanCountry("Deutschland")).toBe(true);
    expect(isGermanCountry(null)).toBe(true);
    expect(isGermanCountry("AT")).toBe(false);
  });
});
