/**
 * Test: Live-Einladung + Erinnerung (überarbeitete Texte) an mail@peter-loder.de
 *
 * npx --yes tsx --env-file=.env.local scripts/send-live-email-test-peter.ts
 */
import { createClient } from "@supabase/supabase-js";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import {
  liveSessionCalendarUrl,
  liveSessionIcsAttachment,
} from "@/lib/live/calendar-ics";
import {
  formatLiveSessionDateLabel,
  formatLiveSessionTimeLabel,
} from "@/lib/live/invites";
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

const inviteHtml = `<p style="${EMAIL_PARAGRAPH_STYLE}">{{salutation}},</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">wir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!</p>
<p style="margin:0 0 0.35em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">{{session_title}}</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">{{session_date}}</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Bitte melde dich zuerst mit deinen Mitgliedsdaten an. Über den Button siehst du alle Infos (Wann, Dauer, Ablauf) und kannst zusagen oder absagen.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Schon vor dem Live-Termin kannst du auf der Live-Seite eine Vorab-Frage an Anni einreichen — jede und jeder ist willkommen, früh eine Frage zu stellen (pro Person eine Vorab-Frage).</p>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{session_url}}" style="${EMAIL_BUTTON_STYLE}">Zur Live-Einladung</a>
</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Am Live-Tag öffnet sich der Raum <strong>{{join_opens_minutes}} Minuten</strong> vor Start für alle Mitglieder zum Chatten. Das Video beginnt erst, wenn Anni dazukommt — bitte sei deshalb rechtzeitig dabei.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Wer zusagt, erhält einen Tag vorher nochmals eine Erinnerung, dass es stattfindet.</p>
<p style="margin:0 0 0.5em;font-size:15px;line-height:1.55;color:#1e293b">Termin im Kalender speichern:</p>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{calendar_url}}" style="${EMAIL_BUTTON_STYLE}">In den Kalender eintragen</a>
</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns auf dich!</p>`;

const inviteText = `{{salutation}},

wir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!

{{session_title}}
{{session_date}}

Bitte melde dich zuerst mit deinen Mitgliedsdaten an. Über den Button siehst du alle Infos (Wann, Dauer, Ablauf) und kannst zusagen oder absagen.

Schon vor dem Live-Termin kannst du auf der Live-Seite eine Vorab-Frage an Anni einreichen — jede und jeder ist willkommen, früh eine Frage zu stellen (pro Person eine Vorab-Frage).

Zur Live-Einladung:
{{session_url}}

Am Live-Tag öffnet sich der Raum {{join_opens_minutes}} Minuten vor Start für alle Mitglieder zum Chatten. Das Video beginnt erst, wenn Anni dazukommt — bitte sei deshalb rechtzeitig dabei.

Wer zusagt, erhält einen Tag vorher nochmals eine Erinnerung, dass es stattfindet.

Termin im Kalender speichern:
{{calendar_url}}

Wir freuen uns auf dich!`;

const reminderHtml = `<p style="${EMAIL_PARAGRAPH_STYLE}">{{salutation}},</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">kurze Erinnerung: morgen haben wir unseren Live-Chat mit Anni!</p>
<p style="${EMAIL_PARAGRAPH_STYLE}"><strong>{{session_date}}</strong></p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Da du zugesagt hast, hoffen wir du bist morgen rechtzeitig dabei.<br>Schön, dass du dabei bist :-)</p>
<p style="margin:0 0 0.6em;font-size:15px;line-height:1.55;color:#1e293b"><strong>So kommst du rein:</strong></p>
<ol style="margin:0 0 1em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li style="margin-bottom:0.5em">Mit deinen Mitgliedsdaten in der Fanclub-App anmelden.</li>
  <li style="margin-bottom:0.5em">Zum festgelegten Zeit (oder am besten ein paar Minuten früher) den nachfolgenden Link öffnen (oder in der App im Menü auf Live-Chat klicken).</li>
  <li>Dann siehst du Annis Live-Video und den Chat — bis zum Start gibt es nur Infos und deine Vorab-Frage.</li>
</ol>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{session_url}}" style="${EMAIL_BUTTON_STYLE}">Zum Live-Raum</a>
</p>
<p style="margin:0 0 0.5em;font-size:15px;line-height:1.55;color:#1e293b">Termin im Kalender speichern:</p>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{calendar_url}}" style="${EMAIL_BUTTON_STYLE}">In den Kalender eintragen</a>
</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns auf dich!</p>`;

