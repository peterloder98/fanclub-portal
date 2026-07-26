/**
 * Sendet die App-Zugang-Setup-Mails an die drei Vorstände.
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/send-board-setup-emails.ts
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

const BOARD = [
  { first_name: "Nicole", last_name: "Ness", birthdate: "1986-08-22" },
  { first_name: "Andreas", last_name: "Seidel", birthdate: "1986-11-15" },
  { first_name: "Janine", last_name: "Kieczka", birthdate: "1980-04-24" },
] as const;

async function findAuthUserIdByEmail(email: string) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser(profile: {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}) {
  const existing = await findAuthUserIdByEmail(profile.email);
  if (existing) {
    if (existing !== profile.id) {
      console.warn(
        `  ⚠ Auth-User-ID (${existing}) ≠ Profil-ID (${profile.id}) für ${profile.email}`,
      );
    }
    return existing;
  }

  console.log(`  → Auth-User wird angelegt für ${profile.email}`);
  const tempPassword = crypto.randomUUID() + "Aa1!";
  const { data: created, error } = await admin.auth.admin.createUser({
    email: profile.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: profile.first_name,
      last_name: profile.last_name,
    },
  });
  if (error) throw new Error(error.message);
  if (!created.user) throw new Error("Auth-User ohne ID");

  if (created.user.id !== profile.id) {
    // Profile row is keyed by auth user id — if IDs diverge, warn loudly.
    console.warn(
      `  ⚠ Neuer Auth-User ${created.user.id} weicht von Profil ${profile.id} ab — bitte manuell prüfen.`,
    );
  }
  return created.user.id;
}

async function main() {
  const base =
    process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  console.log("APP_BASE_URL:", base || "(fehlt!)");
  if (!base) {
    console.error("APP_BASE_URL muss gesetzt sein (Produktions-URL).");
    process.exit(1);
  }

  for (const member of BOARD) {
    console.log(`\n=== ${member.first_name} ${member.last_name} ===`);
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id,email,first_name,last_name,birthdate,role,gender")
      .ilike("first_name", member.first_name)
      .ilike("last_name", member.last_name)
      .maybeSingle();

    if (error) {
      console.error("  Profil-Fehler:", error.message);
      continue;
    }
    if (!profile?.email) {
      console.error("  Nicht gefunden oder ohne E-Mail.");
      continue;
    }

    const storedBirth = String(profile.birthdate ?? "").slice(0, 10);
    if (storedBirth !== member.birthdate) {
      console.warn(
        `  ⚠ Geburtsdatum DB=${storedBirth || "—"} erwartet=${member.birthdate} — update…`,
      );
      await admin
        .from("profiles")
        .update({ birthdate: member.birthdate })
        .eq("id", profile.id);
    }

    console.log(`  E-Mail: ${profile.email}`);
    console.log(`  Rolle: ${profile.role ?? "member"}`);
    console.log(`  Geschlecht: ${profile.gender ?? "—"}`);

    try {
      await ensureAuthUser({
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name ?? member.first_name,
        last_name: profile.last_name ?? member.last_name,
      });

      const result = await sendAppAccessSetupEmail({
        email: profile.email,
        firstName: profile.first_name ?? member.first_name,
        gender: profile.gender,
        userId: profile.id,
      });

      if (result.ok) {
        console.log("  ✓ E-Mail gesendet");
      } else if ("skipped" in result && result.skipped) {
        console.error("  ✗ SMTP nicht konfiguriert:", result.reason);
      } else if ("error" in result) {
        console.error("  ✗ Versand fehlgeschlagen:", result.error);
      } else {
        console.error("  ✗ Unbekanntes Ergebnis", result);
      }
    } catch (e) {
      console.error("  ✗", e instanceof Error ? e.message : e);
    }
  }

  console.log("\nFertig.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
