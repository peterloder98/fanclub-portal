import { describe, expect, it } from "vitest";
import {
  buildEmailSalutation,
  ensureEmailSalutationVars,
  normalizeLegacySalutationPlaceholders,
} from "./salutation-block";

describe("email salutation block", () => {
  it("genders Lieber / Liebe / Liebe/r", () => {
    expect(buildEmailSalutation("Max", "m")).toBe("Lieber Max");
    expect(buildEmailSalutation("Anna", "w")).toBe("Liebe Anna");
    expect(buildEmailSalutation("Celina", "d")).toBe("Liebe Celina");
    expect(buildEmailSalutation("Alex", "d")).toBe("Liebe/r Alex");
    expect(buildEmailSalutation("Xyzzy", null)).toBe("Liebe/r Xyzzy");
  });

  it("fills salutation from first_name + gender", () => {
    expect(
      ensureEmailSalutationVars({ first_name: "Anna", gender: "w" }).salutation,
    ).toBe("Liebe Anna");
  });

  it("rewrites legacy Liebe/r placeholders", () => {
    expect(
      normalizeLegacySalutationPlaceholders("Liebe/r {{first_name}},\n\nhallo"),
    ).toBe("{{salutation}},\n\nhallo");
  });

  it("rewrites Hallo {{first_name}} greetings", () => {
    expect(normalizeLegacySalutationPlaceholders("Hallo {{first_name}},\n\nx")).toBe(
      "{{salutation}},\n\nx",
    );
  });
});
