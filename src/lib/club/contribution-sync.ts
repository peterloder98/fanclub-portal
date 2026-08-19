import type { SupabaseClient } from "@supabase/supabase-js";
import { membershipLedgerRowCountsAsPaid } from "@/lib/club/membership-contribution";

/** Setzt profiles.contribution_date auf das Datum des letzten bestätigten Mitgliedsbeitrags. */
export async function syncMemberContributionDate(
  admin: SupabaseClient,
  memberId: string,
) {
  const { data: paidPayments, error: payErr } = await admin
    .from("payments")
    .select("id,paid_at,created_at")
    .eq("user_id", memberId)
    .eq("payment_type", "membership_fee")
    .eq("payment_status", "paid");
  if (payErr && !/payments|does not exist/i.test(payErr.message)) {
    throw new Error(payErr.message);
  }
  const paidPaymentIds = new Set((paidPayments ?? []).map((p) => p.id));

  const { data: rows, error } = await admin
    .from("club_ledger_entries")
    .select("entry_date,bookkeeping_status,payment_id")
    .eq("member_id", memberId)
    .eq("entry_type", "income")
    .eq("category", "membership")
    .order("entry_date", { ascending: false });
  if (error) {
    if (/club_ledger_entries|does not exist/i.test(error.message)) return;
    throw new Error(error.message);
  }

  let latest: string | null = null;
  for (const row of rows ?? []) {
    if (
      membershipLedgerRowCountsAsPaid(
        row as { bookkeeping_status?: string | null; payment_id?: string | null },
        paidPaymentIds,
      )
    ) {
      latest = row.entry_date;
      break;
    }
  }

  if (!latest) {
    for (const payment of paidPayments ?? []) {
      const entryDate = (payment.paid_at ?? payment.created_at ?? "").slice(0, 10);
      if (entryDate && (!latest || entryDate > latest)) latest = entryDate;
    }
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update({ contribution_date: latest })
    .eq("id", memberId);
  if (upErr) throw new Error(upErr.message);
}