const reminderText = `{{salutation}},

kurze Erinnerung: morgen haben wir unseren Live-Chat mit Anni!
{{session_date}}

Da du zugesagt hast, hoffen wir du bist morgen rechtzeitig dabei.
Schön, dass du dabei bist :-)

So kommst du rein:
1. Mit deinen Mitgliedsdaten in der Fanclub-App anmelden.
2. Zum festgelegten Zeit (oder am besten ein paar Minuten früher) den nachfolgenden Link öffnen (oder in der App im Menü auf Live-Chat klicken).
3. Dann siehst du Annis Live-Video und den Chat — bis zum Start gibt es nur Infos und deine Vorab-Frage.

Zum Live-Raum:
{{session_url}}

Termin im Kalender speichern:
{{calendar_url}}

Wir freuen uns auf dich!`;

async function upsertHtmlTemplates() {
  const { error: inviteErr } = await admin.from("email_templates").upsert(
    {
      key: "live_session_invite",
      name: "Live mit Anni — Einladung",
      subject: "Einladung: {{session_title}} am {{session_date}}",
      body_text: inviteText,
      body_html: inviteHtml,
      description:
        "Einladung mit RSVP, Vorab-Frage (schon vor dem Termin), Raum öffnet join_opens_minutes vor Start zum Chatten, Video erst wenn Anni da ist. Kalender-Button. Login Pflicht.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (inviteErr) throw new Error(inviteErr.message);

  const { error: remErr } = await admin.from("email_templates").upsert(
    {
      key: "live_session_reminder",
      name: "Live mit Anni — Erinnerung",
      subject: "Erinnerung: {{session_title}} morgen um {{session_time}}",
      body_text: reminderText,
      body_html: reminderHtml,
      description: "Erinnerung 1 Tag vorher an Zusagen + Anni. Kalender-Button. Login Pflicht.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (remErr) throw new Error(remErr.message);

  console.log("E-Mail-Vorlagen aktualisiert.");
}

async function sendOne(
  label: string,
  templateKey: string,
  vars: Record<string, string>,
  session: { id: string; slug: string; starts_at: string; ends_at: string },
) {
  const rendered = await renderEmailFromTemplate(templateKey as never, vars);
  const ics = liveSessionIcsAttachment(session);
  const attachments = [
    {
      filename: ics.filename,
      content: ics.content,
      contentType: ics.contentType,
    },
    ...(rendered.signatureAttachment
      ? [
          {
            filename: rendered.signatureAttachment.filename,
            content: Buffer.from(rendered.signatureAttachment.content),
            contentType: rendered.signatureAttachment.contentType,
            cid: rendered.signatureAttachment.cid,
          },
        ]
      : []),
  ];

  const result = await sendEmailViaAccount({
    to: TO,
    subject: `[TEST – bitte prüfen] ${rendered.subject}`,
    text: rendered.text,
    html: rendered.html,
    attachments,
  });
  if (!result.ok) {
    throw new Error(
      result.skipped
        ? `übersprungen (${"reason" in result ? result.reason : "?"})`
        : ("error" in result ? result.error : "SMTP-Fehler"),
    );
  }
  console.log(`✓ ${label}`);
}

async function main() {
  await upsertHtmlTemplates();

  const person = emailPersonVars({ firstName: "Peter", gender: "m" });
  const start = new Date();
  start.setDate(start.getDate() + ((6 - start.getDay() + 7) % 7 || 7));
  start.setHours(19, 0, 0, 0);
  const end = new Date(start.getTime() + 45 * 60_000);
  const session = {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "test-live-chat-vorschau",
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
  };
  const sessionUrl = `${BASE}/live/${session.slug}`;
  const calendarUrl = liveSessionCalendarUrl(session);
  const sessionDate = formatLiveSessionDateLabel(session.starts_at);
  const sessionTime = formatLiveSessionTimeLabel(session.starts_at);
  const title = "Live-Chat mit Anni (Test)";
  const joinOpensMinutes = "10";

  console.log(`Fiktiver Termin: ${sessionDate}`);
  console.log(`Kalender-URL: ${calendarUrl}`);
  console.log(`Empfänger: ${TO}`);

  await sendOne(
    "Einladung Live-Chat",
    EMAIL_TEMPLATE_KEYS.liveSessionInvite,
    {
      ...person,
      session_title: title,
      session_date: sessionDate,
      session_url: sessionUrl,
      calendar_url: calendarUrl,
      join_opens_minutes: joinOpensMinutes,
    },
    session,
  );

  await sendOne(
    "Erinnerung Live-Chat",
    EMAIL_TEMPLATE_KEYS.liveSessionReminder,
    {
      ...person,
      session_title: title,
      session_date: sessionDate,
      session_time: sessionTime,
      session_url: sessionUrl,
      calendar_url: calendarUrl,
    },
    session,
  );

  console.log("\nFertig. Beide Mails mit neuem Text + Kalender-Button.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
