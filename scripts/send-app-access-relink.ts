/**
 * Relink-Kampagne: neuer Zugangslink an Mitglieder ohne App-Aktivität.
 *
 * Gedrosselt (Anti-Spam): Pause zwischen Mails, Extra-Pause alle 10.
 * Eine Mail je Inbox. Christine Schmidt (Nr. 22) ausgeschlossen.
 *
 * Trockenlauf:
 *   DRY_RUN=1 npx --yes tsx --env-file=.env.local scripts/send-app-access-relink.ts
 *
 * Optional nur eine Mitgliedsnummer:
 *   EMAIL_OUTBOUND_MODE=live npx --yes tsx --env-file=.env.local scripts/send-app-access-relink.ts --nr=22
 */
import { createClient } from "@supabase/supabase-js";
import { sendAppAccessRelinkEmail } from "../src/lib/email/app-access-relink";
import { getOutboundEmailMode } from "../src/lib/email/outbound-policy";
import { isHiddenProfileId } from "../src/lib/members/hidden";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const DELAY_MS = 5_000;
const BURST = 10;
const BURST_PAUSE_MS = 45_000;

const SKIP_EMAILS = new Set(["mail@peter-loder.de"]);
const onlyNr = (() => {
  const arg = process.argv.find((a) => a.startsWith("--nr="));
  if (!arg) return null;
  return arg.slice("--nr=".length).trim().replace(/^0+/, "") || "0";
})();

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isInvalidPlaceholderEmail(email: string): boolean {
  const e = normalizeEmail(email);
  if (!e) return true;
  if (e.includes("@fanclub-import.invalid")) return true;
  if (e === "noemail" || e.startsWith("noemail@") || e.includes("noemail")) return true;
  if (!e.includes("@") || e.endsWith("@") || e.startsWith("@")) return true;
  return false;
}

function membershipKey(n: string | null | undefined): string {
  return String(n ?? "").trim().replace(/^0+/, "") || "";
}

async function backfillAndreasSeidel() {
  const { data: rows, error } = await admin
    .from("profiles")
    .select("id,first_name,last_name,membership_number,last_app_active_at")
    .eq("membership_number", "2");
  if (error) {
    console.warn("Andreas-Backfill:", error.message);
    return;
  }
  const andreas =
    (rows ?? []).find((p) => membershipKey(p.membership_number) === "2") ?? rows?.[0];
  if (!andreas?.id) {
    console.warn("Andreas Seidel (Nr. 2) nicht gefunden.");
    return;
  }
  if (andreas.last_app_active_at) {
    console.log(`Andreas Seidel bereits in Statistik (app=${andreas.last_app_active_at}).`);
    return;
  }
  const { data: auth } = await admin.auth.admin.getUserById(andreas.id);
  const at = auth.user?.last_sign_in_at ?? new Date().toISOString();
  const { error: upErr } = await admin
    .from("profiles")
    .update({ last_app_active_at: at })
    .eq("id", andreas.id);
  if (upErr) {
    console.warn("Andreas last_app_active_at:", upErr.message);
    return;
  }
  console.log(`Andreas Seidel (Nr. 2) für Statistik gesetzt: last_app_active_at=${at}`);
}

