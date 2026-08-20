import { MEMBERSHIP_FEE_EUR } from "@/lib/membership/constants";

export const STANDARD_ANNUAL_FEE_CENTS = MEMBERSHIP_FEE_EUR * 100;

/**
 * Jahresbeitrag für Mehrjahres-Logik: gespeicherter fee_cents, außer er ist
 * fälschlich auf den Gesamt-Überweisungsbetrag gesetzt (z. B. 30 € statt 15 €).
 */
export function resolveAnnualFeeCents(
  membershipFeeCents: number | null | undefined,
  paidCents: number,
): number {
  const fee =
    membershipFeeCents && membershipFeeCents > 0
      ? membershipFeeCents
      : STANDARD_ANNUAL_FEE_CENTS;
  if (
    fee === paidCents &&
    paidCents > STANDARD_ANNUAL_FEE_CENTS &&
    paidCents % STANDARD_ANNUAL_FEE_CENTS === 0
  ) {
    return STANDARD_ANNUAL_FEE_CENTS;
  }
  return fee;
}

/** Anzahl abgedeckter Kalenderjahre (mind. 1 bei positivem Betrag). */
export function yearsCoveredByFeePayment(
  paidCents: number,
  annualFeeCents: number,
): number {
  if (paidCents <= 0) return 0;
  if (annualFeeCents <= 0) return 1;
  return Math.max(1, Math.floor(paidCents / annualFeeCents));
}

/** start_date + N volle Jahre (YYYY-MM-DD), analog Poser-Korrektur. */
export function membershipEndDateAfterYearsPaid(
  startDate: string,
  yearsPaid: number,
): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate.trim());
  if (!m) return startDate;
  const y = Number(m[1]) + Math.max(1, yearsPaid);
  return `${y}-${m[2]}-${m[3]}`;
}
