/**
 * Korrigiert Beitrittsdaten aus Excel (Eintrittsdatum) und legt
 * Mitgliedsbeiträge 2026 (15 €) mit dem Excel-Zahlungseingangsdatum an.
 *
 *   node --env-file=.env.local scripts/sync-member-dates-and-payments.mjs
 *   node --env-file=.env.local scripts/sync-member-dates-and-payments.mjs --dry-run
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const excelPath = join(root, "data/mitgliedsliste-2026-07-26.xlsx");
const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

function excelDate(n) {
  if (n == null || n === "") return null;
  if (typeof n === "string") {
    const s = n.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  }
  const d = XLSX.SSF.parse_date_code(n);
  if (!d) return null;
  return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
}

function addYear(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function parseMembers() {
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const members = [];
  for (let i = 3; i < raw.length; i++) {
    const r = raw[i];
    if (!r?.[1]) continue;
    const name = String(r[1]).trim();
    if (/name,\s*vorname/i.test(name)) continue;
    const nr = String(r[0]).trim();
    if (!nr) continue;
    const start = excelDate(r[5]);
    const payment = excelDate(r[6]);
    members.push({
      membership_number: nr,
      start_date: start,
      payment_date: payment,
      name,
    });
  }
  return members;
}

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== SYNC JOIN + PAYMENTS ===");
  const excelMembers = parseMembers();
  console.log(`Excel: ${excelMembers.length} Zeilen`);

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id,membership_number,first_name,last_name,contribution_date");
  if (pErr) throw pErr;

  const byNr = new Map(
    (profiles ?? [])
      .filter((p) => p.membership_number)
      .map((p) => [String(p.membership_number).trim(), p]),
  );

  let updatedJoin = 0;
  let paymentsCreated = 0;
  let paymentsSkipped = 0;
  let missing = 0;

  for (const row of excelMembers) {
    const profile = byNr.get(row.membership_number);
    if (!profile) {
      console.warn(`fehlt in DB: #${row.membership_number} ${row.name}`);
      missing += 1;
      continue;
    }

    if (row.start_date) {
      const end = addYear(row.start_date);
      console.log(
        `#${row.membership_number} Beitritt → ${row.start_date} (Ende ${end})`,
      );
      if (!dryRun) {
        const { error } = await admin
          .from("memberships")
          .update({ start_date: row.start_date, end_date: end })
          .eq("user_id", profile.id);
        if (error) console.warn(`  membership: ${error.message}`);
        else updatedJoin += 1;
      } else updatedJoin += 1;
    }

    if (!row.payment_date) {
      console.warn(`#${row.membership_number} kein Zahlungseingang in Excel`);
      continue;
    }

    const { data: existingRows } = await admin
      .from("club_ledger_entries")
      .select("id,entry_date,amount_cents,description")
      .eq("member_id", profile.id)
      .eq("entry_type", "income")
      .eq("category", "membership")
      .order("entry_date", { ascending: false })
      .limit(5);

    const existing =
      (existingRows ?? []).find((e) => /mitgliedsbeitrag\s*2026/i.test(e.description ?? "")) ??
      (existingRows ?? [])[0] ??
      null;

    if (existing) {
      const needsUpdate =
        existing.entry_date !== row.payment_date || existing.amount_cents !== 1500;
      if (needsUpdate) {
        console.log(
          `#${row.membership_number} Zahlung aktualisieren → ${row.payment_date} / 15 €`,
        );
        if (!dryRun) {
          const { error } = await admin
            .from("club_ledger_entries")
            .update({
              entry_date: row.payment_date,
              amount_cents: 1500,
              bookkeeping_status: "paid",
            })
            .eq("id", existing.id);
          if (error) console.warn(`  ledger update: ${error.message}`);
          else {
            await admin
              .from("profiles")
              .update({ contribution_date: row.payment_date })
              .eq("id", profile.id);
            paymentsCreated += 1;
          }
        } else paymentsCreated += 1;
      } else {
        paymentsSkipped += 1;
        if (!dryRun) {
          await admin
            .from("profiles")
            .update({ contribution_date: row.payment_date })
            .eq("id", profile.id);
        }
      }
      continue;
    }

    console.log(`#${row.membership_number} Zahlung anlegen → ${row.payment_date} / 15 €`);
    if (!dryRun) {
      const { error } = await admin.from("club_ledger_entries").insert({
        entry_type: "income",
        amount_cents: 1500,
        description: "Mitgliedsbeitrag 2026",
        category: "membership",
        member_id: profile.id,
        entry_date: row.payment_date,
        bookkeeping_status: "paid",
      });
      if (error) console.warn(`  ledger insert: ${error.message}`);
      else {
        await admin
          .from("profiles")
          .update({ contribution_date: row.payment_date })
          .eq("id", profile.id);
        paymentsCreated += 1;
      }
    } else paymentsCreated += 1;
  }

  console.log(
    `fertig. Beitritte: ${updatedJoin}, Zahlungen neu/akt.: ${paymentsCreated}, unverändert: ${paymentsSkipped}, fehlend: ${missing}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
