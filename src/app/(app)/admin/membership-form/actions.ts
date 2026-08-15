"use server";

import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import { loadSignaturePickerData } from "@/lib/email/draft-with-signatures";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { CLUB_SIGNATURE_ID } from "@/lib/email/signatures";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { describeEmailSendFailure } from "@/lib/smtp/email-send-error";
import { getMembershipApplicationFormUrl } from "@/lib/membership/application-form-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_FEE_EUR = "15,00 EUR";

function greetingName(raw?: string) {
  const t = raw?.trim();
  return t || "du";
}

export async function getMembershipFormLinkAction() {
  await requireAdminAction();
  return { url: getMembershipApplicationFormUrl() };
}

export async function getMembershipFormInviteDraft(input?: {
  greetingName?: string;
  signatureId?: string;
}) {
  await requireAdminAction();
  const { signatures, defaultSignatureId, signatureTexts } = await loadSignaturePickerData();
  const useSignatureId = input?.signatureId ?? defaultSignatureId;

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipFormInvite,
    {
      greeting_name: greetingName(input?.greetingName),
      application_link: getMembershipApplicationFormUrl(),
      fee_eur: DEFAULT_FEE_EUR,
    },
    { signatureId: useSignatureId },
  );

  return {
    subject: rendered.subject,
    body: rendered.text,
    signatures,
    defaultSignatureId: useSignatureId,
    signatureTexts,
    applicationUrl: getMembershipApplicationFormUrl(),
  };
}

export async function sendMembershipFormInviteEmail(input: {
  to: string;
  subject: string;
  body: string;
  signatureId: string;
  greetingName?: string;
}) {
  const { user } = await requireAdminAction();
  const to = input.to.trim();
  if (!to || !to.includes("@")) {
    throw new Error("Bitte eine gültige E-Mail-Adresse eingeben.");
  }

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipFormInvite,
    {
      greeting_name: greetingName(input.greetingName),
      application_link: getMembershipApplicationFormUrl(),
      fee_eur: DEFAULT_FEE_EUR,
    },
    { signatureId: input.signatureId || CLUB_SIGNATURE_ID },
  );

  const attachments = rendered.signatureAttachment
    ? [
        {
          filename: rendered.signatureAttachment.filename,
          content: Buffer.from(rendered.signatureAttachment.content),
          contentType: rendered.signatureAttachment.contentType,
          cid: rendered.signatureAttachment.cid,
        },
      ]
    : undefined;

  const subject = input.subject.trim() || rendered.subject;
  const text = input.body.trim() || rendered.text;
  const html = input.body.trim()
    ? buildHtmlFromPlain(text, rendered.signatureHtml, rendered.signatureText)
    : rendered.html;

  const result = await sendEmailViaAccount({
    to,
    subject,
    text,
    html,
    attachments,
    bypassTestAllowlist: true,
  });

  if (!result.ok) {
    throw new Error(describeEmailSendFailure(result));
  }

  const admin = createSupabaseAdminClient();
  const { error: logErr } = await admin.from("membership_referral_sends").insert({
    sender_id: user.id,
    recipient_email: to.toLowerCase(),
  });
  if (logErr && logErr.code !== "23505") {
    console.error("[membership] Einladung nicht protokolliert:", logErr.message);
  }

  return { ok: true };
}
