import { describe, expect, it } from "vitest";
import { birthdayPostBody, birthdayTemplateIndex } from "./templates";

describe("birthdayPostBody", () => {
  it("uses gender-specific salutation", () => {
    const m = birthdayPostBody("Max", "m", "user-a", "2026-06-04");
    const w = birthdayPostBody("Anna", "w", "user-b", "2026-06-04");
    expect(m.body.startsWith("Lieber Max")).toBe(true);
    expect(w.body.startsWith("Liebe Anna")).toBe(true);
    expect(m.body).not.toEqual(w.body);
  });

  it("picks stable different templates per user", () => {
    const a = birthdayPostBody("A", "w", "id-1", "2026-06-04");
    const b = birthdayPostBody("B", "w", "id-2", "2026-06-04");
    expect(birthdayTemplateIndex("id-1", "2026-06-04")).not.toBe(
      birthdayTemplateIndex("id-2", "2026-06-04"),
    );
    expect(a.body).not.toEqual(b.body);
  });
});
