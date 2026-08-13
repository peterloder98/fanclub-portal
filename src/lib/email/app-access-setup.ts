import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { rotateAccountSetupToken } from "@/lib/auth/account-setup-token";

export async function sendAppAccessSetupEmail(input: {
  email: string;
  firstName: string;
  gender?: string | null;
  userId?: string;
  /** Extra Felder für email_send_log.context (z. B. source, client_ip). */
  logContext?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();

  let genderRaw = input.gender;
  if (genderRaw == null && input.userId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("gender")
      .eq("id", input.userId)
      .maybeSingle();
    genderRaw = profile?.gender ?? null;
  }

  // Club-eigener Setup-Token: mehrfach nutzbar bis Passwort gesetzt / Ablauf.
  const { setupUrl, userId } = await rotateAccountSetupToken({
    email: input.email,
    userId: input.userId,
  });
  const person = emailPersonVars({ firstName: input.firstName, gender: genderRaw });

  const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.appAccessSetup, {
    ...person,
    setup_url: setupUrl,
  });

  const result = await sendEmailWithLog({
    to: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments: rendered.signatureAttachment
      ? [rendered.signatureAttachment]
      : undefined,
    templateKey: EMAIL_TEMPLATE_KEYS.appAccessSetup,
    context: {
      user_id: userId,
      setup_path: "/setup-account",
      setup_token: true,
      ...input.logContext,
    },
  });

  return { ...result, setupUrl };
}