async function main() {
  const outboundMode = getOutboundEmailMode();
  console.log(dryRun ? "=== DRY RUN Relink ===" : "=== LIVE Relink (gedrosselt) ===");
  console.log(`EMAIL_OUTBOUND_MODE=${outboundMode}`);
  if (onlyNr) console.log(`ONLY_NR=${onlyNr}`);

  if (!dryRun && outboundMode !== "live") {
    console.error("Abbruch: Echter Versand erfordert EMAIL_OUTBOUND_MODE=live.");
    process.exit(1);
  }

  if (!onlyNr) await backfillAndreasSeidel();

  const { data: memberships, error: mErr } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  if (mErr) throw new Error(mErr.message);
  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id).filter(Boolean))];

  const profiles: Array<{
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    gender: string | null;
    membership_number: string | null;
    last_app_active_at: string | null;
  }> = [];
  for (let i = 0; i < userIds.length; i += 200) {
    const { data, error } = await admin
      .from("profiles")
      .select("id,email,first_name,last_name,gender,membership_number,last_app_active_at")
      .in("id", userIds.slice(i, i + 200));
    if (error) throw new Error(error.message);
    profiles.push(...(data ?? []));
  }

  const recipients: typeof profiles = [];
  const seenInbox = new Set<string>();
  const skipReasons: Record<string, number> = {};
  function bump(reason: string) {
    skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
  }

  const sorted = [...profiles].sort(
    (a, b) => Number(membershipKey(a.membership_number)) - Number(membershipKey(b.membership_number)),
  );

  for (const p of sorted) {
    const nr = membershipKey(p.membership_number);
    const emailRaw = p.email?.trim() ?? "";
    const email = normalizeEmail(emailRaw);

    if (onlyNr && nr !== onlyNr) continue;
    if (isHiddenProfileId(p.id) || SKIP_EMAILS.has(email)) {
      console.log(`⊘ skip hidden/peter: Nr.${nr || "?"} ${p.first_name ?? ""} ${p.last_name ?? ""}`);
      bump("hidden");
      continue;
    }
    if (p.last_app_active_at) {
      bump("already-in-app");
      continue;
    }
    // Zusätzlich Auth-Login: auch ohne last_app_active_at nicht erneut durch Setup jagen
    {
      const { data: auth } = await admin.auth.admin.getUserById(p.id);
      if (auth.user?.last_sign_in_at) {
        bump("already-signed-in");
        continue;
      }
    }
    if (!emailRaw || isInvalidPlaceholderEmail(emailRaw)) {
      console.log(`⊘ skip invalid-email: Nr.${nr || "?"} ${p.first_name ?? ""} ${p.last_name ?? ""}`);
      bump("invalid-email");
      continue;
    }
    if (seenInbox.has(email)) {
      console.log(`⊘ skip duplicate-inbox: Nr.${nr || "?"} ${p.first_name ?? ""} ${p.last_name ?? ""}`);
      bump("duplicate-inbox");
      continue;
    }
    seenInbox.add(email);
    recipients.push(p);
    console.log(`→ ${dryRun ? "WOULD SEND" : "QUEUE"}: Nr.${nr} ${p.first_name ?? ""} ${p.last_name ?? ""}`);
  }

  console.log(`\nEmpfänger: ${recipients.length}`);
  console.log("skip_reasons:", JSON.stringify(skipReasons, null, 2));

  if (onlyNr && recipients.length === 0) {
    console.error(`Niemand für Nr.${onlyNr} in der Versandliste (bereits in der App oder ungültige Mail?).`);
    process.exit(1);
  }

  if (dryRun) return;

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i++) {
    const p = recipients[i];
    const nr = membershipKey(p.membership_number);
    const label = `Nr.${nr} ${p.first_name} ${p.last_name}`;
    if (i > 0) {
      await sleep(DELAY_MS);
      if (i % BURST === 0) {
        console.log(`… Pause ${BURST_PAUSE_MS / 1000}s (Anti-Spam)`);
        await sleep(BURST_PAUSE_MS);
      }
    }
    console.log(`SEND ${i + 1}/${recipients.length}: ${label}`);
    try {
      const result = await sendAppAccessRelinkEmail({
        email: p.email!.trim(),
        firstName: p.first_name?.trim() || "Fan",
        gender: p.gender,
        userId: p.id,
        logContext: { membership_number: nr },
      });
      if (!result.ok) {
        failed += 1;
        console.error("  Fehler:", "error" in result ? result.error : result);
        continue;
      }
      sent += 1;
      console.log("  ✓");
    } catch (e) {
      failed += 1;
      console.error("  Fehler:", e instanceof Error ? e.message : e);
    }
  }

  console.log(`\nFertig: sent=${sent} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
