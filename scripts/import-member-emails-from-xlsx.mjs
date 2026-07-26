/**
 * E-Mails aus Mitgliederliste Excel den Profilen per Mitgliedsnummer zuordnen.
 *
 *   node --env-file=.env.local scripts/import-member-emails-from-xlsx.mjs
 *   node --env-file=.env.local scripts/import-member-emails-from-xlsx.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const candidates = [
  join(root, "data/mitgliedsliste-emails-2026-07-26.xlsx"),
  "/Users/peterloder/Downloads/Mitgliedsliste Peter Stand 26.07.2026.xlsx",
];

const excelPath = candidates.find((p) => existsSync(p));
if (!excelPath) {
  console.error("Excel nicht gefunden. Erwartet in Downloads oder data/.");
  process.exit(1);
}

const dataCopy = join(root, "data/mitgliedsliste-emails-2026-07-26.xlsx");
if (excelPath !== dataCopy) {
  try {
    copyFileSync(excelPath, dataCopy);
    console.log("Kopie nach data/mitgliedsliste-emails-2026-07-26.xlsx");
  } catch {
    // gitignored / optional
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, key);

function normalizeEmail(raw) {
  const e = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (!e || e === "ohne" || e === "-" || e === "n/a" || !e.includes("@")) return null;
  // einfache Plausibilität
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

function parseExcel() {
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  /** @type {{ membershipNumber: string, name: string, email: string }[]} */
  const out = [];
  for (const r of rows.slice(3)) {
    if (r?.[0] == null) continue;
    const membershipNumber = String(r[0]).trim();
    if (!/^\d+$/.test(membershipNumber)) continue;
    const email = normalizeEmail(r[11]);
    if (!email) continue;
    out.push({
      membershipNumber,
      name: r[1] != null ? String(r[1]).trim() : "",
      email,
    });
  }
  return out;
}

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== LIVE EMAIL IMPORT ===");
  console.log("Excel:", excelPath);
  const rows = parseExcel();
  console.log(`Zeilen mit E-Mail: ${rows.length}`);

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id,membership_number,email,first_name,last_name");
  if (error) throw error;

  const byNumber = new Map(
    (profiles ?? [])
      .filter((p) => p.membership_number)
      .map((p) => [String(p.membership_number).trim(), p]),
  );

  let updated = 0;
  let skippedSame = 0;
  let missing = 0;
  let conflicts = 0;
  let authFails = 0;

  for (const row of rows) {
    const profile = byNumber.get(row.membershipNumber);
    if (!profile) {
      missing += 1;
      console.log(`— Nr. ${row.membershipNumber} ${row.name}: kein Profil`);
      continue;
    }

    const current = (profile.email ?? "").trim().toLowerCase();
    if (current === row.email) {
      skippedSame += 1;
      continue;
    }

    // E-Mail schon bei anderem Profil / Auth?
    const { data: emailClash } = await admin
      .from("profiles")
      .select("id,membership_number")
      .ilike("email", row.email)
      .neq("id", profile.id)
      .maybeSingle();

    if (dryRun) {
      console.log(
        `→ Nr. ${row.membershipNumber} ${profile.first_name} ${profile.last_name}: ${current || "(leer)"} → ${row.email}${emailClash ? " (geteilt, nur Profil)" : ""}`,
      );
      updated += 1;
      continue;
    }

    if (emailClash) {
      // Geteilte Familien-Mail: nur im Profil speichern, Auth bleibt eindeutig.
      const { error: pOnlyErr } = await admin
        .from("profiles")
        .update({ email: row.email })
        .eq("id", profile.id);
      if (pOnlyErr) {
        conflicts += 1;
        console.log(`✗ Profil Nr. ${row.membershipNumber}: ${pOnlyErr.message}`);
        continue;
      }
      conflicts += 1;
      console.log(
        `OK Nr. ${row.membershipNumber} ${profile.first_name} ${profile.last_name} → ${row.email} (geteilt mit Nr. ${emailClash.membership_number}, Auth unverändert)`,
      );
      updated += 1;
      continue;
    }

    const { error: authErr } = await admin.auth.admin.updateUserById(profile.id, {
      email: row.email,
      email_confirm: true,
      user_metadata: {
        email_pending: false,
        imported: true,
      },
    });
    if (authErr) {
      // Auth belegt → trotzdem Profil-E-Mail setzen
      const { error: pOnlyErr } = await admin
        .from("profiles")
        .update({ email: row.email })
        .eq("id", profile.id);
      if (pOnlyErr) {
        authFails += 1;
        console.log(`✗ Nr. ${row.membershipNumber}: ${authErr.message}`);
        continue;
      }
      authFails += 1;
      console.log(
        `OK Nr. ${row.membershipNumber} ${profile.first_name} ${profile.last_name} → ${row.email} (nur Profil; Auth: ${authErr.message})`,
      );
      updated += 1;
      continue;
    }

    const { error: pErr } = await admin
      .from("profiles")
      .update({ email: row.email })
      .eq("id", profile.id);
    if (pErr) {
      console.log(`✗ Profil Nr. ${row.membershipNumber}: ${pErr.message}`);
      continue;
    }

    updated += 1;
    console.log(
      `OK Nr. ${row.membershipNumber} ${profile.first_name} ${profile.last_name} → ${row.email}`,
    );
  }

  console.log(
    `\nFertig: ${updated} aktualisiert, ${skippedSame} unverändert, ${missing} ohne Profil, ${conflicts} Konflikte, ${authFails} Auth-Fehler.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
