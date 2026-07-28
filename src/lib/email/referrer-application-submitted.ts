import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadDefaultMailSignature } from "@/lib/email/default-mail-signature";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { buildEmailSalutation } from "@/lib/email/salutation-block";
import { normalizeGender, pronounDative } from "@/lib/person/gender";

import { MEMBERSHIP_REFERRAL_COMPLETION_POINTS } from "@/lib/points/award-membership-referral-completed";

export const REFERRER_APPLICATION_SUBMITTED_SUBJECT =
  "Dein Geworbener hat den Mitgliedsantrag eingereicht";

export function composeReferrerApplicationSubmittedBody(input: {
  referrerSalutation: string;
  applicantFullName: string;
  applicantPronounDative: string;
  signatureText: string;
}) {
  const name = input.applicantFullName.trim() || "die eingeladene Person";

  return `${input.referrerSalutation},

herzlichen Dank, dass du ${name} in den Anni Perka Fanclub eingeladen hast!

Der Antrag wurde von ${input.applicantPronounDative} soeben digital unterzeichnet und bei uns eingereicht.
Sobald der Mitgliedsbeitrag bezahlt ist, werden wir ${name} bei uns herzlich aufnehmen und du erhältst selbstverständlich deine ${MEMBERSHIP_REFERRAL_COMPLETION_POINTS} Anni-Stars als Dankeschön fürs Werben.

${input.signatureText.trim()}`.trim();
}

export async function notifyReferrerApplicationSubmitted(input: {
  referrerUserId: string;
  applicantFirstName: string;
  applicantLastName: string;
  applicantGender?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { data: referrer } = await admin
    .from("profiles")
    .select("email,first_name,last_name,gender")
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
    referrer?.first_name?.trim() || referrer?.last_name?.trim() || "Fan";
  const referrerSalutation = buildEmailSalutation(
    referrerFirstName,
    referrer?.gender,
  );
  const applicantPronounDative = pronounDative(normalizeGender(input.applicantGender));

  const text = composeReferrerApplicationSubmittedBody({
    referrerSalutation,
    applicantFullName,
    applicantPronounDative,
    signatureText: sig.text,
  });
  const html = buildHtmlFromPlain(text, sig.htmlBlock, sig.text);

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
