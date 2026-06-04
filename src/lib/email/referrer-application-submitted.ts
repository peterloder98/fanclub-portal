import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadDefaultMailSignature } from "@/lib/email/default-mail-signature";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";

export const REFERRER_APPLICATION_SUBMITTED_SUBJECT =
  "Du hast erfolgreich ein neues Mitglied geworben";

export function composeReferrerApplicationSubmittedBody(input: {
  referrerFirstName: string;
  applicantFullName: string;
  signatureText: string;
}) {
  const vorname = input.referrerFirstName.trim() || "du";
  const name = input.applicantFullName.trim() || "die eingeladene Person";

  return `Hey ${vorname},

nochmal danke für deine Empfehlung für den Anni Perka Fanclub und dass du ${name} eingeladen hast.

Der Antrag wurde nun digital unterzeichnet und bei uns eingereicht, sobald der Mitgliedsbeitrag bezahlt ist wird ${name} bei uns aufgenommen und du erhältst deine 100 Punkte Werbeprämie.

${input.signatureText.trim()}`.trim();
}

export async function notifyReferrerApplicationSubmitted(input: {
  referrerUserId: string;
  applicantFirstName: string;
  applicantLastName: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: referrer } = await admin
    .from("profiles")
    .select("email,first_name,last_name")
    .eq("id", input.referrerUserId)
    .maybeSingle();

  const to = referrer?.email?.trim();
  if (!to) {
    return { ok: false as const, skipped: true, reason: "no_referrer_email" as const };
  }

  const sig = await loadDefaultMailSignature();
  const applicantFullName =
    `${input.applicantFirstName.trim()} ${input.applicantLastName.trim()}`.trim() ||
    "die eingeladene Person";
  const referrerFirstName =
    referrer?.first_name?.trim() || referrer?.last_name?.trim() || "du";

  const text = composeReferrerApplicationSubmittedBody({
    referrerFirstName,
    applicantFullName,
    signatureText: sig.text,
  });
  const html = buildHtmlFromPlain(text, sig.htmlBlock);

  const attachments = sig.imageBuffer
    ? [
        {
          filename: "signatur.png",
          content: Buffer.from(sig.imageBuffer),
          contentType: sig.contentType,
          cid: sig.imageCid!,
        },
      ]
    : undefined;

  return sendEmailViaAccount({
    to,
    subject: REFERRER_APPLICATION_SUBMITTED_SUBJECT,
    text,
    html,
    attachments,
  });
}
