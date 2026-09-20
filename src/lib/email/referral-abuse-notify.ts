import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { listAdminNotifyRecipients } from "@/lib/email/admin-notify-recipients";

/** Admin: E-Mail an alle Vorstände (und Club-SMTP-Postfach). In-App separat via notifyAllAdmins. */
export async function notifyAdminsReferralAbuse(input: {
  referrerName: string;
  referrerEmail: string;
  reasons: string[];
  sendsList: string;
  reviewUrl: string;
}) {
  const recipients = await listAdminNotifyRecipients();
  if (!recipients.length) {
    return { sent: false, reason: "no_admin_emails" as const };
  }

  const reasonsText = input.reasons.join("; ");
  let sentCount = 0;

  for (const r of recipients) {
    const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.referralAbuseAdminNotify, {
      admin_first_name: r.firstName,
      referrer_name: input.referrerName,
      referrer_email: input.referrerEmail,
      reasons_text: reasonsText,
      sends_list: input.sendsList,
      review_url: input.reviewUrl,
    });

    const result = await sendEmailWithLog({
      to: r.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      templateKey: EMAIL_TEMPLATE_KEYS.referralAbuseAdminNotify,
      attachments: rendered.signatureAttachment ? [rendered.signatureAttachment] : undefined,
      bypassTestAllowlist: true,
    });
    if (result.ok) sentCount += 1;
  }

  return { sent: sentCount > 0, sentCount };
}
