/**
 * Massenversand: App-Zugang-Einladung an alle aktiven Mitglieder.
 *
 * Voraussetzungen:
 *   - EMAIL_OUTBOUND_MODE=live
 *   - SQL 133_email_app_access_go_live.sql ausgeführt
 *   - APP_BASE_URL / NEXT_PUBLIC_APP_URL gesetzt
 *
 * Optional:
 *   EXCLUDE_MEMBERSHIP_NUMBERS=1,2,3   (Default: 1,2,3)
 *   FORCE_RESEND=1                     (bereits gesendete erneut senden)
 *
 * Trockenlauf (keine Mails):
 *   DRY_RUN=1 EMAIL_OUTBOUND_MODE=live npx --yes tsx --env-file=.env.local scripts/send-app-access-all-members.ts
 *
 * Echter Versand:
 *   EMAIL_OUTBOUND_MODE=live npx --yes tsx --env-file=.env.local scripts/send-app-access-all-members.ts
 */
import { createClient } from "@supabase/supabase-js";
import { sendAppAccessSetupEmail } from "../src/lib/email/app-access-setup";
import { getOutboundEmailMode } from "../src/lib/email/outbound-policy";
import {
  isHiddenProfileId,
  SYSTEM_HIDDEN_PROFILE_IDS,
} from "../src/lib/members/hidden";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const forceResend = process.env.FORCE_RESEND === "1" || process.env.FORCE_RESEND === "true";

const DEFAULT_EXCLUDE_NUMBERS = new Set(["1", "2", "3"]);
const SKIP_EMAILS = new Set(["mail@peter-loder.de"]);

function parseExcludeNumbers(): Set<string> {
  const raw = process.env.EXCLUDE_MEMBERSHIP_NUMBERS;
  if (raw == null || !raw.trim()) return DEFAULT_EXCLUDE_NUMBERS;
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().replace(/^0+/, "") || "0")
      .filter(Boolean),
  );
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
  return String(n ?? "")
    .trim()
    .replace(/^0+/, "") || "";
}

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

async function loadAlreadySentEmails(): Promise<Set<string>> {
  const sent = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await admin
      .from("email_send_log")
      .select("to_address,status")
      .eq("template_key", "app_access_setup")
      .eq("status", "sent")
      .range(from, from + pageSize - 1);
    if (error) {
      if (/email_send_log|does not exist/i.test(error.message)) {
        console.warn("email_send_log fehlt — keine Duplicate-Prüfung möglich.");
        return sent;
      }
      throw new Error(error.message);
    }
    const rows = data ?? [];
    for (const row of rows) {
      const addr = normalizeEmail(String(row.to_address ?? ""));
      if (addr) sent.add(addr);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return sent;
}

async function main() {
  const outboundMode = getOutboundEmailMode();
  const excludeNumbers = parseExcludeNumbers();

  console.log(dryRun ? "=== DRY RUN (keine Mails) ===" : "=== Massenversand App-Zugang ===");
  console.log(`EMAIL_OUTBOUND_MODE=${outboundMode}${outboundMode !== "live" ? " ⚠ (nicht live — Mitglieder werden ggf. übersprungen)" : " ✓"}`);
  console.log(`EXCLUDE_MEMBERSHIP_NUMBERS=${[...excludeNumbers].sort((a, b) => Number(a) - Number(b)).join(",")}`);
  console.log(`FORCE_RESEND=${forceResend ? "1" : "0"}`);
  console.log(`SYSTEM_HIDDEN ids: ${[...SYSTEM_HIDDEN_PROFILE_IDS].join(", ") || "—"}`);

  if (!dryRun && outboundMode !== "live") {
    console.error("Abbruch: Echter Versand erfordert EMAIL_OUTBOUND_MODE=live (z. B. per Env-Override).");
    process.exit(1);
  }

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

  // profiles.in has practical limits — chunk if needed
  const profiles: Array<{
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    gender: string | null;
    membership_number: string | null;
  }> = [];
  const chunkSize = 200;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const { data, error: pErr } = await admin
      .from("profiles")
      .select("id,email,first_name,last_name,gender,membership_number")
      .in("id", chunk);
    if (pErr) throw new Error(pErr.message);
    profiles.push(...(data ?? []));
  }

  const alreadySent = forceResend ? new Set<string>() : await loadAlreadySentEmails();
  console.log(`Bereits gesendet (app_access_setup/sent): ${alreadySent.size}`);
  console.log(`Aktive Mitglieder (Profile geladen): ${profiles.length}`);

  let wouldSend = 0;
  let sent = 0;
  let failed = 0;
  const skipReasons: Record<string, number> = {};

  function bumpSkip(reason: string) {
    skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
  }

  for (const p of profiles) {
    const emailRaw = p.email?.trim() ?? "";
    const email = normalizeEmail(emailRaw);
    const firstName = p.first_name?.trim() || "Fan";
    const lastName = p.last_name?.trim() || "";
    const nr = membershipKey(p.membership_number);
    const label = `Nr.${nr || "?"} ${firstName} ${lastName} <${emailRaw || "—"}>`;

    if (!emailRaw || isInvalidPlaceholderEmail(emailRaw)) {
      console.log(`⊘ skip invalid-email: ${label}`);
      bumpSkip("invalid-email");
      continue;
    }

    if (excludeNumbers.has(nr)) {
      console.log(`⊘ skip exclude-nr (1–3/Admin): ${label}`);
      bumpSkip(`exclude-membership-${nr}`);
      continue;
    }

    if (isHiddenProfileId(p.id)) {
      console.log(`⊘ skip hidden/system: ${label}`);
      bumpSkip("hidden-system");
      continue;
    }

    if (SKIP_EMAILS.has(email)) {
      console.log(`⊘ skip peter/tester: ${label}`);
      bumpSkip("skip-email-list");
      continue;
    }

    if (alreadySent.has(email)) {
      console.log(`⊘ skip already-sent: ${label}`);
      bumpSkip("already-sent");
      continue;
    }

    if (dryRun) {
      wouldSend += 1;
      console.log(`→ WOULD SEND: ${label}`);
      continue;
    }

    console.log(`→ SEND: ${label}`);
    try {
      const result = await sendAppAccessSetupEmail({
        email: emailRaw.trim(),
        firstName,
        gender: p.gender,
        userId: p.id,
      });
      if (!result.ok) {
        failed += 1;
        const detail =
          "skipped" in result && result.skipped
            ? `übersprungen (${"reason" in result ? result.reason : "?"})`
            : "error" in result
              ? result.error
              : "unbekannt";
        console.error("  Fehler:", detail);
        continue;
      }
      sent += 1;
      alreadySent.add(email);
      console.log("  ✓ gesendet");
    } catch (e) {
      failed += 1;
      console.error("  Fehler:", e instanceof Error ? e.message : e);
    }
  }

  const skippedTotal = Object.values(skipReasons).reduce((a, b) => a + b, 0);
  console.log("\n--- Zusammenfassung ---");
  console.log(`outbound_mode=${outboundMode}`);
  console.log(`would_send=${wouldSend} sent=${sent} failed=${failed} skipped=${skippedTotal}`);
  console.log("skip_reasons:", JSON.stringify(skipReasons, null, 2));
  const excl = ["1", "2", "3"].filter((n) => (skipReasons[`exclude-membership-${n}`] ?? 0) > 0);
  console.log(
    excl.length
      ? `✓ Mitgliedsnummern ausgeschlossen: ${excl.join(", ")}`
      : "⚠ Keine Profile mit Nr. 1/2/3 in der Skip-Liste (evtl. nicht aktiv / nicht geladen)",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
