import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { emailPersonVars } from "@/lib/email/salutation-block";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
}

export async function sendAppAccessSetupEmail(input: {
  email: string;
  firstName: string;
  gender?: string | null;
  userId?: string;
  /** Extra Felder für email_send_log.context (z. B. source, client_ip). */
  logContext?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const base = appBaseUrl();
  if (!base) {
    throw new Error("APP_BASE_URL / NEXT_PUBLIC_APP_URL fehlt.");
  }

  let genderRaw = input.gender;
  if (genderRaw == null && input.userId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("gender")
      .eq("id", input.userId)
      .maybeSingle();
    genderRaw = profile?.gender ?? null;
  }

  // generateLink action_link ist mit PKCE (@supabase/ssr) unzuverlässig.
  // Stattdessen hashed_token → App-Seite verifyOtp (stabil für E-Mail-Clients).
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: input.email,
  });
  if (linkErr) throw new Error(linkErr.message);

  const hashedToken = linkData.properties.hashed_token;
  if (!hashedToken) throw new Error("Kein Setup-Token erzeugt.");

  const setupUrl = `${base}/setup-account?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
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
      user_id: input.userId ?? null,
      setup_path: "/setup-account",
      ...input.logContext,
    },
  });

  return { ...result, setupUrl };
}
