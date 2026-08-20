import { describe, expect, it } from "vitest";
import {
  membershipEndDateAfterYearsPaid,
  resolveAnnualFeeCents,
  yearsCoveredByFeePayment,
} from "./membership-fee-coverage";

describe("membership fee coverage", () => {
  it("treats 30 € as two years at 15 € annual fee", () => {
    expect(yearsCoveredByFeePayment(3000, 1500)).toBe(2);
    expect(membershipEndDateAfterYearsPaid("2026-08-16", 2)).toBe("2028-08-16");
  });

  it("keeps 15 € as one year", () => {
    expect(yearsCoveredByFeePayment(1500, 1500)).toBe(1);
  });

  it("corrects fee_cents that were set to the multi-year transfer amount", () => {
    expect(resolveAnnualFeeCents(3000, 3000)).toBe(1500);
    expect(resolveAnnualFeeCents(1500, 3000)).toBe(1500);
  });
});
