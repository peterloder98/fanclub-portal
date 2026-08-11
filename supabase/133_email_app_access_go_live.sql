-- Go-Live: lange Einladungsmail für App-Zugang (13.08. Registrierung, voll ab 16.08. 10:00)

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'app_access_setup',
  'App-Zugang einrichten',
  'Dein Zugang zur neuen Anni Perka Fanclub-App',
  $text${{salutation}},

endlich ist es so weit!

Mit viel Herzblut haben wir unsere neue offizielle Anni Perka Fanclub-App entwickelt. Heute kannst du deinen persönlichen Zugang einrichten und alles in Ruhe entdecken.

Mit der App möchten wir unseren Fanclub noch enger zusammenbringen und viele Dinge für alle Mitglieder einfacher machen.

Wichtig: Die Anmeldung ist ab sofort möglich. Die volle Nutzung (Schreiben, Chatten und Mitmachen) startet offiziell am 16.08.2026 um 10:00 Uhr. Bis dahin kannst du dich nach der Anmeldung gerne umschauen.

Zugang jetzt einrichten:
{{setup_url}}

Das erwartet dich in der Fanclub-App

Anni-Stars und Auszeichnungen
Sammle Anni-Stars für deine Aktivität und schalte besondere Erfolge frei.

Austausch mit anderen Fans
Tausche dich mit anderen Fanclub-Mitgliedern aus und bleibe mit der Community verbunden.

Gewinnspiele und exklusive Aktionen
Nimm direkt über die App an Gewinnspielen, Quizaktionen und besonderen Verlosungen teil.

Events und Termine
Finde Annis Termine sowie Fanclub-Treffen und wichtige Infos rund um den Fanclub.

Umfragen und Mitmachaktionen
Stimme bei Fanclub-Themen ab und bringe deine Meinung ein.

Fanshop und vieles mehr
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
Danach gelangst du in die Fanclub-App. Bis zum offiziellen Start am 16.08.2026 um 10:00 Uhr bitte nur umschauen — Schreiben und Chatten sind dann freigeschaltet.

Wir hoffen sehr, dass dir unsere neue Fanclub-App gefällt und sie den Austausch untereinander noch einfacher und schöner macht.

Du musst natürlich nicht alles auf einmal entdecken. Schau dich einfach in Ruhe um. In den nächsten Wochen werden wir dir nach und nach einzelne Funktionen und Möglichkeiten der App vorstellen.

Die App soll unsere WhatsApp-Gruppe nicht ersetzen, sondern sinnvoll ergänzen. Wichtige Informationen findest du künftig sowohl in der App als auch in der WhatsApp-Gruppe.

Wir wünschen dir ganz viel Freude beim Entdecken und freuen uns, dich in der neuen Fanclub-App begrüßen zu dürfen!

Jetzt meinen Zugang einrichten:
{{setup_url}}$text$,
  $html$<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">endlich ist es so weit!</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Mit viel Herzblut haben wir unsere neue offizielle Anni Perka Fanclub-App entwickelt. Heute kannst du deinen persönlichen Zugang einrichten und alles in Ruhe entdecken.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Mit der App möchten wir unseren Fanclub noch enger zusammenbringen und viele Dinge für alle Mitglieder einfacher machen.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b"><strong>Wichtig:</strong> Die Anmeldung ist ab sofort möglich. Die volle Nutzung (Schreiben, Chatten und Mitmachen) startet offiziell am <strong>16.08.2026 um 10:00 Uhr</strong>. Bis dahin kannst du dich nach der Anmeldung gerne umschauen.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{setup_url}}" style="display:inline-block;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zugang jetzt einrichten</a>
</p>
<p style="margin:0.5em 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all">Falls der Button nicht funktioniert, kannst du diesen Link kopieren und in deinem Browser öffnen:<br>{{setup_url}}</p>
<p style="margin:1.25em 0 0.6em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">Das erwartet dich in der Fanclub-App</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Anni-Stars und Auszeichnungen</strong><br>Sammle Anni-Stars für deine Aktivität und schalte besondere Erfolge frei.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Austausch mit anderen Fans</strong><br>Tausche dich mit anderen Fanclub-Mitgliedern aus und bleibe mit der Community verbunden.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Gewinnspiele und exklusive Aktionen</strong><br>Nimm direkt über die App an Gewinnspielen, Quizaktionen und besonderen Verlosungen teil.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Events und Termine</strong><br>Finde Annis Termine sowie Fanclub-Treffen und wichtige Infos rund um den Fanclub.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Umfragen und Mitmachaktionen</strong><br>Stimme bei Fanclub-Themen ab und bringe deine Meinung ein.</p>
<p style="margin:0 0 0.65em;font-size:15px;line-height:1.5;color:#1e293b"><strong>Fanshop und vieles mehr</strong><br>Entdecke Fanclub-Merchandise und viele weitere Funktionen rund um Anni und den Fanclub.</p>
<p style="margin:1.25em 0 0.6em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">So richtest du deinen Zugang ein</p>
<p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b"><strong>1. Einrichtungslink öffnen</strong><br>Klicke auf den Button „Zugang jetzt einrichten“.</p>
<p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b"><strong>2. Identität bestätigen und Passwort vergeben</strong><br>Bestätige deine Identität durch die Eingabe deines Geburtsdatums und lege dein persönliches Wunschpasswort fest.<br>Dein Benutzername ist deine E-Mail-Adresse.<br>Bitte speichere dir deine E-Mail-Adresse und dein Passwort gut ab.</p>
<p style="margin:0 0 0.85em;font-size:15px;line-height:1.55;color:#1e293b"><strong>3. Einloggen und App entdecken</strong><br>Nach dem Login kannst du optional fünf kurze Kennenlernfragen beantworten oder diesen Schritt überspringen.<br>Danach gelangst du in die Fanclub-App. Bis zum offiziellen Start am <strong>16.08.2026 um 10:00 Uhr</strong> bitte nur umschauen — Schreiben und Chatten sind dann freigeschaltet.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Wir hoffen sehr, dass dir unsere neue Fanclub-App gefällt und sie den Austausch untereinander noch einfacher und schöner macht.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Du musst natürlich nicht alles auf einmal entdecken. Schau dich einfach in Ruhe um. In den nächsten Wochen werden wir dir nach und nach einzelne Funktionen und Möglichkeiten der App vorstellen.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Die App soll unsere WhatsApp-Gruppe nicht ersetzen, sondern sinnvoll ergänzen. Wichtige Informationen findest du künftig sowohl in der App als auch in der WhatsApp-Gruppe.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Wir wünschen dir ganz viel Freude beim Entdecken und freuen uns, dich in der neuen Fanclub-App begrüßen zu dürfen!</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{setup_url}}" style="display:inline-block;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Jetzt meinen Zugang einrichten</a>
</p>$html$,
  'Massen-Einladung zur App-Registrierung (Go-Live 16.08.2026 10:00). Soft-Launch: anmelden und umschauen ab 13.08. Platzhalter: salutation, setup_url.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description,
  updated_at = now();
