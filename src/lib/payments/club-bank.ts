/** Offizielle Vereins-Kontodaten (Überweisung Mitgliedsbeitrag). */
export const CLUB_BANK = {
  account_holder: "Anni-Perka Fanclub",
  iban: "DE42 1305 0000 0201 1955 42",
  /** Ostseesparkasse Rostock (BLZ 13050000) */
  bic: "NOLADE21ROS",
  bank_name: "Ostseesparkasse Rostock",
  reference_hint: "Mitgliedsbeitrag / Vorname Nachname",
} as const;

export function formatClubIbanDisplay(iban: string = CLUB_BANK.iban) {
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

/** Verwendungszweck im Antrag — live aus Vor-/Nachname. */
export function formatApplicationPaymentReference(
  firstName: string,
  lastName: string,
): string {
  const first = firstName.trim();
  const last = lastName.trim();
  if (!first && !last) return CLUB_BANK.reference_hint;
  return `Mitgliedsbeitrag / ${[first, last].filter(Boolean).join(" ")}`;
}
