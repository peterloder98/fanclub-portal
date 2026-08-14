import { rotateAccountSetupToken } from "@/lib/auth/account-setup-token";
import { loadDefaultMailSignature } from "@/lib/email/default-mail-signature";
import {
  appendSignatureToEmailHtml,
  EMAIL_BUTTON_STYLE,
  EMAIL_PARAGRAPH_STYLE,
  wrapEmailDocument,
} from "@/lib/email/email-layout";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailWithLog } from "@/lib/email/send-log";

export const APP_ACCESS_RELINK_SUBJECT =
  "Dein neuer Zugangslink zur Anni Perka Fanclub-App";

export const APP_ACCESS_RELINK_TEMPLATE_KEY = "app_access_relink";

function fill(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

export const APP_ACCESS_RELINK_TEXT = `Bitte nur diese Mail verwenden

Ignoriere bitte die vorherige Zugangs-Mail. Der alte Link funktioniert oftmals nicht mehr.
Leider wurde uns von vielen Mitgliedern gemeldet, dass der Link abgelaufen wäre.

Nutze nur den Button bzw. Link in dieser Mail. Er bleibt gültig, bis du dein Passwort gesetzt hast — auch mehrmals und auf dem Handy oder am Computer.

Zugang jetzt einrichten:
{{setup_url}}

{{salutation}},

Mit viel Herzblut haben wir unsere neue offizielle Anni Perka Fanclub-App entwickelt.
Mit der App möchten wir unseren Fanclub noch enger zusammenbringen und viele Dinge für alle Mitglieder einfacher machen.

Wichtig: Die Anmeldung ist ab sofort möglich.
Die volle Nutzung (Schreiben, Chatten und Mitmachen, Gewinnspiele etc.) startet offiziell am 16.08.2026 um 10:00 Uhr. Bis dahin kannst du dich nach der Anmeldung gerne umschauen.

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
Klicke auf den Button „Zugang jetzt einrichten“ oben in dieser Mail.

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
{{setup_url}}`;

export const APP_ACCESS_RELINK_HTML = `<div style="margin:0 0 1.35em;padding:16px 18px;background:#fff7ed;border:2px solid #c2410c;border-radius:12px">
  <p style="margin:0 0 0.65em;font-size:18px;line-height:1.35;color:#7c2d12;font-weight:800">Bitte nur diese Mail verwenden</p>
  <p style="margin:0 0 0.75em;font-size:15px;line-height:1.55;color:#7c2d12">Ignoriere bitte die vorherige Zugangs-Mail. Der alte Link funktioniert oftmals nicht mehr.<br>Leider wurde uns von vielen Mitgliedern gemeldet, dass der Link abgelaufen wäre.</p>
  <p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#7c2d12"><strong>Nutze nur den Button bzw. Link in dieser Mail.</strong> Er bleibt gültig, bis du dein Passwort gesetzt hast — auch mehrmals und auf dem Handy oder am Computer.</p>
  <p style="margin:0;text-align:center">
    <a href="{{setup_url}}" style="${EMAIL_BUTTON_STYLE}">Zugang jetzt einrichten</a>
  </p>
  <p style="margin:0.85em 0 0;font-size:12px;line-height:1.5;color:#9a3412;word-break:break-all">Falls der Button nicht funktioniert, diesen Link im Browser öffnen:<br>{{setup_url}}</p>
</div>
<p style="${EMAIL_PARAGRAPH_STYLE}">{{salutation}},</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Mit viel Herzblut haben wir unsere neue offizielle Anni Perka Fanclub-App entwickelt. Mit der App möchten wir unseren Fanclub noch enger zusammenbringen und viele Dinge für alle Mitglieder einfacher machen.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}"><strong>Wichtig:</strong> Die Anmeldung ist ab sofort möglich.<br>Die volle Nutzung (Schreiben, Chatten und Mitmachen, Gewinnspiele etc.) startet offiziell am <strong>16.08.2026 um 10:00 Uhr</strong>. Bis dahin kannst du dich nach der Anmeldung gerne umschauen.</p>
<p style="margin:1.25em 0 0.6em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">Das erwartet dich in der Fanclub-App</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Austausch mit anderen Fans</strong><br>Tausche dich mit anderen Fanclub-Mitgliedern aus und bleibe mit der Community verbunden.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Gewinnspiele und exklusive Aktionen</strong><br>Nimm direkt über die App an Gewinnspielen, Quizaktionen und besonderen Verlosungen teil.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Events und Termine</strong><br>Finde Annis Termine sowie Fanclub-Treffen und wichtige Infos rund um den Fanclub.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Live-Chat mit Anni</strong><br>Wir organisieren immer wieder Video-Live-Chats mit Anni, bei denen ihr eure Fragen einbringen und miteinander chatten könnt.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Umfragen und Mitmachaktionen</strong><br>Stimme bei Fanclub-Themen ab und bringe deine Meinung ein.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Anni-Stars und Auszeichnungen</strong><br>Sammle Anni-Stars für deine Aktivität und schalte besondere Erfolge frei.</p>
<p style="margin:1.25em 0 0.6em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">So richtest du deinen Zugang ein</p>
<p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b"><strong>1. Einrichtungslink öffnen</strong><br>Klicke auf den Button „Zugang jetzt einrichten“ ganz oben in dieser Mail.</p>
<p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b"><strong>2. Identität bestätigen und Passwort vergeben</strong><br>Bestätige deine Identität durch die Eingabe deines Geburtsdatums und lege dein persönliches Wunschpasswort fest.<br>Dein Benutzername ist deine E-Mail-Adresse.<br>Bitte speichere dir deine E-Mail-Adresse und dein Passwort gut ab.</p>
<p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b"><strong>3. Einloggen und App entdecken</strong><br>Nach dem Login freuen wir uns, wenn du fünf kurze Kennenlernfragen beantwortest, damit wir dich besser kennenlernen.<br>Danach gelangst du in die Fanclub-App.<br>Bis zum offiziellen Start am <strong>16.08.2026 um 10:00 Uhr</strong> kannst du dich bereits umschauen — der volle Inhalt ist erst dann sichtbar und nutzbar.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Wir hoffen sehr, dass dir unsere neue Fanclub-App gefällt und sie den Austausch untereinander noch einfacher und schöner macht.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Du musst natürlich nicht alles auf einmal entdecken.<br>Schau dich einfach in Ruhe um.<br>In den nächsten Wochen werden wir dir nach und nach einzelne Funktionen und Möglichkeiten der App vorstellen.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Die App soll unsere WhatsApp-Gruppe nicht ersetzen, sondern sinnvoll ergänzen. Wichtige Informationen findest du künftig sowohl in der App als auch in der WhatsApp-Gruppe.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Wir wünschen dir ganz viel Freude beim Entdecken und freuen uns, dich in der neuen Fanclub-App begrüßen zu dürfen!</p>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{setup_url}}" style="${EMAIL_BUTTON_STYLE}">Jetzt meinen Zugang einrichten</a>
</p>`;

export async function sendAppAccessRelinkEmail(input: {
  email: string;
  firstName: string;
  gender?: string | null;
  userId?: string;
  logContext?: Record<string, unknown>;
}) {
  const { setupUrl, userId } = await rotateAccountSetupToken({
    email: input.email,
    userId: input.userId,
  });
  const person = emailPersonVars({ firstName: input.firstName, gender: input.gender });
  const vars = { ...person, setup_url: setupUrl };
  const sig = await loadDefaultMailSignature();
  const text = `${fill(APP_ACCESS_RELINK_TEXT, vars).trim()}\n\n${sig.text.trim()}`.trim();
  const html = wrapEmailDocument(
    appendSignatureToEmailHtml(fill(APP_ACCESS_RELINK_HTML, vars), sig.htmlBlock),
  );

  const result = await sendEmailWithLog({
    to: input.email,
    subject: APP_ACCESS_RELINK_SUBJECT,
    text,
    html,
    attachments: sig.imageBuffer
      ? [
          {
            filename: "signatur.png",
            content: Buffer.from(sig.imageBuffer),
            contentType: sig.contentType,
            cid: sig.imageCid!,
          },
        ]
      : undefined,
    templateKey: APP_ACCESS_RELINK_TEMPLATE_KEY,
    context: {
      user_id: userId,
      setup_path: "/setup-account",
      setup_token: true,
      campaign: "relink_unregistered",
      ...input.logContext,
    },
  });

  return { ...result, setupUrl, userId };
}
