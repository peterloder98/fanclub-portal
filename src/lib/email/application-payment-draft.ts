import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  loadPaymentMailProfile,
  resolvePaymentEmail,
} from "@/lib/members/no-app-access";
import { loadSignaturePickerData } from "@/lib/email/draft-with-signatures";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { clubBankEmailVars } from "@/lib/email/club-bank-vars";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { formatApplicationPaymentReference } from "@/lib/payments/club-bank";
import type { MailSignatureOption } from "@/lib/email/signatures";

export type ApplicationPaymentMailDraft = {
  subject: string;
  body: string;
  to: string;
  signatures: MailSignatureOption[];
  defaultSignatureId: string;
  signatureTexts: Record<string, string>;
  bankReference: string;
  feeEur: string;
};

/**
 * Vorlage „Antrag eingegangen + bitte zahlen“ (Papier-/Manuell-Antrag).
 * Kein App-Zugangslink; VWZ wie Online-Antrag.
 */
export async function buildMemberApplicationPaymentDraft(
  userId: string,
  signatureId?: string,
): Promise<ApplicationPaymentMailDraft> {
  const admin = createSupabaseAdminClient();
  const profile = await loadPaymentMailProfile(admin, userId);
  const to = profile ? resolvePaymentEmail(profile) : null;
  if (!profile || !to) {
    throw new Error("Keine E-Mail für Beitragszahlungen hinterlegt.");
  }

  const { data: membership } = await admin
    .from("memberships")
    .select("fee_cents")
    .eq("user_id", userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { signatures, defaultSignatureId, signatureTexts } = await loadSignaturePickerData();
  const useSignatureId = signatureId ?? defaultSignatureId;
  const feeEur = `${((membership?.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const bankReference = formatApplicationPaymentReference(
    profile.first_name ?? "",
    profile.last_name ?? "",
  );
  const person = emailPersonVars({
    firstName: profile.first_name ?? "Fan",
    gender: profile.gender,
  });

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipApplicationReceived,
    {
      ...person,
      last_name: profile.last_name?.trim() || "",
      applicant_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      email: to,
      fee_eur: feeEur,
      ...clubBankEmailVars({ bankReference }),
    },
    { signatureId: useSignatureId },
  );

  return {
    subject: rendered.subject,
    body: rendered.text,
    to,
    signatures,
    defaultSignatureId: useSignatureId,
    signatureTexts,
    bankReference,
    feeEur,
  };
}
