/**
 * Antrag-Bestätigung upserten + Test an Peter (inkl. Überweisungsblock).
 *
 * npx --yes tsx --env-file=.env.local scripts/send-application-received-test-peter.ts
 * SKIP_SEND=1 … nur DB-Upsert
 */
import { createClient } from "@supabase/supabase-js";
import { renderEmailFromTemplate, MEMBERSHIP_APPLICATION_RECEIVED_FALLBACK } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { clubBankEmailVars } from "@/lib/email/club-bank-vars";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";

const TO = "mail@peter-loder.de";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

async function main() {
  const { error } = await admin.from("email_templates").upsert(
    {
      key: "membership_application_received",
      name: "Antrag eingegangen (an Antragsteller/in)",
      subject: MEMBERSHIP_APPLICATION_RECEIVED_FALLBACK.subject,
      body_text: MEMBERSHIP_APPLICATION_RECEIVED_FALLBACK.body_text,
      body_html: MEMBERSHIP_APPLICATION_RECEIVED_FALLBACK.body_html,
      description:
        "Bestätigung nach Absenden des Mitgliedschaftsantrags inkl. Überweisungsdaten und PDF-Anhang.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  console.log("Vorlage membership_application_received in DB aktualisiert.");

  if (process.env.SKIP_SEND === "1") {
    console.log("SKIP_SEND=1 — kein Testversand.");
    return;
  }

  const year = new Date().getFullYear();
  const person = emailPersonVars({ firstName: "Peter", gender: "m" });
  const bank = clubBankEmailVars({
    bankReference: `MITGLIED-${year}-0001`,
  });

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipApplicationReceived,
    {
      ...person,
      last_name: "Loder",
      applicant_name: "Peter Loder",
      email: TO,
      fee_eur: "15,00 EUR",
      ...bank,
    },
  );

  const result = await sendEmailViaAccount({
    to: TO,
    subject: `[TEST – Antrag eingegangen] ${rendered.subject}`,
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
    console.error(result);
    process.exit(1);
  }

  console.log(`✓ Testmail an ${TO} gesendet (VWZ ${bank.bank_reference}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
