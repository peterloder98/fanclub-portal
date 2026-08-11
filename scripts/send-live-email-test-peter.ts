/**
 * Test: Live-Einladung + Erinnerung (fiktiver Termin) an mail@peter-loder.de
 * Layout wie Produktionsmails + .ics-Anhang.
 *
 * npx --yes tsx --env-file=.env.local scripts/send-live-email-test-peter.ts
 */
import { createClient } from "@supabase/supabase-js";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { liveSessionIcsAttachment } from "@/lib/live/calendar-ics";
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
<p style="${EMAIL_PARAGRAPH_STYLE}">Bitte melde dich zuerst mit deinen Mitgliedsdaten an. Über den Button siehst du alle Infos (Wann, Dauer, Ablauf), kannst zusagen oder absagen und optional schon eine Frage an Anni einreichen (nur eine Vorab-Frage).</p>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{session_url}}" style="${EMAIL_BUTTON_STYLE}">Zur Live-Einladung</a>
</p>
<p style="margin:0.5em 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all">Falls der Button nicht funktioniert:<br>{{session_url}}</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Video und Chat öffnen sich erst am Tag des Live, sobald der Raum freigegeben ist. Wer zusagt, erhält einen Tag vorher noch eine Erinnerung.</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Im Anhang: Kalenderdatei „Anni Perka Live Chat“ (Start 5 Minuten früher; Erinnerungen 1 Tag und 1 Stunde vorher).</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns auf dich!</p>`;

const reminderHtml = `<p style="${EMAIL_PARAGRAPH_STYLE}">{{salutation}},</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">kurze Erinnerung: morgen ist Live mit Anni!</p>
<p style="margin:0 0 0.35em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">{{session_title}}</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">{{session_date}}</p>
<p style="${EMAIL_PARAGRAPH_STYLE}">Du hast zugesagt — schön, dass du dabei bist.</p>
<p style="margin:0 0 0.6em;font-size:15px;line-height:1.55;color:#1e293b"><strong>So kommst du rein:</strong></p>
<ol style="margin:0 0 1em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li style="margin-bottom:0.5em">Mit deinen Mitgliedsdaten in der Fanclub-App anmelden.</li>
  <li style="margin-bottom:0.5em">Zur Zeit (oder etwas früher) diesen Link öffnen.</li>
  <li>Dann siehst du Annis Video und den Chat — vorher nur Infos und deine Vorab-Frage.</li>
</ol>
<p style="${EMAIL_PARAGRAPH_STYLE};text-align:center">
  <a href="{{session_url}}" style="${EMAIL_BUTTON_STYLE}">Zum Live-Raum</a>
</p>
<p style="margin:0.5em 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all">Falls der Button nicht funktioniert:<br>{{session_url}}</p>
<p style="margin:1em 0 0;font-size:15px;line-height:1.55;color:#1e293b">Im Anhang nochmals die Kalenderdatei. Wir freuen uns auf dich!</p>`;

async function upsertHtmlTemplates() {
  const { error: inviteErr } = await admin.from("email_templates").upsert(
    {
      key: "live_session_invite",
      name: "Live mit Anni — Einladung",
      subject: "Einladung: {{session_title}} am {{session_date}}",
      body_text: `{{salutation}},

wir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!

{{session_title}}
{{session_date}}

Bitte melde dich zuerst mit deinen Mitgliedsdaten an. Über diesen Link siehst du alle Infos (Wann, Dauer, Ablauf), kannst zusagen oder absagen und optional schon eine Frage an Anni einreichen (nur eine):
{{session_url}}

Video und Chat öffnen sich erst am Tag des Live, sobald der Raum freigegeben ist. Wer zusagt, erhält einen Tag vorher noch eine Erinnerung.

Im Anhang: Kalenderdatei „Anni Perka Live Chat“ (Start 5 Minuten früher; Erinnerungen 1 Tag und 1 Stunde vorher).

Wir freuen uns auf dich!`,
      body_html: inviteHtml,
      description: "Einladung mit Infos, RSVP und Vorab-Frage. Login Pflicht. Anhang: .ics.",
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
      body_text: `{{salutation}},

kurze Erinnerung: morgen ist Live mit Anni!

{{session_title}}
{{session_date}}

Du hast zugesagt — schön, dass du dabei bist.

So kommst du rein:
1. Mit deinen Mitgliedsdaten in der Fanclub-App anmelden.
2. Zur Zeit (oder etwas früher) diesen Link öffnen:
{{session_url}}
3. Dann siehst du Annis Video und den Chat — vorher nur Infos und deine Vorab-Frage.

Im Anhang nochmals die Kalenderdatei.

Wir freuen uns auf dich!`,
      body_html: reminderHtml,
      description: "Erinnerung 1 Tag vorher an Zusagen + Anni. Login Pflicht.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (remErr) throw new Error(remErr.message);

  console.log("E-Mail-Vorlagen live_session_invite / reminder aktualisiert (HTML).");
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
  // Fiktiver Termin: nächster Samstag 19:00 Berlin, 45 Min.
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
  const sessionDate = formatLiveSessionDateLabel(session.starts_at);
  const sessionTime = formatLiveSessionTimeLabel(session.starts_at);
  const title = "Live-Chat mit Anni (Test)";

  console.log(`Fiktiver Termin: ${sessionDate}`);
  console.log(`Empfänger: ${TO}`);

  await sendOne(
    "Einladung Live-Chat",
    EMAIL_TEMPLATE_KEYS.liveSessionInvite,
    {
      ...person,
      session_title: title,
      session_date: sessionDate,
      session_url: sessionUrl,
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
    },
    session,
  );

  console.log("\nFertig. Beide Mails mit Layout + Signatur + .ics.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
