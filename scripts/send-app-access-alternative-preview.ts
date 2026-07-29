/**
 * ALTERNATIVE Testmail — App-Zugang (nicht in DB speichern).
 *
 * Nutzt zentrales Layout + Fanclub-Signatur, neuen herzlicheren Text.
 *
 * npx --yes tsx --env-file=.env.local scripts/send-app-access-alternative-preview.ts
 */
import { createClient } from "@supabase/supabase-js";
import { loadDefaultMailSignature } from "@/lib/email/default-mail-signature";
import {
  appendSignatureToEmailHtml,
  EMAIL_BUTTON_STYLE,
  EMAIL_PARAGRAPH_STYLE,
  wrapEmailDocument,
} from "@/lib/email/email-layout";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { escapePlainTextForHtml } from "@/lib/email/linkify-plain-text";

const EXTRA_TO = "mail@peter-loder.de";
const ACTIVATION_URL =
  "https://fanclub.anniperka.de/zugang-einrichten?token=test-token";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

const P = EMAIL_PARAGRAPH_STYLE;
const BTN = EMAIL_BUTTON_STYLE;
const H2 =
  "margin:1.25em 0 0.6em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700";
const FEATURE =
  "margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b";
const STEP =
  "margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b";
const SMALL =
  "margin:0.5em 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all";

function buildBodies(vars: {
  salutation: string;
  first_name: string;
  activation_url: string;
}) {
  const safeUrl = escapePlainTextForHtml(vars.activation_url);
  const sal = escapePlainTextForHtml(vars.salutation);

  const bodyHtml = `
<p style="${P}">${sal},</p>
<p style="${P}">endlich ist es so weit! 🎉</p>
<p style="${P}">Mit viel Herzblut haben wir unsere neue offizielle Anni Perka Fanclub-App entwickelt. Heute kannst du deinen persönlichen Zugang einrichten und alles in Ruhe entdecken.</p>
<p style="${P}">Mit der App möchten wir unseren Fanclub noch enger zusammenbringen und viele Dinge für alle Mitglieder einfacher machen.</p>
<p style="${P};text-align:center">
  <a href="${safeUrl}" style="${BTN}">Zugang jetzt einrichten</a>
</p>
<p style="${SMALL}">Falls der Button nicht funktioniert, kannst du diesen Link kopieren und in deinem Browser öffnen:<br>${safeUrl}</p>

<p style="${H2}">Das erwartet dich in der Fanclub-App</p>
<p style="${FEATURE}">⭐ <strong>Anni-Stars und Auszeichnungen</strong><br>Sammle Anni-Stars für deine Aktivität und schalte besondere Erfolge frei.</p>
<p style="${FEATURE}">💬 <strong>Austausch mit anderen Fans</strong><br>Tausche dich mit anderen Fanclub-Mitgliedern aus und bleibe mit der Community verbunden.</p>
<p style="${FEATURE}">🎁 <strong>Gewinnspiele und exklusive Aktionen</strong><br>Nimm direkt über die App an Gewinnspielen, Quizaktionen und besonderen Verlosungen teil.</p>
<p style="${FEATURE}">📅 <strong>Events und hilfreiche Reiseinformationen</strong><br>Finde Annis Termine sowie Informationen zu Bahnhöfen, Hotels und weiteren wichtigen Details.</p>
<p style="${FEATURE}">🗳️ <strong>Umfragen und Mitmachaktionen</strong><br>Stimme bei Fanclub-Themen ab und bringe deine Meinung ein.</p>
<p style="${FEATURE}">🛍️ <strong>Fanshop und vieles mehr</strong><br>Entdecke Fanclub-Merchandise und viele weitere Funktionen rund um Anni und den Fanclub.</p>

<p style="${H2}">So richtest du deinen Zugang ein</p>
<p style="${STEP}"><strong>1. Einrichtungslink öffnen</strong><br>Klicke auf den Button „Zugang jetzt einrichten“.</p>
<p style="${STEP}"><strong>2. Identität bestätigen und Passwort vergeben</strong><br>Bestätige deine Identität durch die Eingabe deines Geburtsdatums und lege dein persönliches Wunschpasswort fest.<br>Dein Benutzername ist deine E-Mail-Adresse.<br>Bitte speichere dir deine E-Mail-Adresse und dein Passwort gut ab.</p>
<p style="${STEP}"><strong>3. Einloggen und App entdecken</strong><br>Nach dem Login kannst du optional fünf kurze Kennenlernfragen beantworten oder diesen Schritt überspringen.<br>Danach gelangst du direkt in die Fanclub-App und kannst dich gemeinsam mit den anderen Mitgliedern umsehen.</p>

<p style="${P}">Wir hoffen sehr, dass dir unsere neue Fanclub-App gefällt und sie den Austausch untereinander noch einfacher und schöner macht.</p>
<p style="${P}">Du musst natürlich nicht alles auf einmal entdecken. Schau dich einfach in Ruhe um. In den nächsten Wochen werden wir dir nach und nach einzelne Funktionen und Möglichkeiten der App vorstellen.</p>
<p style="${P}">Wir wünschen dir ganz viel Freude beim Entdecken und freuen uns, dich in der neuen Fanclub-App begrüßen zu dürfen!</p>
<p style="${P};text-align:center">
  <a href="${safeUrl}" style="${BTN}">Jetzt meinen Zugang einrichten</a>
</p>`.trim();

  const bodyText = `${vars.salutation},

endlich ist es so weit!

Mit viel Herzblut haben wir unsere neue offizielle Anni Perka Fanclub-App entwickelt. Heute kannst du deinen persönlichen Zugang einrichten und alles in Ruhe entdecken.

Mit der App möchten wir unseren Fanclub noch enger zusammenbringen und viele Dinge für alle Mitglieder einfacher machen.

Zugang jetzt einrichten:
${vars.activation_url}

Das erwartet dich in der Fanclub-App

⭐ Anni-Stars und Auszeichnungen
Sammle Anni-Stars für deine Aktivität und schalte besondere Erfolge frei.

💬 Austausch mit anderen Fans
Tausche dich mit anderen Fanclub-Mitgliedern aus und bleibe mit der Community verbunden.

🎁 Gewinnspiele und exklusive Aktionen
Nimm direkt über die App an Gewinnspielen, Quizaktionen und besonderen Verlosungen teil.

📅 Events und hilfreiche Reiseinformationen
Finde Annis Termine sowie Informationen zu Bahnhöfen, Hotels und weiteren wichtigen Details.

🗳️ Umfragen und Mitmachaktionen
Stimme bei Fanclub-Themen ab und bringe deine Meinung ein.

🛍️ Fanshop und vieles mehr
Entdecke Fanclub-Merchandise und viele weitere Funktionen rund um Anni und den Fanclub.

So richtest du deinen Zugang ein

1. Einrichtungslink öffnen
Klicke auf den Button „Zugang jetzt einrichten“.

2. Identität bestätigen und Passwort vergeben
Bestätige deine Identität durch die Eingabe deines Geburtsdatums und lege dein persönliches Wunschpasswort fest.
Dein Benutzername ist deine E-Mail-Adresse.
Bitte speichere dir deine E-Mail-Adresse und dein Passwort gut ab.

3. Einloggen und App entdecken
Nach dem Login kannst du optional fünf kurze Kennenlernfragen beantworten oder diesen Schritt überspringen.
Danach gelangst du direkt in die Fanclub-App und kannst dich gemeinsam mit den anderen Mitgliedern umsehen.

Wir hoffen sehr, dass dir unsere neue Fanclub-App gefällt und sie den Austausch untereinander noch einfacher und schöner macht.

Du musst natürlich nicht alles auf einmal entdecken. Schau dich einfach in Ruhe um. In den nächsten Wochen werden wir dir nach und nach einzelne Funktionen und Möglichkeiten der App vorstellen.

Wir wünschen dir ganz viel Freude beim Entdecken und freuen uns, dich in der neuen Fanclub-App begrüßen zu dürfen!

Jetzt meinen Zugang einrichten:
${vars.activation_url}`;

  return { bodyHtml, bodyText };
}

