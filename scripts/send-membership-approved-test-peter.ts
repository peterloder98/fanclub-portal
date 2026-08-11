/**
 * Willkommens-Mail nach Freigabe (digitale Neuanmeldung) upserten + Test an Peter.
 *
 * npx --yes tsx --env-file=.env.local scripts/send-membership-approved-test-peter.ts
 */
import { createClient } from "@supabase/supabase-js";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { EMAIL_BUTTON_STYLE, EMAIL_PARAGRAPH_STYLE } from "@/lib/email/email-layout";

const TO = "mail@peter-loder.de";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);
const BASE = (
  process.env.APP_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://fanclub.anniperka.de"
).replace(/\/$/, "");

const subject = "Willkommen im Fanclub — deine Mitgliedsnummer {{membership_number}}";

const body_text = `{{salutation}},

wir freuen uns sehr, dir mitteilen zu können: Dein Mitgliedsantrag wurde freigegeben — willkommen im Anni Perka Fanclub!

Deine Mitgliedsnummer: {{membership_number}}

Du bist damit offiziell aufgenommen. Als Nächstes richte bitte deinen persönlichen Zugang zur Fanclub-App ein (Passwort vergeben). Danach kannst du dich mit deiner E-Mail-Adresse anmelden.

Wichtig: Die volle Nutzung (Schreiben, Chatten und Mitmachen, Gewinnspiele etc.) startet offiziell am 16.08.2026 um 10:00 Uhr. Bis dahin kannst du dich nach der Anmeldung gerne umschauen.

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

Die App soll unsere WhatsApp-Gruppe nicht ersetzen, sondern sinnvoll ergänzen. Wichtige Informationen findest du künftig sowohl in der App als auch in der WhatsApp-Gruppe.

Wir wünschen dir ganz viel Freude und freuen uns, dich in der Fanclub-App begrüßen zu dürfen!

Jetzt meinen Zugang einrichten:
{{setup_url}}`;

const body_html = `<p style="${EMAIL_PARAGRAPH_STYLE}">{{salutation}},</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">wir freuen uns sehr, dir mitteilen zu können: Dein Mitgliedsantrag wurde freigegeben — willkommen im Anni Perka Fanclub!</p>
<p style="margin:0 0 0.35em;font-size:15px;line-height:1.55;color:#1e293b"><strong>Deine Mitgliedsnummer:</strong></p>
<p style="margin:0 0 1em;font-size:22px;line-height:1.3;color:#0b1f3a;font-weight:700">{{membership_number}}</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Du bist damit offiziell aufgenommen. Als Nächstes richte bitte deinen persönlichen Zugang zur Fanclub-App ein (Passwort vergeben). Danach kannst du dich mit deiner E-Mail-Adresse anmelden.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}"><strong>Wichtig:</strong> Die volle Nutzung (Schreiben, Chatten und Mitmachen, Gewinnspiele etc.) startet offiziell am <strong>16.08.2026 um 10:00 Uhr</strong>. Bis dahin kannst du dich nach der Anmeldung gerne umschauen.</p>
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
<p style="${EMAIL_PARAGRAPH_STYLE}">Die App soll unsere WhatsApp-Gruppe nicht ersetzen, sondern sinnvoll ergänzen. Wichtige Informationen findest du künftig sowohl in der App als auch in der WhatsApp-Gruppe.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Wir wünschen dir ganz viel Freude und freuen uns, dich in der Fanclub-App begrüßen zu dürfen!</p>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{setup_url}}" style="${EMAIL_BUTTON_STYLE}">Jetzt meinen Zugang einrichten</a>
</p>`;

async function main() {
  const { error } = await admin.from("email_templates").upsert(
    {
      key: "membership_approved_welcome",
      name: "Mitgliedschaft freigegeben (an neues Mitglied)",
      subject,
      body_text,
      body_html,
      description:
        "Nach Freigabe digitaler Neuanmeldung: Mitgliedsnummer + App-Zugang (Setup-Link).",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  console.log("Vorlage membership_approved_welcome in DB aktualisiert.");

  const person = emailPersonVars({ firstName: "Peter", gender: "m" });
  const setupUrl = `${BASE}/setup-account?token_hash=TEST_PREVIEW_NICHT_GUELTIG&type=recovery`;
  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipApprovedWelcome,
    {
      ...person,
      membership_number: "88",
      setup_url: setupUrl,
      invite_url: setupUrl,
    },
  );

  const result = await sendEmailViaAccount({
    to: TO,
    subject: `[TEST – digitale Neuanmeldung] ${rendered.subject}`,
    text: rendered.text,
    html: rendered.html,
    attachments: rendered.signatureAttachment
      ? [
          {
            filename: rendered.signatureAttachment.filename,
            content: Buffer.from(rendered.signatureAttachment.content),
            contentType: rendered.signatureAttachment.contentType,
            cid: rendered.signatureAttachment.cid,
          },
        ]
      : undefined,
  });

  if (!result.ok) {
    console.error(result);
    process.exit(1);
  }

  console.log(`✓ Testmail an ${TO} gesendet (Beispiel-Mitgliedsnummer 88).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
