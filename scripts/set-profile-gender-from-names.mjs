/**
 * Setzt profiles.gender auf m/w, wenn der Vorname eindeutig erkannt wird.
 * Bereits gesetztes m/w bleibt unverändert.
 *
 *   node --experimental-strip-types --env-file=.env.local scripts/set-profile-gender-from-names.mjs
 *   node --experimental-strip-types --env-file=.env.local scripts/set-profile-gender-from-names.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { inferGenderFromFirstName } from "../src/lib/person/infer-gender-from-name.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

function shouldSet(current) {
  const g = (current ?? "").trim().toLowerCase();
  return !g || g === "d" || g === "divers" || g === "x";
}

async function main() {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id,first_name,last_name,gender");
  if (error) throw error;

  let updated = 0;
  let skipped = 0;
  let unknown = 0;

  for (const p of profiles ?? []) {
    if (!shouldSet(p.gender)) {
      skipped += 1;
      continue;
    }
    const inferred = inferGenderFromFirstName(p.first_name);
    if (!inferred) {
      unknown += 1;
      console.log(`?  ${p.first_name} ${p.last_name} — kein sicheres m/w`);
      continue;
    }
    console.log(`${dryRun ? "[dry] " : ""}${p.first_name} ${p.last_name} → ${inferred}`);
    if (!dryRun) {
      const { error: upErr } = await admin
        .from("profiles")
        .update({ gender: inferred })
        .eq("id", p.id);
      if (upErr) throw upErr;
    }
    updated += 1;
  }

  let appUpdated = 0;
  const { data: apps, error: appErr } = await admin
    .from("membership_applications")
    .select("id,first_name,last_name,gender");
  if (appErr) throw appErr;

  for (const a of apps ?? []) {
    if (!shouldSet(a.gender)) continue;
    const inferred = inferGenderFromFirstName(a.first_name);
    if (!inferred) continue;
    console.log(`${dryRun ? "[dry app] " : "[app] "}${a.first_name} ${a.last_name} → ${inferred}`);
    if (!dryRun) {
      const { error: upErr } = await admin
        .from("membership_applications")
        .update({ gender: inferred })
        .eq("id", a.id);
      if (upErr) throw upErr;
    }
    appUpdated += 1;
  }

  console.log(
    `\nFertig: ${updated} Profile gesetzt, ${appUpdated} Bewerbungen, ${skipped} Profile bereits m/w, ${unknown} unklar${dryRun ? " (dry-run)" : ""}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
