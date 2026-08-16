import { describe, expect, it } from "vitest";
import {
  normalizeGender,
  personSalutation,
  resolveGenderForSalutation,
  salutation,
} from "./gender";

describe("normalizeGender", () => {
  it("maps m/w/d aliases", () => {
    expect(normalizeGender("m")).toBe("m");
    expect(normalizeGender("male")).toBe("m");
    expect(normalizeGender("w")).toBe("w");
    expect(normalizeGender("f")).toBe("w");
    expect(normalizeGender("female")).toBe("w");
    expect(normalizeGender("d")).toBe("d");
    expect(normalizeGender(null)).toBe("d");
  });
});

describe("resolveGenderForSalutation", () => {
  it("keeps explicit m/w", () => {
    expect(resolveGenderForSalutation("w", "Max")).toBe("w");
    expect(resolveGenderForSalutation("m", "Anna")).toBe("m");
  });

  it("infers from first name when profile is d/null", () => {
    expect(resolveGenderForSalutation("d", "Celina")).toBe("w");
    expect(resolveGenderForSalutation(null, "Peter")).toBe("m");
  });

  it("stays neutral when name is unknown", () => {
    expect(resolveGenderForSalutation("d", "Xyzzy")).toBe("d");
    expect(resolveGenderForSalutation(null, "Xyzzy")).toBe("d");
  });
});

describe("personSalutation", () => {
  it("uses Lieber / Liebe / Liebe/r", () => {
    expect(personSalutation("Max", "m")).toBe("Lieber Max");
    expect(personSalutation("Celina", "w")).toBe("Liebe Celina");
    expect(personSalutation("Celina", "d")).toBe("Liebe Celina");
    expect(salutation("Alex", "d")).toBe("Liebe/r Alex");
    expect(personSalutation("Xyzzy", "d")).toBe("Liebe/r Xyzzy");
  });
});
