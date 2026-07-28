import { CLUB_BANK, formatClubIbanDisplay } from "@/lib/payments/club-bank";

export function clubBankEmailVars() {
  return {
    bank_account_holder: CLUB_BANK.account_holder,
    bank_iban: formatClubIbanDisplay(),
    bank_bic: CLUB_BANK.bic,
    bank_reference: CLUB_BANK.reference_hint,
  };
}
