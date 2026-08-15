/**
 * One-off: Passwort-Reset-Mail für Mitgliedsnummer (registriert).
 * EMAIL_OUTBOUND_MODE=live npx --yes tsx --env-file=.env.local scripts/send-password-reset-one.ts --nr=3
 */
import { createClient } from "@supabase/supabase-js";
import { sendPasswordResetEmail } from "../src/lib/email/password-reset";
import { getOutboundEmailMode } from "../src/lib/email/outbound-policy";
import { resolveAppRegistrationStatus } from "../src/lib/membership/app-registration";
import { loadForgotPasswordProfileByEmail } from "../src/lib/membership/load-registration-profile";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);
const nrArg = process.argv.find((a) => a.startsWith("--nr="))?.slice(5)?.trim();
if (!nrArg) {
  console.error("Usage: --nr=…");
  process.exit(1);
}

async function main() {
  const outboundMode = getOutboundEmailMode();
  console.log(`EMAIL_OUTBOUND_MODE=${outboundMode}`);
  if (outboundMode !== "live") {
    console.error("Abbruch: EMAIL_OUTBOUND_MODE=live erforderlich.");
    process.exit(1);
  }

  const { data: row, error } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,membership_number")
    .eq("membership_number", nrArg)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row?.email) {
    console.error("Profil nicht gefunden.");
    process.exit(1);
  }

  const domain = row.email.split("@")[1] ?? "?";
  console.log(
    `Ziel: Nr.${row.membership_number} ${row.first_name} ${row.last_name} @${domain}`,
  );

  const profile = await loadForgotPasswordProfileByEmail(row.email);
  if (!profile?.email) {
    console.error("Profil-Load (Fallback) fehlgeschlagen.");
    process.exit(1);
  }

  const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
  const registration = resolveAppRegistrationStatus({
    status: profile.app_registration_status,
    registeredAt: profile.app_registered_at,
    lastAppActiveAt: profile.last_app_active_at,
    lastSignInAt: authUser.user?.last_sign_in_at ?? null,
  });
  console.log(`registration=${registration}`);

  const result = await sendPasswordResetEmail({
    email: profile.email,
    firstName: profile.first_name?.trim() || "Fan",
    gender: profile.gender,
    userId: profile.id,
    logContext: {
      source: "forgot_password",
      client_ip: "manual_resend",
      registration_status: registration,
      note: "ops_resend",
    },
  });

  if (!result.ok) {
    console.error("Send fehlgeschlagen:", result);
    process.exit(1);
  }
  const path = result.resetUrl ? new URL(result.resetUrl).pathname : "?";
  console.log(`✓ gesendet (link path=${path})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
