/**
 * Sendet App-Zugang-Setup-Mail nur an Janine (Vorstand).
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/send-janine-setup-email.ts
 */
import { createClient } from "@supabase/supabase-js";
import { sendAppAccessSetupEmail } from "../src/lib/email/app-access-setup";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

async function main() {
  const base = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  console.log("APP_BASE_URL:", base || "(fehlt!)");
  if (!base) {
    console.error("APP_BASE_URL muss gesetzt sein (Produktions-URL).");
    process.exit(1);
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,gender,role")
    .ilike("first_name", "Janine")
    .ilike("last_name", "Kieczka")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile?.email) throw new Error("Janine nicht gefunden oder ohne E-Mail.");

  console.log(`Sende an ${profile.first_name} ${profile.last_name} <${profile.email}> (${profile.role})`);

  const result = await sendAppAccessSetupEmail({
    email: profile.email,
    firstName: profile.first_name ?? "Janine",
    gender: profile.gender,
    userId: profile.id,
  });

  if (result.ok) {
    console.log("✓ E-Mail gesendet");
  } else if ("skipped" in result && result.skipped) {
    console.error("✗ SMTP nicht konfiguriert:", result.reason);
    process.exit(1);
  } else if ("error" in result) {
    console.error("✗ Versand fehlgeschlagen:", result.error);
    process.exit(1);
  } else {
    console.error("✗ Unbekanntes Ergebnis", result);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
