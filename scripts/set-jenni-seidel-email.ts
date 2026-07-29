/**
 * Setzt E-Mail für Jenni Seidel.
 * Usage: npx --yes tsx --env-file=.env.local scripts/set-jenni-seidel-email.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const EMAIL = "jennyli08@live.de";

async function main() {
  const { data: matches, error } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email")
    .ilike("last_name", "Seidel")
    .or("first_name.ilike.Jenni%,first_name.ilike.Jenny%");

  if (error) throw error;
  if (!matches?.length) {
    const { data: allSeidel } = await admin
      .from("profiles")
      .select("id,first_name,last_name,email")
      .ilike("last_name", "%Seidel%");
    console.error("Keine Jenni/Jenny Seidel gefunden. Seidel-Treffer:", allSeidel);
    process.exit(1);
  }
  if (matches.length > 1) {
    console.error("Mehrere Treffer:", matches);
    process.exit(1);
  }

  const person = matches[0]!;
  console.log(`Gefunden: ${person.first_name} ${person.last_name} (${person.id})`);
  console.log(`Aktuell: ${person.email ?? "(leer)"} → ${EMAIL}`);

  const normalized = EMAIL.trim().toLowerCase();
  const { data: clash } = await admin
    .from("profiles")
    .select("id,first_name,last_name")
    .ilike("email", normalized)
    .neq("id", person.id)
    .maybeSingle();
  if (clash) {
    throw new Error(`E-Mail bereits bei ${clash.first_name} ${clash.last_name}`);
  }

  const { error: authErr } = await admin.auth.admin.updateUserById(person.id, {
    email: normalized,
    email_confirm: true,
  });
  if (authErr) throw new Error(`Auth: ${authErr.message}`);

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ email: normalized })
    .eq("id", person.id);
  if (profileErr) throw new Error(`Profil: ${profileErr.message}`);

  // Auch Mitgliedschaftsantrag aktualisieren, falls vorhanden
  const { error: appErr } = await admin
    .from("membership_applications")
    .update({ email: normalized })
    .eq("user_id", person.id);
  if (appErr) console.warn("Antrag-Update:", appErr.message);

  console.log("✓ E-Mail gesetzt:", normalized);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
