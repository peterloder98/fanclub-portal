-- App-Erinnerungen: Anmeldung (max. 4× alle 7 Tage) + Inaktivität (nach 30 Tagen)

alter table public.profiles
  add column if not exists app_signup_reminder_count smallint not null default 0;

alter table public.profiles
  add column if not exists app_signup_reminder_last_at timestamptz;

alter table public.profiles
  add column if not exists app_inactive_reminder_sent_at timestamptz;

comment on column public.profiles.app_signup_reminder_count is
  'Anzahl gesendeter App-Anmelde-Erinnerungen (max. 4), solange last_app_active_at null';

comment on column public.profiles.app_signup_reminder_last_at is
  'Zeitpunkt der letzten App-Anmelde-Erinnerung';

comment on column public.profiles.app_inactive_reminder_sent_at is
  'Zeitpunkt der letzten Inaktivitäts-Erinnerung (erneut erst nach erneuter Aktivität)';

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'app_signup_reminder',
  'Erinnerung: App-Anmeldung',
  'Erinnerung: Deine Fanclub App wartet auf dich',
  $text${{salutation}},

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
Bis bald in der App!$text$,
  $html$<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">kurze Erinnerung: Dein Zugang zur Anni Perka Fanclub App ist bereit — wir freuen uns, wenn du dich anmeldest und mitmachst.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">In der App findest du unter anderem:</p>
<ul style="margin:0 0 1.25em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li>Neuigkeiten und Beiträge aus dem Fanclub</li>
  <li>Events und Treffen zum Mitmachen</li>
  <li>Umfragen, Gewinnspiele und Anni-Stars</li>
</ul>
<p style="margin:0 0 0.5em;font-size:15px;line-height:1.55;color:#1e293b"><strong>So richtest du deinen Zugang ein:</strong></p>
<ol style="margin:0 0 1.25em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li style="margin-bottom:0.75em"><strong>Bitte den folgenden Button klicken:</strong><br>
    <a href="{{setup_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zugang hier einrichten</a>
  </li>
  <li><strong>Bestätige deine Identität</strong> mit deinem Geburtsdatum und vergebe dein Wunschpasswort. Dein Benutzername ist deine E-Mail-Adresse.</li>
</ol>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns auf dich!<br>Bis bald in der App!</p>$html$,
  'Erinnerung an Anmeldung/Einrichtung der App. Max. 4× im Abstand von 7 Tagen, solange die App noch nie genutzt wurde. Platzhalter: salutation, first_name, setup_url. Signatur wird automatisch angehängt.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description,
  updated_at = now();

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'app_inactive_reminder',
  'Erinnerung: Lange nicht aktiv',
  'Wir vermissen dich in der Fanclub App',
  $text${{salutation}},

wir haben dich eine Weile nicht mehr in der Anni Perka Fanclub App gesehen und würden uns freuen, wenn du wieder vorbeischaust.

In der Zwischenzeit ist sicher einiges passiert — neue Beiträge, Events, Umfragen und Gewinnspiele warten auf dich.

Einfach wieder einloggen und mitmachen:
{{app_url}}

Wir freuen uns auf dich!
Bis bald in der App!$text$,
  $html$<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">wir haben dich eine Weile nicht mehr in der Anni Perka Fanclub App gesehen und würden uns freuen, wenn du wieder vorbeischaust.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">In der Zwischenzeit ist sicher einiges passiert — neue Beiträge, Events, Umfragen und Gewinnspiele warten auf dich.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Einfach wieder einloggen und mitmachen:</p>
<p style="margin:0 0 1.25em;font-size:15px;line-height:1.55;color:#1e293b">
  <a href="{{app_url}}" style="display:inline-block;margin-top:4px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zur Fanclub App</a>
</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns auf dich!<br>Bis bald in der App!</p>$html$,
  'Erinnerung nach ca. 30 Tagen ohne App-Aktivität. Einmal pro Inaktivitätsphase. Platzhalter: salutation, first_name, app_url. Signatur wird automatisch angehängt.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description,
  updated_at = now();