type Recipient = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
};

async function main() {
  console.log("=== Alternative Testmail (nicht gespeichert) ===");
  console.log("Vorlage-Bezug: app_access_setup (Inhalt nur im Skript)");
  console.log("Layout: wrapEmailDocument (email-layout.ts)");
  console.log("Signatur: loadDefaultMailSignature() zentral angehängt");
  console.log("");

  const sig = await loadDefaultMailSignature();
  const { data: admins, error } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,gender")
    .eq("role", "admin")
    .not("email", "is", null);
  if (error) throw new Error(error.message);

  const recipients: Recipient[] = [];
  const seen = new Set<string>();
  for (const a of admins ?? []) {
    const email = a.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email,
      first_name: a.first_name,
      last_name: a.last_name,
      gender: a.gender,
    });
  }
  if (!seen.has(EXTRA_TO.toLowerCase())) {
    recipients.push({
      email: EXTRA_TO,
      first_name: "Peter",
      last_name: "Loder",
      gender: "m",
    });
  }

  for (const r of recipients) {
    const person = emailPersonVars({
      firstName: r.first_name ?? "Fan",
      gender: r.gender === "m" || r.gender === "w" ? r.gender : null,
    });
    const { bodyHtml, bodyText } = buildBodies({
      salutation: person.salutation,
      first_name: person.first_name,
      activation_url: ACTIVATION_URL,
    });

    const withSig = sig.htmlBlock?.trim()
      ? appendSignatureToEmailHtml(bodyHtml, sig.htmlBlock)
      : bodyHtml;
    const html = wrapEmailDocument(withSig);
    const text = sig.text.trim()
      ? `${bodyText.trim()}\n\n${sig.text.trim()}`
      : bodyText;

    console.log(`→ ${r.first_name ?? "?"} <${r.email}>`);
    const result = await sendEmailViaAccount({
      to: r.email,
      subject: `[ALTERNATIVE TESTMAIL] Dein Zugang zur neuen Anni Perka Fanclub-App`,
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
    });
    if (!result.ok) {
      console.error(
        "  Fehler:",
        result.skipped
          ? `übersprungen (${"reason" in result ? result.reason : "?"})`
          : ("error" in result ? result.error : "SMTP"),
      );
      continue;
    }
    console.log("  ✓ gesendet");
  }

  console.log("\nFertig. DB-Vorlage unverändert. Betreff: [ALTERNATIVE TESTMAIL] …");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
