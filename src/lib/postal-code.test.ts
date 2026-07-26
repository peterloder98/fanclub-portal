import { describe, expect, it } from "vitest";
import {
  isValidPostalCode,
  sanitizePostalCode,
} from "./postal-code";

describe("postal-code by country", () => {
  it("validates DE as 5 digits", () => {
    expect(isValidPostalCode("18146", "DE")).toBe(true);
    expect(isValidPostalCode("1814", "DE")).toBe(false);
  });

  it("validates CH/AT as 4 digits", () => {
    expect(isValidPostalCode("6460", "CH")).toBe(true);
    expect(isValidPostalCode("7608", "NL")).toBe(true);
    expect(isValidPostalCode("7608 AB", "NL")).toBe(true);
  });

  it("sanitizes NL with letters", () => {
    expect(sanitizePostalCode("7608ab", "NL")).toBe("7608 AB");
  });
});
