-- Eine offene Frage pro Mitglied und Session + klarere Einladungs-Texte

-- Doppelte offene Fragen bereinigen (älteste behalten)
delete from public.live_session_questions q
using public.live_session_questions older
where q.dismissed_at is null
  and older.dismissed_at is null
  and q.session_id = older.session_id
  and q.author_id = older.author_id
  and q.created_at > older.created_at;

create unique index if not exists live_session_questions_one_open_per_user
  on public.live_session_questions (session_id, author_id)
  where dismissed_at is null;

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'live_session_invite',
  'Live mit Anni — Einladung',
  'Einladung: {{session_title}} am {{session_date}}',
  E'{{salutation}},\n\nwir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!\n\n{{session_title}}\n{{session_date}}\n\nBitte melde dich zuerst mit deinen Mitgliedsdaten an. Über diesen Link siehst du alle Infos (Wann, Dauer, Ablauf), kannst zusagen oder absagen und optional schon eine Frage an Anni einreichen (nur eine):\n{{session_url}}\n\nVideo und Chat öffnen sich erst am Tag des Live, sobald der Raum freigegeben ist. Wer zusagt, erhält einen Tag vorher noch eine Erinnerung.\n\nIm Anhang: Kalenderdatei „Anni Perka Live Chat“ (Start 5 Minuten früher; Erinnerungen 1 Tag und 1 Stunde vorher).\n\nWir freuen uns auf dich!',
  'Einladung mit Infos, RSVP und Vorab-Frage. Login Pflicht. Anhang: .ics.'
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
  E'{{salutation}},\n\nkurze Erinnerung: morgen ist Live mit Anni!\n\n{{session_title}}\n{{session_date}}\n\nDu hast zugesagt — schön, dass du dabei bist.\n\nSo kommst du rein:\n1. Mit deinen Mitgliedsdaten in der Fanclub-App anmelden.\n2. Zur Zeit (oder etwas früher) diesen Link öffnen:\n{{session_url}}\n3. Dann siehst du Annis Video und den Chat — vorher nur Infos und deine Vorab-Frage.\n\nIm Anhang nochmals die Kalenderdatei.\n\nWir freuen uns auf dich!',
  'Erinnerung 1 Tag vorher an Zusagen + Anni. Login Pflicht.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();
