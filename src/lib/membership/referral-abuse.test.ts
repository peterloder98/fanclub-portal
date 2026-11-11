import { describe, expect, it } from "vitest";
import {
  collectReviewedReferralSendIds,
  evaluateReferralSuspicion,
  referralOpenCaseIsDuplicate,
  referralSendsAwaitingReview,
} from "@/lib/membership/referral-abuse";
import {
  REFERRAL_REVIEW_AUTO_CLOSE_NOTE,
  referralReviewStatusLabel,
} from "@/lib/membership/referral-review-status";

function send(
  partial: Partial<{
    id: string;
    email: string;
    first: string;
    last: string;
    daysAgo: number;
    approved: boolean;
  }>,
) {
  const daysAgo = partial.daysAgo ?? 20;
  const created = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return {
    id: partial.id ?? crypto.randomUUID(),
    recipient_email: partial.email ?? "a@example.com",
    recipient_first_name: partial.first ?? "Ada",
    recipient_last_name: partial.last ?? "Test",
    created_at: created,
    link_opened_at: null,
    approved_at: partial.approved ? created : null,
    converted_application_id: null,
    converted_user_id: null,
  };
}

describe("evaluateReferralSuspicion", () => {
  it("does not flag fresh invites within grace period alone", () => {
    const firsts = ["Anna", "Bernd", "Clara", "Dirk", "Elena"];
    const lasts = ["Müller", "Schmidt", "Weber", "Fischer", "Wagner"];
    const rows = Array.from({ length: 5 }, (_, i) =>
      send({
        email: `n${i}@example.com`,
        daysAgo: 3,
        first: firsts[i],
        last: lasts[i],
      }),
    );
    expect(evaluateReferralSuspicion(rows).suspicious).toBe(false);
  });

  it("flags many stale failed invites with low conversion", () => {
    const firsts = ["AltA", "AltB", "AltC", "AltD", "AltE", "AltF"];
    const lasts = ["GastA", "GastB", "GastC", "GastD", "GastE", "GastF"];
    const rows = Array.from({ length: 6 }, (_, i) =>
      send({
        email: `old${i}@example.com`,
        daysAgo: 20,
        first: firsts[i],
        last: lasts[i],
      }),
    );
    const result = evaluateReferralSuspicion(rows);
    expect(result.suspicious).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("does not flag when conversions are healthy", () => {
    const rows = [
      send({ email: "ok0@example.com", daysAgo: 20, approved: true, first: "OkA", last: "MemA" }),
      send({ email: "ok1@example.com", daysAgo: 20, approved: true, first: "OkB", last: "MemB" }),
      send({ email: "ok2@example.com", daysAgo: 20, approved: true, first: "OkC", last: "MemC" }),
      send({ email: "ok3@example.com", daysAgo: 20, approved: true, first: "OkD", last: "MemD" }),
      send({ email: "open@example.com", daysAgo: 20, first: "Open", last: "Case" }),
    ];
    expect(evaluateReferralSuspicion(rows).suspicious).toBe(false);
  });
});

function staleBatch(prefix: string, count: number, daysAgo = 20) {
  const firsts = ["Anni", "Bernd", "Clara", "Dirk", "Elena", "Fritz", "Greta", "Hans", "Ida", "Jonas"];
  const lasts = ["Müller", "Schmidt", "Weber", "Fischer", "Wagner", "Becker", "Hoffmann", "Schäfer", "Koch", "Bauer"];
  return Array.from({ length: count }, (_, i) =>
    send({
      id: `${prefix}-${i}`,
      email: `${prefix}-${i}@example.com`,
      daysAgo,
      first: firsts[i] ?? `Name${i}`,
      last: lasts[i] ?? `Familie${i}`,
    }),
  );
}

describe("decided referral cases are not reopened", () => {
  it("does not treat the same stale invites as a new case", () => {
    const rows = staleBatch("old", 5);
    const reviewed = collectReviewedReferralSendIds([
      { status: "clawed_back", referral_send_ids: rows.map((row) => row.id) },
      { status: "clawed_back", referral_send_ids: rows.map((row) => row.id) },
      { status: "open", referral_send_ids: rows.map((row) => row.id) },
    ]);
    expect(referralOpenCaseIsDuplicate(rows.map((row) => row.id), reviewed)).toBe(true);
    expect(evaluateReferralSuspicion(referralSendsAwaitingReview(rows, reviewed)).suspicious).toBe(
      false,
    );
  });

  it("flags a later batch of stale invites that were not in the decided case", () => {
    const oldRows = staleBatch("old", 5, 40);
    const newRows = staleBatch("new", 5, 20);
    const reviewed = collectReviewedReferralSendIds([
      { status: "clawed_back", referral_send_ids: oldRows.map((row) => row.id) },
    ]);
    const fresh = referralSendsAwaitingReview([...oldRows, ...newRows], reviewed);
    const result = evaluateReferralSuspicion(fresh);
    expect(fresh.map((row) => row.id)).toEqual(newRows.map((row) => row.id));
    expect(result.suspicious).toBe(true);
    expect(result.reasons.some((reason) => reason.startsWith("5 Einladungen"))).toBe(true);
  });

  it("does not flag a couple of extra stale invites on top of a decided set", () => {
    const oldRows = staleBatch("old", 5, 40);
    const extra = staleBatch("extra", 2, 20);
    const reviewed = collectReviewedReferralSendIds([
      { status: "released", referral_send_ids: oldRows.map((row) => row.id) },
    ]);
    expect(
      evaluateReferralSuspicion(referralSendsAwaitingReview([...oldRows, ...extra], reviewed))
        .suspicious,
    ).toBe(false);
    expect(referralOpenCaseIsDuplicate([...oldRows.map((row) => row.id), "extra-0"], reviewed)).toBe(
      false,
    );
  });

  it("still flags a new burst that was not part of the decided invites", () => {
    const oldRows = staleBatch("old", 5, 50);
    const burst = Array.from({ length: 8 }, (_, i) =>
      send({
        id: `burst-${i}`,
        email: `burst-${i}@example.com`,
        daysAgo: i < 3 ? 16 : 4,
        first: ["Anni", "Bernd", "Clara", "Dirk", "Elena", "Fritz", "Greta", "Hans"][i],
        last: ["Müller", "Schmidt", "Weber", "Fischer", "Wagner", "Becker", "Hoffmann", "Schäfer"][i],
      }),
    );
    const reviewed = collectReviewedReferralSendIds([
      { status: "clawed_back", referral_send_ids: oldRows.map((row) => row.id) },
    ]);
    const result = evaluateReferralSuspicion(
      referralSendsAwaitingReview([...oldRows, ...burst], reviewed),
    );
    expect(result.suspicious).toBe(true);
    expect(result.reasons.some((reason) => reason.includes("in 30 Tagen"))).toBe(true);
  });

  it("ignores the open case when collecting already reviewed invites", () => {
    const reviewed = collectReviewedReferralSendIds([
      { status: "open", referral_send_ids: ["a", "b"] },
      { status: "dismissed", referral_send_ids: ["a"] },
    ]);
    expect([...reviewed]).toEqual(["a"]);
    expect(referralOpenCaseIsDuplicate(["a", "b"], new Set())).toBe(false);
  });
});

describe("referral review labels", () => {
  it("does not present an automatic close as a new board decision", () => {
    expect(referralReviewStatusLabel("dismissed", null)).toBe("geschlossen (bereits geprüft)");
    expect(referralReviewStatusLabel("released", REFERRAL_REVIEW_AUTO_CLOSE_NOTE)).toBe(
      "geschlossen (bereits geprüft)",
    );
    expect(referralReviewStatusLabel("released", null)).toBe("freigegeben");
    expect(referralReviewStatusLabel("clawed_back", null)).toBe("zurückgenommen");
  });
});
