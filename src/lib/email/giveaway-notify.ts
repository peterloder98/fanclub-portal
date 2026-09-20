import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { listAdminNotifyRecipients } from "@/lib/email/admin-notify-recipients";
import { notifyAllAdmins } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

/** Admin: In-App + E-Mail an alle Vorstände (und Club-SMTP-Postfach). */
export async function notifyAdminsGiveawayEnded(input: {
  giveawayId: string;
  title: string;
}) {
  const base = appBaseUrl();
  const giveawayAdminUrl = base
    ? `${base}/giveaways/${input.giveawayId}`
    : `/giveaways/${input.giveawayId}`;

  await notifyAllAdmins({
    kind: NOTIFICATION_KINDS.giveawayEnded,
    title: "Gewinnspiel beendet",
    body: `„${input.title}" — bitte Auslosung prüfen.`,
    linkUrl: giveawayAdminUrl,
    linkLabel: "Zum Gewinnspiel",
    metadata: { giveaway_id: input.giveawayId },
  }).catch(console.error);

  const recipients = await listAdminNotifyRecipients();
  if (!recipients.length) return { sent: 0, failed: 0 };

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.giveawayEndedAdminNotify,
    {
      giveaway_title: input.title,
      giveaway_admin_url: giveawayAdminUrl,
    },
  );

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const result = await sendEmailViaAccount({
      to: r.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: rendered.signatureAttachment ? [rendered.signatureAttachment] : [],
      bypassTestAllowlist: true,
    });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return { sent, failed };
}

export async function notifyGiveawayWinner(input: {
  winnerEmail: string;
  firstName: string;
  gender?: string | null;
  giveawayTitle: string;
  prizeName: string;
  signatureId?: string;
}) {
  const person = emailPersonVars({ firstName: input.firstName, gender: input.gender });
  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.giveawayWinnerCongrats,
    {
      ...person,
      giveaway_title: input.giveawayTitle,
      prize_name: input.prizeName,
    },
    { signatureId: input.signatureId },
  );

  return sendEmailViaAccount({
    to: input.winnerEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments: rendered.signatureAttachment ? [rendered.signatureAttachment] : [],
  });
}
