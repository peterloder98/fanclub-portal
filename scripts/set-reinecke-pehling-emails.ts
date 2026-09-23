/**
 * Setzt Auth- + Profil-E-Mail für Marita Reinecke und Rainer Pehling.
 * npx --yes tsx --env-file=.env.local scripts/set-reinecke-pehling-emails.ts
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
  {
    first_name: "Marita",
    last_name: "Reinecke",
    email: "marita.reinecke56@gmail.com",
  },
  {
    first_name: "Rainer",
    last_name: "Pehling",
    email: "pehling79@gmail.com",
  },
];

async function main() {
  for (const u of updates) {
    const { data: matches, error } = await admin
      .from("profiles")
      .select("id,first_name,last_name,email,membership_number")
      .ilike("first_name", u.first_name)
      .ilike("last_name", u.last_name);

    if (error) throw error;
    if (!matches?.length) {
      throw new Error(`${u.first_name} ${u.last_name} nicht gefunden`);
    }
    if (matches.length > 1) {
      throw new Error(`Mehrere Treffer für ${u.first_name} ${u.last_name}`);
    }

    const profile = matches[0];
    const email = u.email.toLowerCase();

    const { data: clash } = await admin
      .from("profiles")
      .select("id,membership_number,first_name,last_name")
      .ilike("email", email)
      .neq("id", profile.id)
      .maybeSingle();
    if (clash) {
      throw new Error(
        `E-Mail ${email} schon bei Nr.${clash.membership_number} ${clash.first_name} ${clash.last_name}`,
      );
    }

    const { error: authErr } = await admin.auth.admin.updateUserById(profile.id, {
      email,
      email_confirm: true,
    });
    if (authErr) throw new Error(`Auth ${u.first_name}: ${authErr.message}`);

    const { error: pErr } = await admin
      .from("profiles")
      .update({ email })
      .eq("id", profile.id);
    if (pErr) throw new Error(`Profil ${u.first_name}: ${pErr.message}`);

    const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
    console.log(
      `✓ Nr.${profile.membership_number ?? "—"} ${profile.first_name} ${profile.last_name}: ${profile.email ?? "(keine)"} → ${email} (Auth: ${authUser.user?.email})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
