-- Info-Mail, wenn Admin die Login-E-Mail eines Mitglieds ändert

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'member_login_email_changed',
  'Login-E-Mail geändert',
  'Deine Login-E-Mail in der Fanclub-App wurde geändert',
  $text${{salutation}},

wir möchten dich kurz informieren: Die hinterlegte E-Mail-Adresse für deinen Fanclub-App-Zugang wurde geändert.

Neue Login-Adresse (Benutzername):
{{new_email}}

Dein Passwort bleibt unverändert.
Bitte speichere dir die neue E-Mail-Adresse gut ab und verwende sie ab sofort zum Anmelden.

Falls du diese Änderung nicht erwartet hast, melde dich bitte beim Vorstand.
$text$,
  $html$
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">wir möchten dich kurz informieren: Die hinterlegte E-Mail-Adresse für deinen Fanclub-App-Zugang wurde geändert.</p>
<p style="margin:0 0 0.5em;font-size:15px;line-height:1.55;color:#1e293b"><strong>Neue Login-Adresse (Benutzername):</strong></p>
<p style="margin:0 0 1em;font-size:16px;line-height:1.5;color:#0b1f3a;font-weight:700">{{new_email}}</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Dein Passwort bleibt unverändert.<br>Bitte speichere dir die neue E-Mail-Adresse gut ab und verwende sie ab sofort zum Anmelden.</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b">Falls du diese Änderung nicht erwartet hast, melde dich bitte beim Vorstand.</p>
$html$,
  'Benachrichtigung nach Admin-Änderung der Login-E-Mail. Platzhalter: salutation, new_email, old_email, first_name.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description,
  updated_at = now();
