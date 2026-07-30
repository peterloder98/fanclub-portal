-- Erinnerungen an offene Mitglieds-Einladungen (7 Tage erste, danach alle 14 Tage)

alter table public.membership_referral_sends
  add column if not exists last_reminder_at timestamptz;

alter table public.membership_referral_sends
  add column if not exists reminder_count integer not null default 0;

comment on column public.membership_referral_sends.last_reminder_at is
  'Zeitpunkt der letzten Erinnerungs-Mail an diese Einladung';
comment on column public.membership_referral_sends.reminder_count is
  'Anzahl gesendeter Erinnerungen zu dieser Einladung';

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'membership_referral_reminder',
  'Erinnerung: Mitgliedseinladung',
  'Erinnerung: {{sender_name}} hat dich in den Anni Perka Fanclub eingeladen',
  $text$Hallo {{recipient_first_name}},

vor kurzem habe ich dich eingeladen, dem **Anni Perka Fanclub** beizutreten — und ich wollte kurz nachfragen, ob du die Einladung schon gesehen hast.

Falls noch nicht: Hier kannst du dich ganz einfach digital anmelden:

**{{application_link}}**

Der Jahresbeitrag beträgt **15 €**. Die Anmeldung geht komplett online — ohne Ausdrucken oder Einscannen.

Ich würde mich freuen, dich bald im Fanclub begrüßen zu dürfen!

Liebe Grüße

{{sender_name}}$text$,
  $html$<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Hallo {{recipient_first_name}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">vor kurzem habe ich dich eingeladen, dem <strong>Anni Perka Fanclub</strong> beizutreten — und ich wollte kurz nachfragen, ob du die Einladung schon gesehen hast.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Falls noch nicht: Hier kannst du dich ganz einfach digital anmelden:</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b"><a href="{{application_link}}">{{application_link}}</a></p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Der Jahresbeitrag beträgt <strong>15 €</strong>. Die Anmeldung geht komplett online — ohne Ausdrucken oder Einscannen.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Ich würde mich freuen, dich bald im Fanclub begrüßen zu dürfen!</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Liebe Grüße<br/><br/>{{sender_name}}</p>$html$,
  'Erinnerung an eine noch offene Mitgliedseinladung (vom Werber ausgelöst)'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description,
  updated_at = now();
