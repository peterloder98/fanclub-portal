/**
 * Setzt die persönliche Fanclub-Standardsignatur 1:1.
 * Usage: npx --yes tsx --env-file=.env.local scripts/set-club-signature-default.ts
 */
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_CLUB_SIGNATURE_TEXT } from "../src/lib/email/club-signature-defaults";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key);
const CLUB_SIGNATURE_TEXT_KEY = "club_signature_text";

async function main() {
  const text = DEFAULT_CLUB_SIGNATURE_TEXT;
  console.log("Setze Club-Signatur:\n---\n" + text + "\n---");

  const { error } = await admin.from("app_settings").upsert({
    key: CLUB_SIGNATURE_TEXT_KEY,
    value: text,
  });
  if (error) throw new Error(error.message);

  const { error: defErr } = await admin.from("app_settings").upsert({
    key: "default_mail_signature_id",
    value: "club-default",
  });
  if (defErr) throw new Error(defErr.message);

  console.log("✓ Standardsignatur gespeichert (Admin → Signaturen).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
