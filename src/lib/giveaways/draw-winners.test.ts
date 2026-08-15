import { describe, expect, it } from "vitest";
import { pickGiveawayWinners, secureRandomIndex } from "./draw-winners";

describe("pickGiveawayWinners", () => {
  it("assigns one unique winner per prize in sort order", () => {
    const prizes = [
      { id: "p2", sort_order: 2 },
      { id: "p1", sort_order: 1 },
    ];
    const entries = [
      { user_id: "u1", is_eligible: true },
      { user_id: "u2", is_eligible: true },
      { user_id: "u3", is_eligible: false },
    ];
    // Always pick index 0 of remaining → u1 then u2
    const picks = pickGiveawayWinners(prizes, entries, () => 0);
    expect(picks).toEqual([
      { prize_id: "p1", user_id: "u1" },
      { prize_id: "p2", user_id: "u2" },
    ]);
  });

  it("never assigns the same user twice", () => {
    const prizes = [
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 1 },
      { id: "c", sort_order: 2 },
    ];
    const entries = [
      { user_id: "only", is_eligible: true },
      { user_id: "two", is_eligible: true },
    ];
    const picks = pickGiveawayWinners(prizes, entries, () => 0);
    expect(picks).toHaveLength(2);
    expect(new Set(picks.map((p) => p.user_id)).size).toBe(2);
  });

  it("returns empty when no eligible entries", () => {
    expect(
      pickGiveawayWinners(
        [{ id: "p", sort_order: 0 }],
        [{ user_id: "x", is_eligible: false }],
      ),
    ).toEqual([]);
  });

  it("stops when prizes outnumber eligible users", () => {
    const picks = pickGiveawayWinners(
      [
        { id: "p1", sort_order: 0 },
        { id: "p2", sort_order: 1 },
        { id: "p3", sort_order: 2 },
      ],
      [{ user_id: "solo", is_eligible: true }],
      () => 0,
    );
    expect(picks).toEqual([{ prize_id: "p1", user_id: "solo" }]);
  });
});

describe("secureRandomIndex", () => {
  it("returns values in range", () => {
    for (let i = 0; i < 40; i++) {
      const n = secureRandomIndex(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
  });

  it("rejects non-positive max", () => {
    expect(() => secureRandomIndex(0)).toThrow();
  });
});
