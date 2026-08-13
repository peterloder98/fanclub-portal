/**
 * Produktion: Test-Empfehlungsdaten + offene Mitgliedsanträge leeren.
 * Aktive Mitglieder/Profile bleiben erhalten.
 *
 *   npx --yes tsx --env-file=.env.local scripts/wipe-referrals-and-open-applications.ts --dry-run
 *   npx --yes tsx --env-file=.env.local scripts/wipe-referrals-and-open-applications.ts
 */
import { createClient } from "@supabase/supabase-js";
import { deleteMembershipApplicationCompletely } from "../src/lib/membership/delete-application";

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const OPEN_APP_STATUSES = ["submitted", "reviewed"] as const;

async function countAll(table: string): Promise<{ count: number; missing: boolean }> {
  const { count, error } = await admin.from(table).select("id", { count: "exact", head: true });
  if (error) {
    if (/does not exist/i.test(error.message)) return { count: 0, missing: true };
    throw new Error(`${table}: ${error.message}`);
  }
  return { count: count ?? 0, missing: false };
}

async function countOpenApps(): Promise<number> {
  const { count, error } = await admin
    .from("membership_applications")
    .select("id", { count: "exact", head: true })
    .in("status", [...OPEN_APP_STATUSES]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function wipeTable(table: string) {
  const before = await countAll(table);
  if (before.missing) {
    console.log(`  skip missing: ${table}`);
    return;
  }
  if (dryRun) {
    console.log(`  [dry] ${table}: ${before.count}`);
    return;
  }
  let { error } = await admin.from(table).delete().not("id", "is", null);
  if (error) {
    ({ error } = await admin.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z"));
  }
  if (error) throw new Error(`${table} wipe: ${error.message}`);
  const after = await countAll(table);
  console.log(`  geleert: ${table} (${before.count} → ${after.count})`);
}

async function main() {
  console.log(dryRun ? "=== DRY RUN wipe referrals + open apps ===" : "=== LIVE wipe referrals + open apps ===");
  console.log(`URL: ${url}\n`);

  const beforeSends = await countAll("membership_referral_sends");
  const beforeConv = await countAll("referral_conversions");
  const beforeReviews = await countAll("membership_referral_reviews");
  const beforeOpenApps = await countOpenApps();
  const { count: beforeApproved } = await admin
    .from("membership_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  const beforeProfiles = await countAll("profiles");

  console.log("Vorher:");
  console.log(`  membership_referral_sends: ${beforeSends.count}${beforeSends.missing ? " (fehlt)" : ""}`);
  console.log(`  referral_conversions: ${beforeConv.count}${beforeConv.missing ? " (fehlt)" : ""}`);
  console.log(`  membership_referral_reviews: ${beforeReviews.count}${beforeReviews.missing ? " (fehlt)" : ""}`);
  console.log(`  offene Anträge (submitted/reviewed): ${beforeOpenApps}`);
  console.log(`  genehmigte Anträge (bleiben): ${beforeApproved ?? 0}`);
  console.log(`  profiles (bleiben, außer reine Antragsteller): ${beforeProfiles.count}\n`);

  console.log("1) Empfehlungsdaten:");
  await wipeTable("membership_referral_reviews");
  await wipeTable("referral_conversions");
  await wipeTable("membership_referral_sends");

  {
    const { count: ptsBefore } = await admin
      .from("points_transactions")
      .select("id", { count: "exact", head: true })
      .eq("reason", "membership_referral_completed");
    if (dryRun) {
      console.log(`  [dry] points_transactions membership_referral_completed: ${ptsBefore ?? 0}`);
    } else if ((ptsBefore ?? 0) > 0) {
      const { error } = await admin
        .from("points_transactions")
        .delete()
        .eq("reason", "membership_referral_completed");
      if (error) console.warn(`  points_transactions referral: ${error.message}`);
      else console.log(`  points_transactions (membership_referral_completed): ${ptsBefore} gelöscht`);
    } else {
      console.log("  points_transactions (membership_referral_completed): 0");
    }
  }

  console.log("\n2) Offene Mitgliedsanträge:");
  const { data: openApps, error: openErr } = await admin
    .from("membership_applications")
    .select("id,status,first_name,last_name,email,user_id")
    .in("status", [...OPEN_APP_STATUSES])
    .order("created_at", { ascending: true });
  if (openErr) throw new Error(openErr.message);

  const apps = openApps ?? [];
  console.log(`  zu löschen: ${apps.length}`);
  let deletedApps = 0;
  let deletedApplicantUsers = 0;
  const failures: string[] = [];

  for (const app of apps) {
    const label = `${app.first_name} ${app.last_name} <${app.email}> [${app.status}] ${app.id}`;
    if (dryRun) {
      console.log(`  [dry] ${label}`);
      continue;
    }
    try {
      const result = await deleteMembershipApplicationCompletely(admin, app.id);
      deletedApps += 1;
      if (result.deletedUserId) deletedApplicantUsers += 1;
      console.log(`  gelöscht: ${label}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`${label}: ${msg}`);
      console.warn(`  FEHLER: ${label} — ${msg}`);
    }
  }

  const afterSends = await countAll("membership_referral_sends");
  const afterConv = await countAll("referral_conversions");
  const afterReviews = await countAll("membership_referral_reviews");
  const afterOpenApps = await countOpenApps();
  const afterProfiles = await countAll("profiles");

  console.log("\nNachher / Verifikation:");
  console.log(`  membership_referral_sends: ${afterSends.count}`);
  console.log(`  referral_conversions: ${afterConv.count}`);
  console.log(`  membership_referral_reviews: ${afterReviews.count}`);
  console.log(`  offene Anträge: ${afterOpenApps}`);
  console.log(`  profiles: ${beforeProfiles.count} → ${afterProfiles.count}`);
  if (!dryRun) {
    console.log(`  Anträge gelöscht: ${deletedApps}, reine Antragsteller-Accounts: ${deletedApplicantUsers}`);
  }
  if (failures.length) {
    console.log(`\nNicht sicher löschbar (${failures.length}):`);
    for (const f of failures) console.log(`  - ${f}`);
  }

  const ok =
    (afterSends.missing || afterSends.count === 0) &&
    (afterConv.missing || afterConv.count === 0) &&
    (afterReviews.missing || afterReviews.count === 0) &&
    afterOpenApps === 0 &&
    failures.length === 0;

  console.log(ok || dryRun ? "\nFertig." : "\nFertig mit Restbeständen — siehe oben.");
  if (!ok && !dryRun) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
