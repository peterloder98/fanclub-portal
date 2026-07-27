/**
 * Migriert E-Mail-Vorlagen auf den Anrede-Baustein {{salutation}}.
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/migrate-email-salutation-block.ts
 */
import { createClient } from "@supabase/supabase-js";
import { normalizeLegacySalutationPlaceholders } from "../src/lib/email/salutation-block";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

const PERSON_FACING_KEYS = new Set([
  "membership_application_received",
  "membership_payment_reminder",
  "giveaway_winner_congrats",
  "membership_approved_welcome",
  "club_meeting_reminder",
  "app_access_setup",
]);

function migrateBody(body: string | null) {
  if (!body) return body;
  return normalizeLegacySalutationPlaceholders(body);
}

function cleanDescription(desc: string | null, key: string) {
  const stripped = (desc ?? "")
    .replace(
      /\s*Anrede:\s*Baustein \{\{salutation\}\},?\s*\(Lieber\/Liebe\/Liebe\/r nach Geschlecht\)\.?/gi,
      "",
    )
    .trim();
  if (!PERSON_FACING_KEYS.has(key)) return stripped || null;
  if (stripped.includes("{{salutation}}")) return stripped;
  return `${stripped} Anrede: Baustein {{salutation}}, (Lieber/Liebe/Liebe/r nach Geschlecht).`.trim();
}

async function main() {
  const { data, error } = await admin
    .from("email_templates")
    .select("key,body_text,body_html,description");
  if (error) throw error;

  let updated = 0;
  for (const row of data ?? []) {
    const body_text = migrateBody(row.body_text);
    const body_html = migrateBody(row.body_html);
    const description = cleanDescription(row.description, row.key);

    if (
      body_text === row.body_text &&
      body_html === row.body_html &&
      description === row.description
    ) {
      continue;
    }

    const { error: upErr } = await admin
      .from("email_templates")
      .update({ body_text, body_html, description })
      .eq("key", row.key);
    if (upErr) throw upErr;
    updated += 1;
    console.log("updated", row.key);
  }

  console.log(`Done. ${updated} template(s) updated.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
