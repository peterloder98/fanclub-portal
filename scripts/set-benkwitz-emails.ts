/**
 * Setzt Auth- + Profil-E-Mail für Michaela (14) und Rosi (21) Benkwitz.
 * npx --yes tsx --env-file=.env.local scripts/set-benkwitz-emails.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key);

const updates = [
  { membership_number: "14", email: "ela___16@hotmail.de", expectLast: "Benkwitz" },
  { membership_number: "21", email: "rosi___1959@hotmail.de", expectLast: "Benkwitz" },
];

async function main() {
  for (const u of updates) {
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id,first_name,last_name,email,membership_number")
      .eq("membership_number", u.membership_number)
      .maybeSingle();
    if (error) throw error;
    if (!profile) throw new Error(`Mitglied Nr.${u.membership_number} nicht gefunden`);
    if (!profile.last_name?.includes(u.expectLast)) {
      throw new Error(
        `Unerwarteter Name bei Nr.${u.membership_number}: ${profile.first_name} ${profile.last_name}`,
      );
    }

    const { data: clash } = await admin
      .from("profiles")
      .select("id,membership_number,first_name,last_name")
      .ilike("email", u.email)
      .neq("id", profile.id)
      .maybeSingle();
    if (clash) {
      throw new Error(
        `E-Mail ${u.email} schon bei Nr.${clash.membership_number} ${clash.first_name}`,
      );
    }

    const { error: authErr } = await admin.auth.admin.updateUserById(profile.id, {
      email: u.email,
      email_confirm: true,
    });
    if (authErr) throw new Error(`Auth Nr.${u.membership_number}: ${authErr.message}`);

    const { error: pErr } = await admin
      .from("profiles")
      .update({ email: u.email })
      .eq("id", profile.id);
    if (pErr) throw new Error(`Profil Nr.${u.membership_number}: ${pErr.message}`);

    const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
    console.log(
      `✓ Nr.${u.membership_number} ${profile.first_name} ${profile.last_name} → ${u.email} (Auth: ${authUser.user?.email})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
