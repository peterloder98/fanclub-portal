export const MEMBER_REFERRAL_SUBJECT = "digitaler Antrag Anni Perka Fanclub";

const MEMBER_REFERRAL_BODY_TEMPLATE = `Hey {{recipient_name}},

ich wollte dir gerne den Link zum digitalen Antrag für den Anni Perka Fanclub senden.
Es würde mich total freuen wenn du mitmachst in unserem Fanclub.
Einfach alles ausfüllen und digital unterzeichnen, alles ganz easy.

Zum Antrag: {{application_link}}

Liebe Grüße,
{{sender_name}}`;

export function composeMemberReferralBody(input: {
  recipientName: string;
  senderName: string;
  applicationLink: string;
}) {
  const recipient = input.recipientName.trim() || "…";
  const sender = input.senderName.trim() || "…";
  return MEMBER_REFERRAL_BODY_TEMPLATE.replace(/\{\{recipient_name\}\}/g, recipient)
    .replace(/\{\{sender_name\}\}/g, sender)
    .replace(/\{\{application_link\}\}/g, input.applicationLink.trim());
}

/** Ersetzt Empfänger- oder Absendername in einer bereits gerenderten Nachricht. */