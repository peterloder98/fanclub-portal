import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailWithLog } from "@/lib/email/send-log";

export async function notifyAdminsReferralAbuse(input: {
  referrerName: string;
  referrerEmail: string;
  reasons: string[];
  sendsList: string;
  reviewUrl: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name")
    .eq("role", "admin")
    .not("email", "is", null);

  const recipients = (admins ?? []).filter((a) => a.email?.trim());
  if (!recipients.length) {
    return { sent: false, reason: "no_admin_emails" as const };
  }

  const reasonsText = input.reasons.join("; ");
  let sentCount = 0;

  for (const adm of recipients) {
    const adminFirst = adm.first_name?.trim() || adm.last_name?.trim() || "Vorstand";
    const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.referralAbuseAdminNotify, {
      admin_first_name: adminFirst,
      referrer_name: input.referrerName,
      referrer_email: input.referrerEmail,
      reasons_text: reasonsText,
      sends_list: input.sendsList,
      review_url: input.reviewUrl,
    });

    const result = await sendEmailWithLog({
      to: adm.email!,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      templateKey: EMAIL_TEMPLATE_KEYS.referralAbuseAdminNotify,
      attachments: rendered.signatureAttachment ? [rendered.signatureAttachment] : undefined,
    });
    if (result.ok) sentCount += 1;
  }

  return { sent: sentCount > 0, sentCount };
}
