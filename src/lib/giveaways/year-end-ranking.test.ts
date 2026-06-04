import { describe, expect, it } from "vitest";
import { compareYearEndCandidates, rankYearEndTopN, type YearEndCandidate } from "./year-end-ranking";

function c(partial: Partial<YearEndCandidate> & { user_id: string; total: number }): YearEndCandidate {
  return {
    activityCount: 1,
    membership_number: "99",
    membership_start: "2024-01-01",
    last_name: "Zeta",
    first_name: "Zoe",
    ...partial,
  };
}

describe("year-end ranking", () => {
  it("sorts by points first", () => {
    const a = c({ user_id: "a", total: 100 });
    const b = c({ user_id: "b", total: 200 });
    expect(compareYearEndCandidates(a, b)).toBeGreaterThan(0);
  });

  it("breaks ties by activity count", () => {
    const fewer = c({ user_id: "a", total: 150, activityCount: 5 });
    const more = c({ user_id: "b", total: 150, activityCount: 12 });
    expect(rankYearEndTopN([fewer, more], 1)[0]?.user_id).toBe("b");
  });

  it("breaks ties by lower membership number", () => {
    const late = c({ user_id: "a", total: 100, activityCount: 3, membership_number: "42" });
    const early = c({ user_id: "b", total: 100, activityCount: 3, membership_number: "7" });
    expect(rankYearEndTopN([late, early], 1)[0]?.user_id).toBe("b");
  });

  it("returns exactly 10 when more tie at cutoff", () => {
    const pool = Array.from({ length: 14 }, (_, i) =>
      c({
        user_id: `u${i}`,
        total: i < 8 ? 200 - i : 100,
        activityCount: i < 8 ? 10 : 14 - i,
        membership_number: String(i + 1),
        last_name: `Member${i}`,
      }),
    );
    const top = rankYearEndTopN(pool, 10);
    expect(top).toHaveLength(10);
    expect(top.every((m) => m.total >= 100)).toBe(true);
    const atCutoff = top.filter((m) => m.total === 100);
    expect(atCutoff.length).toBeLessThanOrEqual(2);
  });
});
