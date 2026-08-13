import { CLUB_BANK, formatClubIbanDisplay } from "@/lib/payments/club-bank";

export function clubBankEmailVars(opts?: { bankReference?: string }) {
  return {
    bank_account_holder: CLUB_BANK.account_holder,
    bank_iban: formatClubIbanDisplay(),
    bank_bic: CLUB_BANK.bic,
    bank_name: CLUB_BANK.bank_name,
    bank_reference: opts?.bankReference?.trim() || CLUB_BANK.reference_hint,
  };
}
