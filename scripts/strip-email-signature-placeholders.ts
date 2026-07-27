/**
 * Entfernt Signatur-Platzhalter aus allen E-Mail-Vorlagen (Signatur wird automatisch angehängt).
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/strip-email-signature-placeholders.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

function clean(body: string | null): string | null {
  if (body == null) return body;
  return body
    .replace(/\{\{\s*admin_signature_block\s*\}\}/gi, "")
    .replace(/\{\{\s*admin_signature_text\s*\}\}/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function cleanDescription(desc: string | null): string | null {
  if (!desc) return desc;
  return desc
    .replace(/,?\s*admin_signature_text/gi, "")
    .replace(/,?\s*admin_signature_block/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function main() {
  const { data, error } = await admin
    .from("email_templates")
    .select("key,body_text,body_html,description");
  if (error) throw error;

  let updated = 0;
  for (const row of data ?? []) {
    const body_text = clean(row.body_text);
    const body_html = clean(row.body_html);
    const description = cleanDescription(row.description);
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
    console.log("cleaned", row.key);
  }
  console.log(`Done. ${updated} template(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
