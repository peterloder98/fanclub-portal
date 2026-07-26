/**
 * Community-Inhalte leeren (Posts, Gewinnspiele, Polls, Punkte, …).
 * Mitglieder/Profile bleiben erhalten — für Go-Live vor dem Start-Mailing.
 *
 *   node --env-file=.env.local scripts/wipe-community-content.mjs
 *   node --env-file=.env.local scripts/wipe-community-content.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { wipeCommunityContent } from "./lib/wipe-community-content.mjs";

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

console.log(dryRun ? "=== DRY RUN wipe community ===" : "=== LIVE wipe community ===");
await wipeCommunityContent(admin, { dryRun });
console.log("fertig — Profile/Mitgliedschaften unverändert.");
