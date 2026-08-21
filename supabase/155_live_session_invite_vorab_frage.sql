-- Mitglieder-Einladung Live: Vorab-Frage früh möglich + Raum öffnet X Min. vor Start zum Chatten

update public.email_templates
set
  body_text = $txt$
{{salutation}},

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

Wir freuen uns auf dich!
$txt$,
  body_html = $html$
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">wir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!</p>
<p style="margin:0 0 0.35em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">{{session_title}}</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{session_date}}</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Bitte melde dich zuerst mit deinen Mitgliedsdaten an. Über den Button siehst du alle Infos (Wann, Dauer, Ablauf) und kannst zusagen oder absagen.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Schon vor dem Live-Termin kannst du auf der Live-Seite eine Vorab-Frage an Anni einreichen — jede und jeder ist willkommen, früh eine Frage zu stellen (pro Person eine Vorab-Frage).</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{session_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zur Live-Einladung</a>
</p>
<p style="margin:1em 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Am Live-Tag öffnet sich der Raum <strong>{{join_opens_minutes}} Minuten</strong> vor Start für alle Mitglieder zum Chatten. Das Video beginnt erst, wenn Anni dazukommt — bitte sei deshalb rechtzeitig dabei.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Wer zusagt, erhält einen Tag vorher nochmals eine Erinnerung, dass es stattfindet.</p>
<p style="margin:0 0 0.5em;font-size:15px;line-height:1.55;color:#1e293b">Termin im Kalender speichern:</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{calendar_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">In den Kalender eintragen</a>
</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns auf dich!</p>
$html$,
  description = 'Einladung mit RSVP, Vorab-Frage (schon vor dem Termin), Raum öffnet join_opens_minutes vor Start zum Chatten, Video erst wenn Anni da ist. Kalender-Button. Login Pflicht. Platzhalter u. a. join_opens_minutes.',
  updated_at = now()
where key = 'live_session_invite';
