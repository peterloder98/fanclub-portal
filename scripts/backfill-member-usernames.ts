/**
 * Korrigiert Benutzernamen mit fehlerhafter Umlaut-Transliteration (z. B. hans.j.rg.b.cker → hans.joerg.baecker).
 *
 *   npx --yes tsx --env-file=.env.local scripts/backfill-member-usernames.ts
 *   npx --yes tsx --env-file=.env.local scripts/backfill-member-usernames.ts --apply
 */
import { createClient } from "@supabase/supabase-js";
import { slugifyMemberUsername } from "../src/lib/members/username";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const admin = createClient(url, serviceRoleKey);

async function uniqueUsername(first: string, last: string, excludeId: string) {
  const base = slugifyMemberUsername(first, last);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${base}${Date.now().toString(36).slice(-4)}`;
}

async function main() {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id,first_name,last_name,username")
    .not("first_name", "is", null)
    .not("last_name", "is", null);
  if (error) throw new Error(error.message);

  let candidates = 0;
  let updated = 0;

  for (const profile of profiles ?? []) {
    const first = profile.first_name?.trim() ?? "";
    const last = profile.last_name?.trim() ?? "";
    if (!first || !last) continue;

    const expected = slugifyMemberUsername(first, last);
    const current = profile.username?.trim() ?? "";
    if (!current || current === expected) continue;

    candidates++;
    const next = await uniqueUsername(first, last, profile.id);
    console.log(`${first} ${last}: ${current} → ${next}`);

    if (apply) {
      const { error: upErr } = await admin
        .from("profiles")
        .update({ username: next })
        .eq("id", profile.id);
      if (upErr) {
        console.error(`  FAILED ${profile.id}: ${upErr.message}`);
      } else {
        updated++;
      }
    }
  }

  console.log(
    apply
      ? `Done. ${updated} of ${candidates} username(s) updated.`
      : `Dry run: ${candidates} username(s) would change. Re-run with --apply to write.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
