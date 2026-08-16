import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { resolveOfficialFanclubEmail } from "@/lib/email/official-fanclub-email";

/** Admin: E-Mail nur an die offizielle Fanclub-Adresse (In-App separat via notifyAllAdmins). */
export async function notifyAdminsReferralAbuse(input: {
  referrerName: string;
  referrerEmail: string;
  reasons: string[];
  sendsList: string;
  reviewUrl: string;
}) {
  const to = await resolveOfficialFanclubEmail();
  if (!to) {
    return { sent: false, reason: "no_official_email" as const };
  }

  const reasonsText = input.reasons.join("; ");
  const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.referralAbuseAdminNotify, {
    admin_first_name: "Vorstand",
    referrer_name: input.referrerName,
    referrer_email: input.referrerEmail,
    reasons_text: reasonsText,
    sends_list: input.sendsList,
    review_url: input.reviewUrl,
  });

  const result = await sendEmailWithLog({
    to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    templateKey: EMAIL_TEMPLATE_KEYS.referralAbuseAdminNotify,
    attachments: rendered.signatureAttachment ? [rendered.signatureAttachment] : undefined,
    bypassTestAllowlist: true,
  });

  return { sent: result.ok, sentCount: result.ok ? 1 : 0 };
}
