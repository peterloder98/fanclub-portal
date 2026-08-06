-- Live-Session: RSVP + E-Mail-Vorlagen (Einladung & Erinnerung)

create table if not exists public.live_session_rsvps (
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('accepted', 'declined')),
  responded_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists live_session_rsvps_session_status_idx
  on public.live_session_rsvps (session_id, status);

create index if not exists live_session_rsvps_user_idx
  on public.live_session_rsvps (user_id, responded_at desc);

alter table public.live_session_rsvps enable row level security;

drop policy if exists "live_session_rsvps_select_auth" on public.live_session_rsvps;
create policy "live_session_rsvps_select_auth"
on public.live_session_rsvps
for select to authenticated
using (true);

drop policy if exists "live_session_rsvps_upsert_own" on public.live_session_rsvps;
create policy "live_session_rsvps_upsert_own"
on public.live_session_rsvps
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "live_session_rsvps_update_own" on public.live_session_rsvps;
create policy "live_session_rsvps_update_own"
on public.live_session_rsvps
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "live_session_rsvps_delete_own" on public.live_session_rsvps;
create policy "live_session_rsvps_delete_own"
on public.live_session_rsvps
for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

alter table public.live_sessions
  add column if not exists invites_sent_at timestamptz;

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'live_session_invite',
  'Live mit Anni — Einladung',
  'Einladung: {{session_title}} am {{session_date}}',
  E'{{salutation}},\n\nwir laden dich herzlich zu einer Live-Session mit Anni in der Fanclub-App ein!\n\n{{session_title}}\n{{session_date}}\n\nBitte sag uns kurz Bescheid, ob du dabei bist:\n{{session_url}}\n\nDort kannst du zusagen oder absagen. Wer zusagt, erhält einen Tag vorher noch eine kurze Erinnerung — mit allen Infos, wie du reinkommst.\n\nWir freuen uns auf dich!',
  'Geht an alle aktiven Mitglieder, sobald eine Live-Session angelegt wird. Platzhalter: salutation, first_name, session_title, session_date, session_url. Signatur wird automatisch angehängt.'
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
  E'{{salutation}},\n\nkurze Erinnerung: morgen ist Live mit Anni!\n\n{{session_title}}\n{{session_date}}\n\nDu hast zugesagt — schön, dass du dabei bist.\n\nSo kommst du rein:\n1. Zur angegebenen Zeit (oder etwas früher) in der Fanclub-App anmelden.\n2. Im Menü „Live“ öffnen oder diesen Link antippen:\n{{session_url}}\n3. Annis Video anschauen, im Chat mitreden und Fragen stellen.\n\nWir freuen uns auf dich!',
  'Geht 1 Tag vor der Session nur an Mitglieder mit Zusage. Platzhalter: salutation, first_name, session_title, session_date, session_time, session_url. Signatur wird automatisch angehängt.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();
