-- Live-Mails: ohne Fallback-URL, Kalender-Button statt Anhang-Text

update public.email_templates
set
  body_text = $txt$
{{salutation}},

wir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!

{{session_title}}
{{session_date}}

Bitte melde dich zuerst mit deinen Mitgliedsdaten an. Über den Button siehst du alle Infos (Wann, Dauer, Ablauf), kannst zusagen oder absagen und optional schon eine Frage an Anni einreichen (nur eine Vorab-Frage).

Zur Live-Einladung:
{{session_url}}

Das Live-Video und der Chat öffnen sich erst am Tag des Live-Chat mit Anni, sobald der Raum freigegeben ist.
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
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Bitte melde dich zuerst mit deinen Mitgliedsdaten an. Über den Button siehst du alle Infos (Wann, Dauer, Ablauf), kannst zusagen oder absagen und optional schon eine Frage an Anni einreichen (nur eine Vorab-Frage).</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{session_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zur Live-Einladung</a>
</p>
<p style="margin:1em 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Das Live-Video und der Chat öffnen sich erst am Tag des Live-Chat mit Anni, sobald der Raum freigegeben ist.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Wer zusagt, erhält einen Tag vorher nochmals eine Erinnerung, dass es stattfindet.</p>
<p style="margin:0 0 0.5em;font-size:15px;line-height:1.55;color:#1e293b">Termin im Kalender speichern:</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{calendar_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">In den Kalender eintragen</a>
</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns auf dich!</p>
$html$,
  description = 'Einladung mit RSVP, Vorab-Frage und Kalender-Button. Login Pflicht.',
  updated_at = now()
where key = 'live_session_invite';

update public.email_templates
set
  body_text = $txt$
{{salutation}},

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

Wir freuen uns auf dich!
$txt$,
  body_html = $html$
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">kurze Erinnerung: morgen haben wir unseren Live-Chat mit Anni!</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b"><strong>{{session_date}}</strong></p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Da du zugesagt hast, hoffen wir du bist morgen rechtzeitig dabei.<br>Schön, dass du dabei bist :-)</p>
<p style="margin:0 0 0.6em;font-size:15px;line-height:1.55;color:#1e293b"><strong>So kommst du rein:</strong></p>
<ol style="margin:0 0 1em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li style="margin-bottom:0.5em">Mit deinen Mitgliedsdaten in der Fanclub-App anmelden.</li>
  <li style="margin-bottom:0.5em">Zum festgelegten Zeit (oder am besten ein paar Minuten früher) den nachfolgenden Link öffnen (oder in der App im Menü auf Live-Chat klicken).</li>
  <li>Dann siehst du Annis Live-Video und den Chat — bis zum Start gibt es nur Infos und deine Vorab-Frage.</li>
</ol>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{session_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zum Live-Raum</a>
</p>
<p style="margin:0 0 0.5em;font-size:15px;line-height:1.55;color:#1e293b">Termin im Kalender speichern:</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{calendar_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">In den Kalender eintragen</a>
</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns auf dich!</p>
$html$,
  description = 'Erinnerung 1 Tag vorher an Zusagen + Anni. Kalender-Button. Login Pflicht.',
  updated_at = now()
where key = 'live_session_reminder';
