import { buildEmailFromPlainText } from "@/lib/email/email-layout";
import { getEmailTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";

const FALLBACK_SUBJECT = "{{sender_name}} hat dich in den Anni Perka Fanclub eingeladen";

const FALLBACK_BODY = `Hallo {{recipient_first_name}},

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

function applyVars(
  template: string,
  vars: {
    recipient_first_name: string;
    sender_name: string;
    application_link: string;
  },
) {
  return template
    .replace(/\{\{recipient_first_name\}\}/g, vars.recipient_first_name)
    .replace(/\{\{sender_name\}\}/g, vars.sender_name)
    .replace(/\{\{application_link\}\}/g, vars.application_link);
}

export async function loadMemberReferralInviteParts() {
  try {
    const row = await getEmailTemplate(EMAIL_TEMPLATE_KEYS.membershipReferralInvite);
    if (row?.subject?.trim() && row?.body_text?.trim()) {
      return { subjectTemplate: row.subject, bodyTemplate: row.body_text };
    }
  } catch {
    // Vorlage fehlt / DB — Fallback
  }
  return { subjectTemplate: FALLBACK_SUBJECT, bodyTemplate: FALLBACK_BODY };
}

export function memberReferralSubject(senderFullName: string) {
  const sender = senderFullName.trim() || "Ein Fanclub-Mitglied";
  return applyVars(FALLBACK_SUBJECT, {
    recipient_first_name: "",
    sender_name: sender,
    application_link: "",
  });
}

export function composeMemberReferralBody(input: {
  recipientFirstName: string;
  senderName: string;
  applicationLink: string;
  bodyTemplate?: string;
}) {
  const first = input.recipientFirstName.trim() || "…";
  const sender = input.senderName.trim() || "…";
  const link = input.applicationLink.trim();
  const template = input.bodyTemplate?.trim() || FALLBACK_BODY;
  return applyVars(template, {
    recipient_first_name: first,
    sender_name: sender,
    application_link: link,
  });
}

export async function composeMemberReferralEmail(input: {
  recipientFirstName: string;
  senderName: string;
  applicationLink: string;
}) {
  const parts = await loadMemberReferralInviteParts();
  const first = input.recipientFirstName.trim() || "…";
  const sender = input.senderName.trim() || "Ein Fanclub-Mitglied";
  const link = input.applicationLink.trim();
  const vars = {
    recipient_first_name: first,
    sender_name: sender,
    application_link: link,
  };
  return {
    subject: applyVars(parts.subjectTemplate, vars),
    text: applyVars(parts.bodyTemplate, vars),
    bodyTemplate: parts.bodyTemplate,
    subjectTemplate: parts.subjectTemplate,
  };
}

/** Plain-Text mit **fett** → HTML für E-Mail-Versand (einheitliches Layout). */
export function buildMemberReferralHtml(text: string) {
  return buildEmailFromPlainText(text, { markdown: true });
}
