import { describe, expect, it } from "vitest";
import { evaluateReferralSuspicion } from "@/lib/membership/referral-abuse";

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
