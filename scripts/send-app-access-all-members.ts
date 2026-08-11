/**
 * Massenversand: App-Zugang-Einladung an alle aktiven Mitglieder.
 *
 * Voraussetzungen:
 *   - EMAIL_OUTBOUND_MODE=live
 *   - SQL 133_email_app_access_go_live.sql ausgeführt
 *   - APP_BASE_URL / NEXT_PUBLIC_APP_URL gesetzt
 *
 * Trockenlauf (keine Mails):
 *   DRY_RUN=1 npx --yes tsx --env-file=.env.local scripts/send-app-access-all-members.ts
 *
 * Echter Versand:
 *   npx --yes tsx --env-file=.env.local scripts/send-app-access-all-members.ts
 */
import { createClient } from "@supabase/supabase-js";
import { sendAppAccessSetupEmail } from "../src/lib/email/app-access-setup";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

async function main() {
  console.log(dryRun ? "=== DRY RUN (keine Mails) ===" : "=== Massenversand App-Zugang ===");

  const { data: memberships, error: mErr } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  if (mErr) throw new Error(mErr.message);

  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id).filter(Boolean))];
  if (userIds.length === 0) {
    console.log("Keine aktiven Mitgliedschaften gefunden.");
    return;
  }

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,gender")
    .in("id", userIds);
  if (pErr) throw new Error(pErr.message);

  const recipients = (profiles ?? []).filter((p) => Boolean(p.email?.trim()));
  console.log(`Aktive Mitglieder mit E-Mail: ${recipients.length}`);

  let ok = 0;
  let fail = 0;
  let skipped = 0;

  for (const p of recipients) {
    const email = p.email!.trim();
    const firstName = p.first_name?.trim() || "Fan";
    console.log(`→ ${firstName} <${email}>`);
    if (dryRun) {
      skipped += 1;
      continue;
    }
    try {
      const result = await sendAppAccessSetupEmail({
        email,
        firstName,
        gender: p.gender,
        userId: p.id,
      });
      if (!result.ok) {
        fail += 1;
        console.error(
          "  Fehler:",
          "skipped" in result && result.skipped
            ? `übersprungen (${"reason" in result ? result.reason : "?"})`
            : ("error" in result ? result.error : "unbekannt"),
        );
        continue;
      }
      ok += 1;
      console.log("  ✓ gesendet");
    } catch (e) {
      fail += 1;
      console.error("  Fehler:", e instanceof Error ? e.message : e);
    }
  }

  console.log(`\nFertig. ok=${ok} fail=${fail} dryRunSkipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
