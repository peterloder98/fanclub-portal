-- Live-Erinnerung 1 Tag vorher: Mitglieder ohne Zusage/Absage (eigener Text)

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'live_session_reminder_no_rsvp',
  'Live mit Anni — Erinnerung (ohne RSVP)',
  'Morgen Live mit Anni — hast du die Einladung gesehen?',
  $txt$
{{salutation}},

kurze Erinnerung: morgen ist unser Live-Chat mit Anni!

{{session_title}}
{{session_date}}

Du hast auf die Einladung noch nicht reagiert — vielleicht ist sie untergegangen.
Wir würden uns freuen, wenn du kurz Bescheid gibst, ob du dabei bist (Zusage oder Absage).

In der Fanclub-App unter „Live“ siehst du alle Infos, kannst zusagen oder absagen
und optional schon eine Vorab-Frage an Anni stellen (pro Person eine Vorab-Frage).

Zur Live-Einladung:
{{session_url}}

Am Live-Tag öffnet sich der Raum {{join_opens_minutes}} Minuten vor Start zum Chatten.
Das Video beginnt erst, wenn Anni dazukommt — bitte sei deshalb rechtzeitig dabei,
wenn du mitmachen möchtest.

Termin im Kalender speichern:
{{calendar_url}}

Wir freuen uns, von dir zu hören!
$txt$,
  $html$
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">kurze Erinnerung: morgen ist unser Live-Chat mit Anni!</p>
<p style="margin:0 0 0.35em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">{{session_title}}</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b"><strong>{{session_date}}</strong></p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Du hast auf die Einladung noch nicht reagiert — vielleicht ist sie untergegangen.<br>Wir würden uns freuen, wenn du kurz Bescheid gibst, ob du dabei bist (Zusage oder Absage).</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">In der Fanclub-App unter „Live“ siehst du alle Infos, kannst zusagen oder absagen und optional schon eine Vorab-Frage an Anni stellen (pro Person eine Vorab-Frage).</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{session_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zur Live-Einladung</a>
</p>
<p style="margin:1em 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Am Live-Tag öffnet sich der Raum <strong>{{join_opens_minutes}} Minuten</strong> vor Start zum Chatten. Das Video beginnt erst, wenn Anni dazukommt — bitte sei deshalb rechtzeitig dabei, wenn du mitmachen möchtest.</p>
<p style="margin:0 0 0.5em;font-size:15px;line-height:1.55;color:#1e293b">Termin im Kalender speichern:</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{calendar_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">In den Kalender eintragen</a>
</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns, von dir zu hören!</p>
$html$,
  'Erinnerung 1 Tag vorher an Mitglieder ohne Zusage/Absage. Platzhalter u. a. join_opens_minutes, session_url, calendar_url. Login Pflicht.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description,
  updated_at = now();
