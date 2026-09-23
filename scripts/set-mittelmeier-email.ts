/**
 * Setzt Auth- + Profil-E-Mail für Markus (Markus-David Ressel, Nr. 42),
 * der bisher die Mittelmeier-E-Mail mit Holger (Nr. 38) geteilt hat.
 * Holger behält h.m.mittelmeier@gmail.com.
 * npx --yes tsx --env-file=.env.local scripts/set-mittelmeier-email.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key);

const NEW_EMAIL = "electra8871@gmail.com".toLowerCase();
/** Shared / original Mittelmeier mailbox */
const SHARED_EMAIL = "h.m.mittelmeier@gmail.com";

async function main() {
  const { data: shared, error } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email,membership_number")
    .ilike("email", SHARED_EMAIL);

  if (error) throw error;
  if (!shared?.length) {
    throw new Error(`Keine Profile mit ${SHARED_EMAIL}`);
  }

  console.log("--- Profile mit geteilter Mittelmeier-E-Mail ---");
  for (const p of shared) {
    console.log(
      `  Nr.${p.membership_number ?? "—"} ${p.first_name} ${p.last_name} | ${p.email}`,
    );
  }

  const markusMatches = shared.filter((p) =>
    p.first_name?.toLowerCase().startsWith("markus"),
  );
  if (!markusMatches.length) {
    throw new Error("Markus unter den Mittelmeier-E-Mail-Profilen nicht gefunden — Abbruch");
  }
  if (markusMatches.length > 1) {
    throw new Error(`Mehrere Markus-Treffer (${markusMatches.length}) — Abbruch`);
  }

  const profile = markusMatches[0];
  // Safety: expect Ressel / membership 42 as discovered
  if (profile.membership_number !== "42") {
    throw new Error(
      `Unerwartete Mitgliedsnr. für Markus: ${profile.membership_number} (erwartet 42) — Abbruch`,
    );
  }
  if (!profile.last_name?.toLowerCase().includes("ressel")) {
    throw new Error(
      `Unerwarteter Nachname: ${profile.last_name} (erwartet Ressel) — Abbruch`,
    );
  }

  const others = shared.filter((p) => p.id !== profile.id);

  const { data: clash } = await admin
    .from("profiles")
    .select("id,membership_number,first_name,last_name")
    .ilike("email", NEW_EMAIL)
    .neq("id", profile.id)
    .maybeSingle();
  if (clash) {
    throw new Error(
      `E-Mail ${NEW_EMAIL} schon bei Nr.${clash.membership_number} ${clash.first_name} ${clash.last_name}`,
    );
  }

  const oldEmail = profile.email ?? "(keine)";

  const { error: authErr } = await admin.auth.admin.updateUserById(profile.id, {
    email: NEW_EMAIL,
    email_confirm: true,
  });
  if (authErr) throw new Error(`Auth Markus: ${authErr.message}`);

  const { error: pErr } = await admin
    .from("profiles")
    .update({ email: NEW_EMAIL })
    .eq("id", profile.id);
  if (pErr) throw new Error(`Profil Markus: ${pErr.message}`);

  const { data: authUser } = await admin.auth.admin.getUserById(profile.id);

  console.log("\n--- Update ---");
  console.log(
    `✓ Nr.${profile.membership_number} ${profile.first_name} ${profile.last_name}: ${oldEmail} → ${NEW_EMAIL} (Auth: ${authUser.user?.email})`,
  );
  console.log("  (keine Login-E-Mail-Benachrichtigung gesendet)");

  console.log("\n--- Andere Person (unverändert) ---");
  for (const o of others) {
    console.log(
      `  Nr.${o.membership_number ?? "—"} ${o.first_name} ${o.last_name} behält: ${o.email ?? "(keine)"}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
