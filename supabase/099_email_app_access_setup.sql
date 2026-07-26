-- E-Mail-Vorlage: App-Zugang einrichten (Vorstand / Mitglieder)

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'app_access_setup',
  'App-Zugang einrichten',
  'Dein Zugang zur Anni Perka Fanclub App',
  $text$Liebe/r {{first_name}},

wir freuen uns, dass du im Anni Perka Fanclub dabei bist und senden dir heute den Link zum Einrichten deines Zugangs zur neuen Fanclub App.

1. Bitte den folgenden Link klicken:
{{setup_url}}

2. Bestätige deine Identität durch Eingabe deines Geburtsdatums und vergebe dein Wunschpasswort. Dein Benutzername ist deine E-Mail-Adresse. Bitte speichere dir beides unbedingt ab!

3. Die neuen Features in der App austesten und mit deinen Fanclub-Freunden chatten oder austauschen!

Viel Spaß und bis ganz bald.$text$,
  $html$<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Liebe/r <strong>{{first_name}}</strong>,</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">wir freuen uns, dass du im Anni Perka Fanclub dabei bist und senden dir heute den Link zum Einrichten deines Zugangs zur neuen Fanclub App.</p>
<ol style="margin:0 0 1.25em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li style="margin-bottom:0.75em"><strong>Bitte den folgenden Link klicken:</strong><br>
    <a href="{{setup_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zugang jetzt einrichten</a>
    <div style="margin-top:8px;font-size:12px;color:#64748b;word-break:break-all">{{setup_url}}</div>
  </li>
  <li style="margin-bottom:0.75em"><strong>Bestätige deine Identität</strong> durch Eingabe deines Geburtsdatums und vergebe dein Wunschpasswort. Dein Benutzername ist deine E-Mail-Adresse. Bitte speichere dir beides unbedingt ab!</li>
  <li><strong>Die neuen Features in der App austesten</strong> und mit deinen Fanclub-Freunden chatten oder austauschen!</li>
</ol>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Viel Spaß und bis ganz bald.</p>$html$,
  'Einladungsmail mit Link zum Einrichten von Geburtsdatum-Bestätigung und Passwort'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description;
