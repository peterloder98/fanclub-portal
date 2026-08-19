/**
 * Korrigiert doppelt gezählte Vor-App-Mitgliedsbeiträge:
 * entry_date auf Beitrittsdatum setzen, wenn vor Buchhaltungs-Start.
 *
 *   node --env-file=.env.local scripts/fix-pre-accounting-membership-entries.mjs --dry-run
 *   node --env-file=.env.local scripts/fix-pre-accounting-membership-entries.mjs
 *   node --env-file=.env.local scripts/fix-pre-accounting-membership-entries.mjs --member "Bäcker"
 */
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");
const memberFilter = (() => {
  const i = process.argv.indexOf("--member");
  return i >= 0 ? process.argv[i + 1]?.trim() : null;
})();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

async function getAccountingStartDate() {
  const { data, error } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "accounting_start_date")
    .maybeSingle();
  if (error) throw error;
  return data?.value?.trim() || null;
}

async function main() {
  const accountingStart = await getAccountingStartDate();
  if (!accountingStart) {
    console.error("Kein accounting_start_date in app_settings.");
    process.exit(1);
  }
  console.log(`Buchhaltungs-Start: ${accountingStart}`);
  console.log(dryRun ? "=== DRY RUN ===" : "=== FIX ===");

  let profileQuery = admin.from("profiles").select("id,first_name,last_name,membership_number");
  if (memberFilter) {
    profileQuery = profileQuery.or(
      `last_name.ilike.%${memberFilter}%,first_name.ilike.%${memberFilter}%`,
    );
  }
  const { data: profiles, error: pErr } = await profileQuery;
  if (pErr) throw pErr;

  let fixed = 0;
  for (const profile of profiles ?? []) {
    const { data: membership } = await admin
      .from("memberships")
      .select("start_date")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const startDate = membership?.start_date?.trim();
    if (!startDate || startDate >= accountingStart) continue;

    const { data: payments } = await admin
      .from("payments")
      .select("id,internal_reference,payment_status")
      .eq("user_id", profile.id)
      .eq("payment_type", "membership_fee")
      .eq("payment_status", "paid");

    for (const payment of payments ?? []) {
      const { data: ledger } = await admin
        .from("club_ledger_entries")
        .select("id,entry_date,amount_cents,bookkeeping_status")
        .eq("payment_id", payment.id)
        .maybeSingle();

      if (!ledger?.id) continue;
      if (ledger.entry_date < accountingStart) {
        console.log(
          `  OK ${profile.last_name}, ${profile.first_name}: ${payment.internal_reference} bereits ${ledger.entry_date}`,
        );
        continue;
      }

      console.log(
        `  FIX ${profile.last_name}, ${profile.first_name} (${profile.membership_number ?? "?"})`,
      );
      console.log(
        `       ${payment.internal_reference}: entry_date ${ledger.entry_date} → ${startDate}`,
      );

      if (!dryRun) {
        const { error: upErr } = await admin
          .from("club_ledger_entries")
          .update({ entry_date: startDate })
          .eq("id", ledger.id);
        if (upErr) throw upErr;
      }
      fixed++;
    }
  }

  console.log(`Fertig: ${fixed} Buchung(en) ${dryRun ? "würden korrigiert" : "korrigiert"}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
