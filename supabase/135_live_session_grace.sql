-- Nach Session-Ende (geplant oder vorzeitig): 10 Min. Nachlauf für Chat, dann sofort löschen.

alter table public.live_sessions
  add column if not exists grace_ends_at timestamptz;

comment on column public.live_sessions.grace_ends_at is
  'Nach status=ended: Chat bleibt bis zu diesem Zeitpunkt offen, danach wird die Session gelöscht.';

create index if not exists live_sessions_grace_ends_at_idx
  on public.live_sessions (grace_ends_at)
  where grace_ends_at is not null;

-- Gestaltete HTML-Vorlagen für Live-Einladung und Erinnerung
update public.email_templates
set
  body_html = $html$
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">wir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!</p>
<p style="margin:0 0 0.35em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">{{session_title}}</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{session_date}}</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Bitte melde dich zuerst mit deinen Mitgliedsdaten an. Über den Button siehst du alle Infos (Wann, Dauer, Ablauf), kannst zusagen oder absagen und optional schon eine Frage an Anni einreichen (nur eine Vorab-Frage).</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{session_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zur Live-Einladung</a>
</p>
<p style="margin:0.5em 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all">Falls der Button nicht funktioniert:<br>{{session_url}}</p>
<p style="margin:1em 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Video und Chat öffnen sich erst am Tag des Live, sobald der Raum freigegeben ist. Wer zusagt, erhält einen Tag vorher noch eine Erinnerung.</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Im Anhang: Kalenderdatei „Anni Perka Live Chat“ (Start 5 Minuten früher; Erinnerungen 1 Tag und 1 Stunde vorher).</p>
<p style="margin:0;font-size:15px;line-height:1.55;color:#1e293b">Wir freuen uns auf dich!</p>
$html$,
  updated_at = now()
where key = 'live_session_invite';

update public.email_templates
set
  body_html = $html$
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">kurze Erinnerung: morgen ist Live mit Anni!</p>
<p style="margin:0 0 0.35em;font-size:17px;line-height:1.35;color:#0b1f3a;font-weight:700">{{session_title}}</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{session_date}}</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Du hast zugesagt — schön, dass du dabei bist.</p>
<p style="margin:0 0 0.6em;font-size:15px;line-height:1.55;color:#1e293b"><strong>So kommst du rein:</strong></p>
<ol style="margin:0 0 1em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li style="margin-bottom:0.5em">Mit deinen Mitgliedsdaten in der Fanclub-App anmelden.</li>
  <li style="margin-bottom:0.5em">Zur Zeit (oder etwas früher) diesen Link öffnen.</li>
  <li>Dann siehst du Annis Video und den Chat — vorher nur Infos und deine Vorab-Frage.</li>
</ol>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b;text-align:center">
  <a href="{{session_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zum Live-Raum</a>
</p>
<p style="margin:0.5em 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all">Falls der Button nicht funktioniert:<br>{{session_url}}</p>
<p style="margin:1em 0 0;font-size:15px;line-height:1.55;color:#1e293b">Im Anhang nochmals die Kalenderdatei. Wir freuen uns auf dich!</p>
$html$,
  updated_at = now()
where key = 'live_session_reminder';
