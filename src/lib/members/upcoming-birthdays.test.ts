import { describe, expect, it, vi } from "vitest";
import { buildUpcomingBirthdays } from "./upcoming-birthdays";

describe("buildUpcomingBirthdays", () => {
  it("sorts by next occurrence and formats without age", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T10:00:00Z"));

    const rows = buildUpcomingBirthdays(
      [
        {
          id: "a",
          first_name: "Max",
          last_name: "M",
          birthdate: "1990-12-25",
          name: "Max M",
          avatarUrl: null,
        },
        {
          id: "b",
          first_name: "Anna",
          last_name: "A",
          birthdate: "1985-06-10",
          name: "Anna A",
          avatarUrl: null,
        },
      ],
      10,
    );

    expect(rows[0]?.userId).toBe("b");
    expect(rows[0]?.dateLabel).toMatch(/2026/);
    expect(rows[0]?.dateLabel).not.toMatch(/\d+\s*Jahre/i);

    vi.useRealTimers();
  });
});
