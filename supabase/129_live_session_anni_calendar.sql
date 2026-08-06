-- Live-Session: Anni-Erinnerung-Flag + E-Mail-Texte mit Kalender-Hinweis

alter table public.live_sessions
  add column if not exists anni_reminder_sent_at timestamptz;

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'live_session_invite',
  'Live mit Anni — Einladung',
  'Einladung: {{session_title}} am {{session_date}}',
  E'{{salutation}},\n\nwir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!\n\n{{session_title}}\n{{session_date}}\n\nBitte sag uns kurz Bescheid, ob du dabei bist:\n{{session_url}}\n\nDort kannst du zusagen oder absagen. Wer zusagt, erhält einen Tag vorher noch eine kurze Erinnerung — mit allen Infos, wie du reinkommst.\n\nIm Anhang findest du eine Kalenderdatei (.ics) mit dem Betreff „Anni Perka Live Chat“. Der Start im Kalender liegt 5 Minuten vor Beginn, damit du rechtzeitig da bist. Wenn du den Termin speicherst, erinnern dich viele Kalender-Apps automatisch 1 Tag und 1 Stunde vorher.\n\nWir freuen uns auf dich!',
  'Geht an alle aktiven Mitglieder plus Anni, sobald eine Live-Session angelegt wird. Anhang: Kalender (.ics). Platzhalter: salutation, first_name, session_title, session_date, session_url. Signatur wird automatisch angehängt.'
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
  E'{{salutation}},\n\nkurze Erinnerung: morgen ist Live mit Anni!\n\n{{session_title}}\n{{session_date}}\n\nDu hast zugesagt — schön, dass du dabei bist.\n\nSo kommst du rein:\n1. Zur angegebenen Zeit (oder etwas früher) in der Fanclub-App anmelden.\n2. Im Menü „Live“ öffnen oder diesen Link antippen:\n{{session_url}}\n3. Annis Video anschauen, im Chat mitreden und Fragen stellen.\n\nIm Anhang liegt nochmals die Kalenderdatei („Anni Perka Live Chat“, Start 5 Minuten früher). Erinnerungen im Kalender: 1 Tag und 1 Stunde vorher.\n\nWir freuen uns auf dich!',
  'Geht 1 Tag vor der Session an Zusagen und immer an Anni. Anhang: Kalender (.ics). Platzhalter: salutation, first_name, session_title, session_date, session_time, session_url. Signatur wird automatisch angehängt.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();
