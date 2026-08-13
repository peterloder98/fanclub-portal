import { describe, expect, it } from "vitest";
import {
  buildOpenContributionsBlock,
  computeYearContribution,
  contributionYearsForMember,
  deriveContributionStatus,
  dueDateForContributionYear,
  formatMembershipPaymentReference,
  resolveMemberPaymentReference,
  paymentBelongsToCalendarYear,
  paymentDeadlineForContributionYear,
  pickPrimaryContribution,
} from "./membership-contribution";

describe("calendar year contributions", () => {
  const profile = {
    id: "u1",
    first_name: "Sabine",
    last_name: "Müller",
    membership_number: "42",
  };

  it("due date is join date in entry year, Jan 1 otherwise", () => {
    expect(dueDateForContributionYear(2026, "2026-11-15")).toBe("2026-11-15");
    expect(dueDateForContributionYear(2027, "2026-11-15")).toBe("2027-01-01");
  });

  it("payment deadline is 14 days after due date", () => {
    expect(paymentDeadlineForContributionYear(2027, "2026-06-01")).toBe("2027-01-15");
    expect(paymentDeadlineForContributionYear(2026, "2026-11-15")).toBe("2026-11-29");
  });

  it("lists years from join year through current year", () => {
    const ref = new Date("2027-03-01T12:00:00");
    expect(contributionYearsForMember("2025-08-10", ref)).toEqual([2025, 2026, 2027]);
  });

  it("assigns payments by calendar year of entry_date", () => {
    expect(paymentBelongsToCalendarYear("2026-05-01", 2026)).toBe(true);
    expect(paymentBelongsToCalendarYear("2026-05-01", 2027)).toBe(false);
  });

  it("marks overdue after 14 days past due", () => {
    const due = "2027-01-01";
    expect(deriveContributionStatus(1500, 0, due, new Date("2027-01-14T12:00:00"))).toBe("open");
    expect(deriveContributionStatus(1500, 0, due, new Date("2027-01-16T12:00:00"))).toBe("overdue");
  });

  it("formats payment reference", () => {
    expect(formatMembershipPaymentReference(2027, "42", "Sabine", "Müller")).toBe(
      "Mitgliedsbeitrag / Sabine Müller",
    );
  });

  it("resolves payment reference from member data when contribution missing", () => {
    expect(
      resolveMemberPaymentReference({
        calendarYear: 2027,
        membershipNumber: "42",
        firstName: "Sabine",
        lastName: "Müller",
      }),
    ).toBe("Mitgliedsbeitrag / Sabine Müller");
    expect(
      resolveMemberPaymentReference({
        calendarYear: 2027,
        membershipNumber: "42",
        firstName: "Sabine",
        lastName: "Müller",
        fromContribution: "Beitrag 2027, Nr. 42, Sabine Müller",
      }),
    ).toBe("Mitgliedsbeitrag / Sabine Müller");
  });

  it("picks oldest overdue year first", () => {
    const y2026 = computeYearContribution(profile, "2026-06-01", 1500, 2026, [], new Date("2027-02-01"));
    const y2027 = computeYearContribution(profile, "2026-06-01", 1500, 2027, [], new Date("2027-02-01"));
    const primary = pickPrimaryContribution([y2027, y2026]);
    expect(primary?.calendarYear).toBe(2026);
    expect(primary?.status).toBe("overdue");
  });

  it("builds open contributions block", () => {
    const y2026 = computeYearContribution(profile, "2026-11-01", 1500, 2026, [], new Date("2026-12-27"));
    const block = buildOpenContributionsBlock([y2026]);
    expect(block).toContain("2026");
    expect(block).toContain("Mitgliedsbeitrag / Sabine Müller");
  });
});
