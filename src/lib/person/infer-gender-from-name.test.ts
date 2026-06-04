import { describe, expect, it } from "vitest";
import { inferGenderFromFirstName } from "./infer-gender-from-name";

describe("inferGenderFromFirstName", () => {
  it("detects common German female names", () => {
    expect(inferGenderFromFirstName("Greta")).toBe("w");
    expect(inferGenderFromFirstName("Anna")).toBe("w");
  });

  it("detects common German male names", () => {
    expect(inferGenderFromFirstName("Peter")).toBe("m");
    expect(inferGenderFromFirstName("Jakob")).toBe("m");
  });

  it("returns null for unknown names", () => {
    expect(inferGenderFromFirstName("Xyzzy")).toBeNull();
  });
});
