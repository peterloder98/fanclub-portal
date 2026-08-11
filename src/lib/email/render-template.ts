import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EMAIL_TEMPLATE_KEYS, type EmailTemplateKey } from "@/lib/email/template-keys";
import { loadDefaultMailSignature } from "@/lib/email/default-mail-signature";
import { loadMailSignature } from "@/lib/email/signatures";
import { escapePlainTextForHtml, linkifyEscapedHtml } from "@/lib/email/linkify-plain-text";
import {
  appendSignatureToEmailHtml,
  EMAIL_BUTTON_STYLE,
  EMAIL_PARAGRAPH_STYLE,
  wrapEmailDocument,
} from "@/lib/email/email-layout";
import {
  ensureEmailSalutationVars,
  normalizeLegacySalutationPlaceholders,
} from "@/lib/email/salutation-block";

export type EmailTemplateRow = {
  key: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  description: string | null;
};

export async function getEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplateRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("email_templates").select("*").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data as EmailTemplateRow | null;
}

export async function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_templates")
    .select("key,name,subject,body_text,body_html,description")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as EmailTemplateRow[];
}

function replaceVars(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

/** Entfernt Signatur-Platzhalter und typische Abschlusszeilen (werden separat angehängt). */
export function stripTemplateBodyArtifacts(body: string): string {
  let t = body
    .replace(/\{\{admin_signature_block\}\}/gi, "")
    .replace(/\{\{admin_signature_text\}\}/gi, "")
    .trimEnd();

  const trailingLine =
    /^(liebe grüße|viele grüße|herzliche grüße|mit freundlichen grüßen|freundliche grüße|deine anni perka fanclub app|eure anni perka fanclub app|wir freuen uns)/i;

  const lines = t.split("\n");
  while (lines.length > 0) {
    const last = lines[lines.length - 1]?.trim() ?? "";
    if (!last) {
      lines.pop();
      continue;
    }
    if (trailingLine.test(last)) {
      lines.pop();
      continue;
    }
    break;
  }
  return lines.join("\n").trimEnd();
}

function appendSignatureToPlainText(body: string, signatureText: string) {
  const core = stripTemplateBodyArtifacts(body);
  const sig = signatureText.trim();
  if (!sig) return core;
  // Genau eine Leerzeile zwischen Text und Signatur
  return core ? `${core}\n\n${sig}` : sig;
}

function textToHtmlParagraphs(text: string) {
  const escaped = escapePlainTextForHtml(text);
  return escaped
    .split(/\n\n+/)
    .map((p) => {
      const inner = linkifyEscapedHtml(p.replace(/\n/g, "<br>"));
      return `<p style="${EMAIL_PARAGRAPH_STYLE}">${inner}</p>`;
    })
    .join("");
}

const PAYMENT_REMINDER_FALLBACK = {
  subject: "Erinnerung: Mitgliedsbeitrag Anni Perka Fanclub",
  body_text: `{{salutation}},

dein aktueller Mitgliedsbeitrag für den Anni Perka Fanclub ist noch nicht vollständig bei uns eingegangen.

Jahresbeitrag: {{fee_eur}}
Bereits gezahlt: {{fee_paid_eur}}
Noch offen: {{fee_open_eur}}

Bitte sei so lieb und überweise den offenen Betrag zeitnah auf das Fanclubkonto:
Empfänger: {{bank_account_holder}}
IBAN: {{bank_iban}}
BIC: {{bank_bic}}
Verwendungszweck: {{bank_reference}}

Bei Fragen melde dich jederzeit gerne bei uns.`,
};

const APP_ACCESS_SETUP_FALLBACK = {
  subject: "Dein Zugang zur neuen Anni Perka Fanclub-App",
  body_text: `{{salutation}},

endlich ist es so weit!

Mit viel Herzblut haben wir unsere neue offizielle Anni Perka Fanclub-App entwickelt.
Heute kannst du bereits rechtzeitig vor dem Start deinen persönlichen Zugang einrichten und alles in Ruhe entdecken.

Mit der App möchten wir unseren Fanclub noch enger zusammenbringen und viele Dinge für alle Mitglieder einfacher machen.

Wichtig: Die Anmeldung ist ab sofort möglich.
Die volle Nutzung (Schreiben, Chatten und Mitmachen, Gewinnspiele etc.) startet offiziell am 16.08.2026 um 10:00 Uhr. Bis dahin kannst du dich nach der Anmeldung gerne umschauen.

Zugang jetzt einrichten:
{{setup_url}}

Das erwartet dich in der Fanclub-App

Austausch mit anderen Fans
Tausche dich mit anderen Fanclub-Mitgliedern aus und bleibe mit der Community verbunden.

Gewinnspiele und exklusive Aktionen
Nimm direkt über die App an Gewinnspielen, Quizaktionen und besonderen Verlosungen teil.

Events und Termine
Finde Annis Termine sowie Fanclub-Treffen und wichtige Infos rund um den Fanclub.

Live-Chat mit Anni
Wir organisieren immer wieder Video-Live-Chats mit Anni, bei denen ihr eure Fragen einbringen und miteinander chatten könnt.

Umfragen und Mitmachaktionen
Stimme bei Fanclub-Themen ab und bringe deine Meinung ein.

Anni-Stars und Auszeichnungen
Sammle Anni-Stars für deine Aktivität und schalte besondere Erfolge frei.

So richtest du deinen Zugang ein

1. Einrichtungslink öffnen
Klicke auf den Button „Zugang jetzt einrichten“.

2. Identität bestätigen und Passwort vergeben
Bestätige deine Identität durch die Eingabe deines Geburtsdatums und lege dein persönliches Wunschpasswort fest.
Dein Benutzername ist deine E-Mail-Adresse.
Bitte speichere dir deine E-Mail-Adresse und dein Passwort gut ab.

3. Einloggen und App entdecken
Nach dem Login freuen wir uns, wenn du fünf kurze Kennenlernfragen beantwortest, damit wir dich besser kennenlernen.
Danach gelangst du in die Fanclub-App.
Bis zum offiziellen Start am 16.08.2026 um 10:00 Uhr kannst du dich bereits umschauen — der volle Inhalt ist erst dann sichtbar und nutzbar.

Wir hoffen sehr, dass dir unsere neue Fanclub-App gefällt und sie den Austausch untereinander noch einfacher und schöner macht.

Du musst natürlich nicht alles auf einmal entdecken.
Schau dich einfach in Ruhe um.
In den nächsten Wochen werden wir dir nach und nach einzelne Funktionen und Möglichkeiten der App vorstellen.

Die App soll unsere WhatsApp-Gruppe nicht ersetzen, sondern sinnvoll ergänzen. Wichtige Informationen findest du künftig sowohl in der App als auch in der WhatsApp-Gruppe.

Wir wünschen dir ganz viel Freude beim Entdecken und freuen uns, dich in der neuen Fanclub-App begrüßen zu dürfen!

Jetzt meinen Zugang einrichten:
{{setup_url}}`,
  body_html: `<p style="${EMAIL_PARAGRAPH_STYLE}">{{salutation}},</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">endlich ist es so weit!</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Mit viel Herzblut haben wir unsere neue offizielle Anni Perka Fanclub-App entwickelt.<br>Heute kannst du bereits rechtzeitig vor dem Start deinen persönlichen Zugang einrichten und alles in Ruhe entdecken.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Mit der App möchten wir unseren Fanclub noch enger zusammenbringen und viele Dinge für alle Mitglieder einfacher machen.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}"><strong>Wichtig:</strong> Die Anmeldung ist ab sofort möglich.<br>Die volle Nutzung (Schreiben, Chatten und Mitmachen, Gewinnspiele etc.) startet offiziell am <strong>16.08.2026 um 10:00 Uhr</strong>. Bis dahin kannst du dich nach der Anmeldung gerne umschauen.</p>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{setup_url}}" style="${EMAIL_BUTTON_STYLE}">Zugang jetzt einrichten</a>
</p>
<p style="margin:1.25em 0 0.6em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">Das erwartet dich in der Fanclub-App</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Austausch mit anderen Fans</strong><br>Tausche dich mit anderen Fanclub-Mitgliedern aus und bleibe mit der Community verbunden.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Gewinnspiele und exklusive Aktionen</strong><br>Nimm direkt über die App an Gewinnspielen, Quizaktionen und besonderen Verlosungen teil.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Events und Termine</strong><br>Finde Annis Termine sowie Fanclub-Treffen und wichtige Infos rund um den Fanclub.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Live-Chat mit Anni</strong><br>Wir organisieren immer wieder Video-Live-Chats mit Anni, bei denen ihr eure Fragen einbringen und miteinander chatten könnt.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Umfragen und Mitmachaktionen</strong><br>Stimme bei Fanclub-Themen ab und bringe deine Meinung ein.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Anni-Stars und Auszeichnungen</strong><br>Sammle Anni-Stars für deine Aktivität und schalte besondere Erfolge frei.</p>
<p style="margin:1.25em 0 0.6em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">So richtest du deinen Zugang ein</p>
<p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b"><strong>1. Einrichtungslink öffnen</strong><br>Klicke auf den Button „Zugang jetzt einrichten“.</p>
<p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b"><strong>2. Identität bestätigen und Passwort vergeben</strong><br>Bestätige deine Identität durch die Eingabe deines Geburtsdatums und lege dein persönliches Wunschpasswort fest.<br>Dein Benutzername ist deine E-Mail-Adresse.<br>Bitte speichere dir deine E-Mail-Adresse und dein Passwort gut ab.</p>
<p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b"><strong>3. Einloggen und App entdecken</strong><br>Nach dem Login freuen wir uns, wenn du fünf kurze Kennenlernfragen beantwortest, damit wir dich besser kennenlernen.<br>Danach gelangst du in die Fanclub-App.<br>Bis zum offiziellen Start am <strong>16.08.2026 um 10:00 Uhr</strong> kannst du dich bereits umschauen — der volle Inhalt ist erst dann sichtbar und nutzbar.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Wir hoffen sehr, dass dir unsere neue Fanclub-App gefällt und sie den Austausch untereinander noch einfacher und schöner macht.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Du musst natürlich nicht alles auf einmal entdecken.<br>Schau dich einfach in Ruhe um.<br>In den nächsten Wochen werden wir dir nach und nach einzelne Funktionen und Möglichkeiten der App vorstellen.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Die App soll unsere WhatsApp-Gruppe nicht ersetzen, sondern sinnvoll ergänzen. Wichtige Informationen findest du künftig sowohl in der App als auch in der WhatsApp-Gruppe.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Wir wünschen dir ganz viel Freude beim Entdecken und freuen uns, dich in der neuen Fanclub-App begrüßen zu dürfen!</p>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{setup_url}}" style="${EMAIL_BUTTON_STYLE}">Jetzt meinen Zugang einrichten</a>
</p>`,
};

const APP_SIGNUP_REMINDER_FALLBACK = {
  subject: "Erinnerung: Deine Fanclub App wartet auf dich",
  body_text: `{{salutation}},

kurze Erinnerung: Dein Zugang zur Anni Perka Fanclub App ist bereit — wir freuen uns, wenn du dich anmeldest und mitmachst.

In der App findest du unter anderem:
• Neuigkeiten und Beiträge aus dem Fanclub
• Events und Treffen zum Mitmachen
• Umfragen, Gewinnspiele und Anni-Stars

So richtest du deinen Zugang ein:

1. Bitte den folgenden Link klicken:
{{setup_url}}

2. Bestätige deine Identität mit deinem Geburtsdatum und vergebe dein Wunschpasswort. Dein Benutzername ist deine E-Mail-Adresse.

Wir freuen uns auf dich!
Bis bald in der App!`,
  body_html: `<p style="${EMAIL_PARAGRAPH_STYLE}">{{salutation}},</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">kurze Erinnerung: Dein Zugang zur Anni Perka Fanclub App ist bereit — wir freuen uns, wenn du dich anmeldest und mitmachst.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">In der App findest du unter anderem:</p>
<ul style="margin:0 0 1.25em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li>Neuigkeiten und Beiträge aus dem Fanclub</li>
  <li>Events und Treffen zum Mitmachen</li>
  <li>Umfragen, Gewinnspiele und Anni-Stars</li>
</ul>
<p style="${EMAIL_PARAGRAPH_STYLE}"><strong>So richtest du deinen Zugang ein:</strong></p>
<ol style="margin:0 0 1.25em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li style="margin-bottom:0.75em"><strong>Bitte den folgenden Button klicken:</strong><br>
    <a href="{{setup_url}}" style="${EMAIL_BUTTON_STYLE}">Zugang hier einrichten</a>
  </li>
  <li><strong>Bestätige deine Identität</strong> mit deinem Geburtsdatum und vergebe dein Wunschpasswort. Dein Benutzername ist deine E-Mail-Adresse.</li>
</ol>
<p style="${EMAIL_PARAGRAPH_STYLE}">Wir freuen uns auf dich!<br>Bis bald in der App!</p>`,
};

const APP_INACTIVE_REMINDER_FALLBACK = {
  subject: "Wir vermissen dich in der Fanclub App",
  body_text: `{{salutation}},

wir haben dich eine Weile nicht mehr in der Anni Perka Fanclub App gesehen und würden uns freuen, wenn du wieder vorbeischaust.

In der Zwischenzeit ist sicher einiges passiert — neue Beiträge, Events, Umfragen und Gewinnspiele warten auf dich.

Einfach wieder einloggen und mitmachen:
{{app_url}}

Wir freuen uns auf dich!
Bis bald in der App!`,
  body_html: `<p style="${EMAIL_PARAGRAPH_STYLE}">{{salutation}},</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">wir haben dich eine Weile nicht mehr in der Anni Perka Fanclub App gesehen und würden uns freuen, wenn du wieder vorbeischaust.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">In der Zwischenzeit ist sicher einiges passiert — neue Beiträge, Events, Umfragen und Gewinnspiele warten auf dich.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Einfach wieder einloggen und mitmachen:</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">
  <a href="{{app_url}}" style="${EMAIL_BUTTON_STYLE}">Zur Fanclub App</a>
</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Wir freuen uns auf dich!<br>Bis bald in der App!</p>`,
};

export async function renderEmailFromTemplate(
  key: EmailTemplateKey,
  vars: Record<string, string>,
  opts?: { signatureId?: string },
) {
  let row = await getEmailTemplate(key);
  if (!row && key === EMAIL_TEMPLATE_KEYS.membershipPaymentReminder) {
    row = {
      key,
      name: "Zahlungserinnerung",
      subject: PAYMENT_REMINDER_FALLBACK.subject,
      body_text: PAYMENT_REMINDER_FALLBACK.body_text,
      body_html: null,
      description: null,
    };
  }
  if (!row && key === EMAIL_TEMPLATE_KEYS.appAccessSetup) {
    row = {
      key,
      name: "App-Zugang einrichten",
      subject: APP_ACCESS_SETUP_FALLBACK.subject,
      body_text: APP_ACCESS_SETUP_FALLBACK.body_text,
      body_html: APP_ACCESS_SETUP_FALLBACK.body_html,
      description: null,
    };
  }
  if (!row && key === EMAIL_TEMPLATE_KEYS.appSignupReminder) {
    row = {
      key,
      name: "Erinnerung: App-Anmeldung",
      subject: APP_SIGNUP_REMINDER_FALLBACK.subject,
      body_text: APP_SIGNUP_REMINDER_FALLBACK.body_text,
      body_html: APP_SIGNUP_REMINDER_FALLBACK.body_html,
      description: null,
    };
  }
  if (!row && key === EMAIL_TEMPLATE_KEYS.appInactiveReminder) {
    row = {
      key,
      name: "Erinnerung: Lange nicht aktiv",
      subject: APP_INACTIVE_REMINDER_FALLBACK.subject,
      body_text: APP_INACTIVE_REMINDER_FALLBACK.body_text,
      body_html: APP_INACTIVE_REMINDER_FALLBACK.body_html,
      description: null,
    };
  }
  if (!row) {
    throw new Error(
      `E-Mail-Vorlage „${key}“ fehlt. Bitte supabase/020_email_templates.sql und 023 ausführen.`,
    );
  }

  const sig = opts?.signatureId
    ? await loadMailSignature(opts.signatureId)
    : await loadDefaultMailSignature();
  const allVars = ensureEmailSalutationVars({
    ...vars,
    admin_signature_text: sig.text,
    admin_signature_block: sig.htmlBlock,
  });

  const subject = replaceVars(
    normalizeLegacySalutationPlaceholders(row.subject),
    allVars,
  );
  const bodyCore = stripTemplateBodyArtifacts(
    normalizeLegacySalutationPlaceholders(row.body_text),
  );
  const text = appendSignatureToPlainText(replaceVars(bodyCore, allVars), sig.text);

  // HTML-Vorlagen strippen Signatur-Platzhalter — Signatur immer separat anhängen (wie Text).
  const bodyHtmlCore = row.body_html?.trim()
    ? replaceVars(
        stripTemplateBodyArtifacts(normalizeLegacySalutationPlaceholders(row.body_html)),
        allVars,
      )
    : textToHtmlParagraphs(replaceVars(bodyCore, allVars));
  const bodyHtml = sig.htmlBlock?.trim()
    ? appendSignatureToEmailHtml(bodyHtmlCore, sig.htmlBlock)
    : bodyHtmlCore;

  const html = wrapEmailDocument(bodyHtml);

  return {
    subject,
    text,
    html,
    signatureHtml: sig.htmlBlock,
    signatureText: sig.text,
    signatureAttachment: sig.imageBuffer
      ? {
          filename: "signatur.png",
          content: sig.imageBuffer,
          contentType: sig.contentType,
          cid: sig.imageCid!,
        }
      : null,
  };
}
