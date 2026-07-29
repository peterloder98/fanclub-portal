/**
 * Testversand: App-Zugang-Mail (wie an alle Mitglieder) an Peter + Vorstände.
 *
 * npx --yes tsx --env-file=.env.local scripts/send-app-access-preview.ts
 */
import { createClient } from "@supabase/supabase-js";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";

const EXTRA_TO = "mail@peter-loder.de";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

const BASE = (
  process.env.APP_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://fanclub.anniperka.de"
).replace(/\/$/, "");

type Recipient = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
};

async function sendOne(r: Recipient, setupUrl: string) {
  const person = emailPersonVars({
    firstName: r.first_name ?? "Fan",
    gender: r.gender === "m" || r.gender === "w" ? r.gender : null,
  });

  const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.appAccessSetup, {
    ...person,
    setup_url: setupUrl,
  });

  const result = await sendEmailViaAccount({
    to: r.email,
    subject: `[TEST – bitte prüfen] ${rendered.subject}`,
    text: rendered.text,
    html: rendered.html,
    attachments: rendered.signatureAttachment
      ? [
          {
            filename: rendered.signatureAttachment.filename,
            content: Buffer.from(rendered.signatureAttachment.content),
            contentType: rendered.signatureAttachment.contentType,
            cid: rendered.signatureAttachment.cid,
          },
        ]
      : undefined,
  });

  if (!result.ok) {
    throw new Error(
      result.skipped
        ? `übersprungen (${"reason" in result ? result.reason : "?"})`
        : ("error" in result ? result.error : "SMTP-Fehler"),
    );
  }
}

async function main() {
  console.log("Vorlage: app_access_setup (wie Massen-Einladung zur App-Anmeldung)");
  console.log("APP_BASE_URL:", BASE);

  const { data: admins, error } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,gender")
    .eq("role", "admin")
    .not("email", "is", null);

  if (error) throw new Error(error.message);

  const recipients: Recipient[] = [];
  const seen = new Set<string>();

  for (const a of admins ?? []) {
    const email = a.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email,
      first_name: a.first_name,
      last_name: a.last_name,
      gender: a.gender,
    });
  }

  if (!seen.has(EXTRA_TO.toLowerCase())) {
    recipients.push({
      email: EXTRA_TO,
      first_name: "Peter",
      last_name: "Loder",
      gender: "m",
    });
  }

  // Demo-Link (kein echter Recovery) — Text/Layout der Vorlage prüfen
  const demoSetupUrl = `${BASE}/setup-account?token_hash=TEST_PREVIEW_NICHT_GUELTIG&type=recovery`;

  console.log(`Empfänger (${recipients.length}):`);
  for (const r of recipients) {
    console.log(`  → ${r.first_name ?? "?"} ${r.last_name ?? ""} <${r.email}>`);
    await sendOne(r, demoSetupUrl);
    console.log(`    ✓ gesendet`);
  }

  console.log("\nFertig. Betreff beginnt mit „[TEST – bitte prüfen]“.");
  console.log("Setup-Link ist ein Platzhalter (nicht klickbar gültig) — nur Layout/Text prüfen.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
