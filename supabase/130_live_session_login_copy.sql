-- Live-E-Mails: Login-Hinweis klarer formulieren

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'live_session_invite',
  'Live mit Anni — Einladung',
  'Einladung: {{session_title}} am {{session_date}}',
  E'{{salutation}},\n\nwir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!\n\n{{session_title}}\n{{session_date}}\n\nBitte melde dich zuerst mit deinen Mitgliedsdaten in der Fanclub-App an. Danach kannst du über diesen Link zusagen oder absagen:\n{{session_url}}\n\nWer zusagt, erhält einen Tag vorher noch eine kurze Erinnerung — mit allen Infos, wie du reinkommst.\n\nIm Anhang findest du eine Kalenderdatei (.ics) mit dem Betreff „Anni Perka Live Chat“. Der Start im Kalender liegt 5 Minuten vor Beginn, damit du rechtzeitig da bist. Wenn du den Termin speicherst, erinnern dich viele Kalender-Apps automatisch 1 Tag und 1 Stunde vorher.\n\nWir freuen uns auf dich!',
  'Geht an alle aktiven Mitglieder plus Anni. Ohne Login kein Zugang. Anhang: Kalender (.ics). Platzhalter: salutation, first_name, session_title, session_date, session_url.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'live_session_reminder',
  'Live mit Anni — Erinnerung',
  'Erinnerung: {{session_title}} morgen um {{session_time}}',
  E'{{salutation}},\n\nkurze Erinnerung: morgen ist Live mit Anni!\n\n{{session_title}}\n{{session_date}}\n\nDu hast zugesagt — schön, dass du dabei bist.\n\nSo kommst du rein:\n1. Mit deinen Mitgliedsdaten in der Fanclub-App anmelden (der Link allein reicht nicht).\n2. Zur angegebenen Zeit (oder etwas früher) diesen Link öffnen:\n{{session_url}}\n3. Annis Video anschauen, im Chat mitreden und Fragen stellen.\n\nIm Anhang liegt nochmals die Kalenderdatei („Anni Perka Live Chat“, Start 5 Minuten früher). Erinnerungen im Kalender: 1 Tag und 1 Stunde vorher.\n\nWir freuen uns auf dich!',
  'Geht 1 Tag vor der Session an Zusagen und immer an Anni. Login Pflicht. Anhang: Kalender (.ics).'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();
