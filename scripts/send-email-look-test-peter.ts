/**
 * Drei Beispiel-Mails im Produktions-Layout an Peter (E-Mail-Look-Check).
 *
 * npx tsx --env-file=.env.local scripts/send-email-look-test-peter.ts
 */
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { clubBankEmailVars } from "@/lib/email/club-bank-vars";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";

const TO = "mail@peter-loder.de";
const BASE = (
  process.env.APP_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://fanclub.anniperka.de"
).replace(/\/$/, "");

async function sendRendered(
  label: string,
  rendered: Awaited<ReturnType<typeof renderEmailFromTemplate>>,
) {
  const result = await sendEmailViaAccount({
    to: TO,
    subject: `[Look-Test] ${label}: ${rendered.subject}`,
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
        ? `Versand übersprungen (${"reason" in result ? result.reason : "unbekannt"})`
        : ("error" in result ? result.error : "SMTP-Fehler"),
    );
  }
  console.log(`✓ ${label}`);
}

async function main() {
  const person = emailPersonVars({ firstName: "Peter", gender: "m" });
  const bank = clubBankEmailVars();

  const paymentReminder = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipPaymentReminder,
    {
      ...person,
      last_name: "Loder",
      applicant_name: "Peter Loder",
      email: TO,
      fee_eur: "15,00 EUR",
      fee_paid_eur: "0,00 €",
      fee_open_eur: "15,00 €",
      membership_period: String(new Date().getFullYear()),
      bank_reference: `Beitrag ${new Date().getFullYear()}, Nr. 042, Loder`,
      ...bank,
    },
  );

  const appAccess = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.appAccessSetup, {
    ...person,
    setup_url: `${BASE}/setup-account?token_hash=LOOK_TEST_NICHT_ECHT&type=recovery`,
  });

  const newYear = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipContributionNewYear,
    {
      ...person,
      last_name: "Loder",
      contribution_year: String(new Date().getFullYear() + 1),
      fee_eur: "15,00 €",
      due_date: `01.01.${new Date().getFullYear() + 1}`,
      payment_deadline: `14.01.${new Date().getFullYear() + 1}`,
      payment_reference: `Beitrag ${new Date().getFullYear() + 1}, Nr. 042, Loder`,
      open_contributions_block: "",
      ...bank,
    },
  );

  await sendRendered("1/3 Zahlungserinnerung", paymentReminder);
  await sendRendered("2/3 App-Zugang", appAccess);
  await sendRendered("3/3 Jahresbeitrag", newYear);

  console.log(`\nFertig — 3 Test-Mails an ${TO}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
