import type { SupabaseClient } from "@supabase/supabase-js";

/** Setzt profiles.contribution_date auf das Datum des letzten Mitgliedsbeitrags im Ledger. */
export async function syncMemberContributionDate(
  admin: SupabaseClient,
  memberId: string,
) {
  const { data: rows, error } = await admin
    .from("club_ledger_entries")
    .select("entry_date")
    .eq("member_id", memberId)
    .eq("entry_type", "income")
    .eq("category", "membership")
    .order("entry_date", { ascending: false })
    .limit(1);
  if (error) {
    if (/club_ledger_entries|does not exist/i.test(error.message)) return;
    throw new Error(error.message);
  }

  const latest = rows?.[0]?.entry_date ?? null;
  const { error: upErr } = await admin
    .from("profiles")
    .update({ contribution_date: latest })
    .eq("id", memberId);
  if (upErr) throw new Error(upErr.message);
}
