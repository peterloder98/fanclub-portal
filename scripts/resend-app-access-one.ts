/**
 * Erneut App-Zugang-Setup-Mail an ein Mitglied senden (frischer Recovery-Link).
 *
 * Jeder Aufruf erzeugt einen neuen Token und macht ältere Setup-Links ungültig.
 *
 * Usage:
 *   EMAIL_OUTBOUND_MODE=live npx --yes tsx --env-file=.env.local scripts/resend-app-access-one.ts --email=user@example.com
 *   EMAIL_OUTBOUND_MODE=live npx --yes tsx --env-file=.env.local scripts/resend-app-access-one.ts --nr=77
 *   EMAIL_OUTBOUND_MODE=live npx --yes tsx --env-file=.env.local scripts/resend-app-access-one.ts daniel.thielboerger@gmx.de
 *
 * Trockenlauf:
 *   DRY_RUN=1 npx --yes tsx --env-file=.env.local scripts/resend-app-access-one.ts --nr=77
 */
import { createClient } from "@supabase/supabase-js";
import { sendAppAccessSetupEmail } from "../src/lib/email/app-access-setup";
import { getOutboundEmailMode } from "../src/lib/email/outbound-policy";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

function parseArgs(argv: string[]) {
  let email: string | null = null;
  let membershipNumber: string | null = null;

  for (const raw of argv) {
    if (raw.startsWith("--email=")) {
      email = raw.slice("--email=".length).trim();
    } else if (raw.startsWith("--nr=") || raw.startsWith("--membership=")) {
      const v = raw.includes("--nr=")
        ? raw.slice("--nr=".length)
        : raw.slice("--membership=".length);
      membershipNumber = v.trim().replace(/^0+/, "") || "0";
    } else if (!raw.startsWith("-") && raw.includes("@")) {
      email = raw.trim();
    } else if (!raw.startsWith("-") && /^\d+$/.test(raw.trim())) {
      membershipNumber = raw.trim().replace(/^0+/, "") || "0";
    }
  }

  return { email, membershipNumber };
}

async function findProfile(email: string | null, membershipNumber: string | null) {
  if (email) {
    const { data, error } = await admin
      .from("profiles")
      .select("id,email,first_name,last_name,gender,membership_number,role")
      .ilike("email", email.trim())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  if (membershipNumber) {
    const { data: rows, error } = await admin
      .from("profiles")
      .select("id,email,first_name,last_name,gender,membership_number,role")
      .eq("membership_number", membershipNumber);
    if (error) throw new Error(error.message);
    if (!rows?.length) {
      // Leading zeros / string variants
      const { data: all, error: e2 } = await admin
        .from("profiles")
        .select("id,email,first_name,last_name,gender,membership_number,role")
        .not("membership_number", "is", null);
      if (e2) throw new Error(e2.message);
      const match = (all ?? []).find(
        (p) =>
          String(p.membership_number ?? "")
            .trim()
            .replace(/^0+/, "") === membershipNumber,
      );
      return match ?? null;
    }
    if (rows.length > 1) {
      throw new Error(
        `Mehrere Profile mit Mitgliedsnummer ${membershipNumber} — bitte per --email=… spezifizieren.`,
      );
    }
    return rows[0];
  }

  return null;
}

async function main() {
  const { email, membershipNumber } = parseArgs(process.argv.slice(2));
  if (!email && !membershipNumber) {
    console.error(
      "Usage: … scripts/resend-app-access-one.ts --email=… | --nr=… | user@example.com",
    );
    process.exit(1);
  }

  const outboundMode = getOutboundEmailMode();
  const base = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  console.log(dryRun ? "=== DRY RUN ===" : "=== Resend App-Zugang ===");
  console.log(`EMAIL_OUTBOUND_MODE=${outboundMode}`);
  console.log(`APP_BASE_URL=${base || "(fehlt!)"}`);

  if (!base) {
    console.error("APP_BASE_URL / NEXT_PUBLIC_APP_URL muss gesetzt sein.");
    process.exit(1);
  }

  if (!dryRun && outboundMode !== "live") {
    console.error(
      "Abbruch: Echter Versand erfordert EMAIL_OUTBOUND_MODE=live (Env-Override).",
    );
    process.exit(1);
  }

  const profile = await findProfile(email, membershipNumber);
  if (!profile?.email) {
    console.error("Profil nicht gefunden oder ohne E-Mail.");
    process.exit(1);
  }

  const label = `Nr.${profile.membership_number ?? "?"} ${profile.first_name ?? ""} ${profile.last_name ?? ""} <${profile.email}>`;
  console.log(`Ziel: ${label} (${profile.role})`);
  console.log(
    "Hinweis: Neuer generateLink macht ältere Setup-Links für diese Person ungültig.",
  );

  if (dryRun) {
    console.log("→ WOULD SEND (DRY_RUN)");
    return;
  }

  const result = await sendAppAccessSetupEmail({
    email: profile.email,
    firstName: profile.first_name?.trim() || "Fan",
    gender: profile.gender,
    userId: profile.id,
  });

  if (result.ok) {
    console.log("✓ Frische Setup-E-Mail gesendet");
    return;
  }
  if ("skipped" in result && result.skipped) {
    console.error("✗ Übersprungen:", "reason" in result ? result.reason : "?");
    process.exit(1);
  }
  if ("error" in result) {
    console.error("✗ Versand fehlgeschlagen:", result.error);
    process.exit(1);
  }
  console.error("✗ Unbekanntes Ergebnis", result);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
