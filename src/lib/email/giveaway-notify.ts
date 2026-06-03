import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export async function notifyAdminsGiveawayEnded(input: {
  giveawayId: string;
  title: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id,email,first_name")
    .eq("role", "admin")
    .not("email", "is", null);

  const recipients = (admins ?? []).filter((a) => a.email?.trim());
  if (!recipients.length) return { sent: 0 };

  const base = appBaseUrl();
  const giveawayAdminUrl = base
    ? `${base}/giveaways/${input.giveawayId}`
    : `/giveaways/${input.giveawayId}`;

  let sent = 0;
  for (const adm of recipients) {
    const rendered = await renderEmailFromTemplate(
      EMAIL_TEMPLATE_KEYS.giveawayEndedAdminNotify,
      {
        giveaway_title: input.title,
        giveaway_admin_url: giveawayAdminUrl,
      },
    );
    await sendEmailViaAccount({
      to: adm.email!.trim(),
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: rendered.signatureAttachment ? [rendered.signatureAttachment] : [],
    });
    sent += 1;
  }
  return { sent };
}

export async function notifyGiveawayWinner(input: {
  winnerEmail: string;
  firstName: string;
  giveawayTitle: string;
  prizeName: string;
  signatureId?: string;
}) {
  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.giveawayWinnerCongrats,
    {
      first_name: input.firstName,
      giveaway_title: input.giveawayTitle,
      prize_name: input.prizeName,
    },
    { signatureId: input.signatureId },
  );

  await sendEmailViaAccount({
    to: input.winnerEmail,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments: rendered.signatureAttachment ? [rendered.signatureAttachment] : [],
  });
}
