import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** Mitglied hat bereits eine Zahlungs-Buchung (Admin → Zahlungen) — keine zweite manuell anlegen. */
export async function memberHasAutomaticMembershipPaymentBooking(
  admin: AdminClient,
  memberId: string,
): Promise<boolean> {
  const { data: ledger, error: ledgerErr } = await admin
    .from("club_ledger_entries")
    .select("id")
    .eq("member_id", memberId)
    .eq("entry_type", "income")
    .eq("category", "membership")
    .not("payment_id", "is", null)
    .neq("bookkeeping_status", "cancelled")
    .limit(1)
    .maybeSingle();
  if (ledgerErr) {
    if (/club_ledger_entries|does not exist/i.test(ledgerErr.message)) return false;
    throw new Error(ledgerErr.message);
  }
  if (ledger?.id) return true;

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .select("id")
    .eq("user_id", memberId)
    .eq("payment_type", "membership_fee")
    .in("payment_status", ["open", "paid", "pending", "simulated"])
    .limit(1)
    .maybeSingle();
  if (payErr) {
    if (/payments|does not exist/i.test(payErr.message)) return false;
    throw new Error(payErr.message);
  }
  return Boolean(payment?.id);
}

export const MEMBERSHIP_LEDGER_DUPLICATE_HINT =
  "Für diese Person gibt es schon eine Beitrags-Zahlung in der App. Bitte den Eingang unter Admin → Zahlungen bestätigen — dort wird die Buchung automatisch erstellt. Nicht zusätzlich in der Historie oder Buchhaltung buchen.";
