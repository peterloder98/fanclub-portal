import { normalizeMemberCountryCode } from "@/lib/members/country";
import {
  MEMBERSHIP_FEE_ABROAD_CENTS,
  MEMBERSHIP_FEE_CENTS,
  MEMBERSHIP_FEE_EUR,
  MEMBERSHIP_FEE_ABROAD_EUR,
} from "@/lib/membership/constants";

/** Bekannte Jahresbeiträge (für Mehrjahres-Korrektur). */
export const KNOWN_ANNUAL_FEE_CENTS = [
  MEMBERSHIP_FEE_CENTS,
  MEMBERSHIP_FEE_ABROAD_CENTS,
] as const;

/**
 * Jahresbeitrag für Neuanträge anhand Wohnsitz-Land.
 * Deutschland → 15,00 €; jedes andere Land → 20,00 €.
 * Nicht für Bestand/Verlängerungen verwenden (dort gespeicherten fee_cents belassen).
 */
export function applicationFeeCentsForCountry(
  country: string | null | undefined,
): number {
  const code = normalizeMemberCountryCode(country, "");
  if (code === "DE") return MEMBERSHIP_FEE_CENTS;
  return MEMBERSHIP_FEE_ABROAD_CENTS;
}

export function applicationFeeEurForCountry(
  country: string | null | undefined,
): number {
  return applicationFeeCentsForCountry(country) / 100;
}

export function formatApplicationFeeEurLabel(feeCents: number): string {
  const eur = (feeCents / 100).toFixed(2).replace(".", ",");
  return `${eur} €`;
}

export function isDomesticMembershipCountry(
  country: string | null | undefined,
): boolean {
  return normalizeMemberCountryCode(country, "") === "DE";
}

export function membershipFeeEurHint(): string {
  return `${MEMBERSHIP_FEE_EUR},00 € (Deutschland) / ${MEMBERSHIP_FEE_ABROAD_EUR},00 € (Ausland)`;
}
