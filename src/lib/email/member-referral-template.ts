export function memberReferralSubject(senderFullName: string) {
  const sender = senderFullName.trim() || "Ein Fanclub-Mitglied";
  return `${sender} hat dich in den Anni Perka Fanclub eingeladen`;
}

const MEMBER_REFERRAL_BODY_TEMPLATE = `Hallo {{recipient_first_name}},

ich würde mich riesig freuen, wenn du ebenfalls Teil unseres offiziellen **Anni Perka Fanclubs** wirst!

👉 **Hier kannst du dich direkt anmelden:**

**{{application_link}}**

Die Anmeldung funktioniert komplett digital und unkompliziert. Du füllst den Antrag einfach online aus, unterschreibst direkt am Bildschirm und schickst ihn mit wenigen Klicks ab – ganz ohne Ausdrucken oder Einscannen.

Als Mitglied erhältst du Zugang zu unserem neuen **digitalen Fanclub-Portal**, das wir mit viel Herzblut entwickelt haben. Dort erwarten dich unter anderem:

⭐ die **Anni-Stars** mit Ranglisten und Auszeichnungen
🎁 Freikarten für die meisten Events zu gewinnen, weitere tolle Gewinnspiele und exklusive Aktionen
💬 Community- und Chatfunktionen für den Austausch mit anderen Fans
📅 Konzerttermine mit Reiseinformationen, Hotels und vielen hilfreichen Tipps
🗳️ Umfragen und Mitmachaktionen
🛍️ (geplant!) ein eigener Fanshop und viele weitere exklusive Inhalte

Natürlich stehen vor allem die gemeinsame Freude an Annis Musik und der Austausch mit anderen Fans im Mittelpunkt.

Der Jahresbeitrag beträgt **15 €**.

Ich würde mich wirklich freuen, dich bald im Fanclub begrüßen zu dürfen!

👉 **Hier geht's noch einmal direkt zum Mitgliedsantrag:**

**{{application_link}}**

Liebe Grüße

{{sender_name}}`;

export function composeMemberReferralBody(input: {
  recipientFirstName: string;
  senderName: string;
  applicationLink: string;
}) {
  const first = input.recipientFirstName.trim() || "…";
  const sender = input.senderName.trim() || "…";
  const link = input.applicationLink.trim();
  return MEMBER_REFERRAL_BODY_TEMPLATE.replace(/\{\{recipient_first_name\}\}/g, first)
    .replace(/\{\{sender_name\}\}/g, sender)
    .replace(/\{\{application_link\}\}/g, link);
}

/** Plain-Text mit **fett** → HTML für E-Mail-Versand. */
export function buildMemberReferralHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withLinks = withBold.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#2563eb;text-decoration:underline">$1</a>',
  );
  const body = withLinks.replace(/\n/g, "<br>");
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:24px;line-height:1.55;color:#1e293b"><div style="max-width:560px">${body}</div></body></html>`;
}
