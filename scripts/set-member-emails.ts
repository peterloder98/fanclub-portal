/**
 * Setzt fehlende E-Mails für Sabine Göttl und Daniela („Dany“) Benkwitz.
 * Usage: npx --yes tsx --env-file=.env.local scripts/set-member-emails.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key);

const TARGETS = [
  {
    id: "ba840ad0-1922-40ec-812e-bf25f6bdf250",
    label: "Sabine Göttl",
    email: "cgoettl@freenet.de",
  },
  {
    id: "25372aad-6d19-4984-9395-016c3d7a89d1",
    label: "Daniela (Dany) Benkwitz",
    email: "a1_forever_and_always@hotmail.co.uk",
  },
] as const;

async function setEmail(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();

  const { data: clash } = await admin
    .from("profiles")
    .select("id,first_name,last_name")
    .ilike("email", normalized)
    .neq("id", userId)
    .maybeSingle();
  if (clash) {
    throw new Error(
      `E-Mail bereits bei ${clash.first_name} ${clash.last_name} (${clash.id})`,
    );
  }

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    email: normalized,
    email_confirm: true,
  });
  if (authErr) throw new Error(`Auth: ${authErr.message}`);

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ email: normalized })
    .eq("id", userId);
  if (profileErr) throw new Error(`Profil: ${profileErr.message}`);
}

async function main() {
  for (const t of TARGETS) {
    console.log(`\n=== ${t.label} ===`);
    const { data: p } = await admin
      .from("profiles")
      .select("id,first_name,last_name,email")
      .eq("id", t.id)
      .maybeSingle();
    if (!p) {
      console.error("Nicht gefunden");
      continue;
    }
    console.log(`Aktuell: ${p.email ?? "(leer)"} → ${t.email}`);
    try {
      await setEmail(t.id, t.email);
      console.log("✓ gesetzt");
    } catch (e) {
      console.error("✗", e instanceof Error ? e.message : e);
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
