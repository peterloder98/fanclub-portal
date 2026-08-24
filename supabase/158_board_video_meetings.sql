-- Vorstands-Videobesprechung mit Anni (Multi-Video, Agenda, max. 1 h)

create table if not exists public.board_video_meetings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  join_opens_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  livekit_room_name text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  invites_sent_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_video_meetings_time_order
    check (join_opens_at <= starts_at and starts_at < ends_at)
);

create index if not exists board_video_meetings_starts_at_idx
  on public.board_video_meetings (starts_at desc);

create index if not exists board_video_meetings_status_idx
  on public.board_video_meetings (status, starts_at desc);

create table if not exists public.board_video_meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.board_video_meetings (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  is_anni boolean not null default false,
  invite_token_hash text,
  video_display_name text,
  created_at timestamptz not null default now(),
  unique (meeting_id, email)
);

create index if not exists board_video_meeting_participants_meeting_idx
  on public.board_video_meeting_participants (meeting_id);

create index if not exists board_video_meeting_participants_user_idx
  on public.board_video_meeting_participants (user_id);

create unique index if not exists board_video_meeting_participants_token_hash_idx
  on public.board_video_meeting_participants (invite_token_hash)
  where invite_token_hash is not null;

create table if not exists public.board_video_meeting_agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.board_video_meetings (id) on delete cascade,
  body text not null,
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_by_name text not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_by_name text,
  checked_at timestamptz,
  checked_by uuid references public.profiles (id) on delete set null,
  checked_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_video_meeting_agenda_meeting_idx
  on public.board_video_meeting_agenda_items (meeting_id, sort_order, created_at);

alter table public.board_video_meetings enable row level security;
alter table public.board_video_meeting_participants enable row level security;
alter table public.board_video_meeting_agenda_items enable row level security;

drop policy if exists "board_video_meetings_admin_all" on public.board_video_meetings;
create policy "board_video_meetings_admin_all"
on public.board_video_meetings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "board_video_meetings_participant_select" on public.board_video_meetings;
create policy "board_video_meetings_participant_select"
on public.board_video_meetings
for select to authenticated
using (
  exists (
    select 1
    from public.board_video_meeting_participants p
    where p.meeting_id = board_video_meetings.id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "board_video_meeting_participants_admin_all" on public.board_video_meeting_participants;
create policy "board_video_meeting_participants_admin_all"
on public.board_video_meeting_participants
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "board_video_meeting_participants_self_select" on public.board_video_meeting_participants;
create policy "board_video_meeting_participants_self_select"
on public.board_video_meeting_participants
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "board_video_meeting_agenda_admin_all" on public.board_video_meeting_agenda_items;
create policy "board_video_meeting_agenda_admin_all"
on public.board_video_meeting_agenda_items
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "board_video_meeting_agenda_participant_select" on public.board_video_meeting_agenda_items;
create policy "board_video_meeting_agenda_participant_select"
on public.board_video_meeting_agenda_items
for select to authenticated
using (
  exists (
    select 1
    from public.board_video_meeting_participants p
    where p.meeting_id = board_video_meeting_agenda_items.meeting_id
      and p.user_id = auth.uid()
  )
);

alter publication supabase_realtime add table public.board_video_meeting_agenda_items;

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'board_video_meeting_invite',
  'Videobesprechung mit Anni — Einladung',
  'Einladung: {{meeting_title}} am {{meeting_date}}',
  E'{{salutation}},\n\nzur Videobesprechung mit Anni im Fanclub-Portal:\n\n{{meeting_title}}\n{{meeting_date}}\n\nDer Raum ist ab {{join_opens_time}} Uhr zum Eintragen der Agenda-Punkte offen. Video und Gespräch starten um {{meeting_time}} Uhr (max. 1 Stunde).\n\nDein Link:\n{{meeting_url}}\n\nBitte melde dich in der App an und öffne den Link. Agenda-Punkte könnt ihr vorab gemeinsam eintragen — jeder sieht, wer etwas hinzugefügt oder bearbeitet hat.\n\nWir freuen uns auf euch!',
  'Einladung an ausgewählte Vorstände. Platzhalter: salutation, first_name, meeting_title, meeting_date, meeting_time, join_opens_time, meeting_url.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'board_video_meeting_reminder',
  'Videobesprechung mit Anni — Erinnerung',
  'Erinnerung: {{meeting_title}} morgen um {{meeting_time}}',
  E'{{salutation}},\n\nkurze Erinnerung an die Videobesprechung mit Anni morgen:\n\n{{meeting_title}}\n{{meeting_date}}\n\nRaum ab {{join_opens_time}} Uhr · Video ab {{meeting_time}} Uhr (max. 1 Stunde)\n\n{{meeting_url}}\n\nAgenda-Punkte könnt ihr schon vorher eintragen.',
  'Erinnerung 1 Tag vorher. Platzhalter wie Einladung.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'board_video_meeting_anni_invite',
  'Videobesprechung — Link für Anni',
  'Dein Link: {{meeting_title}} am {{meeting_date}}',
  E'{{salutation}},\n\nhier ist dein persönlicher Link zur Videobesprechung mit dem Vorstand:\n\n{{meeting_title}}\n{{meeting_date}}\n\nRaum ab {{join_opens_time}} Uhr · Video ab {{meeting_time}} Uhr (max. 1 Stunde)\n\n{{meeting_url}}\n\nKein Login nötig — einfach Link öffnen. Ihr könnt vorab gemeinsam Agenda-Punkte eintragen.\n\nBis gleich!',
  'Persönlicher Gast-Link für Anni ohne Login. Platzhalter: salutation, meeting_title, meeting_date, meeting_time, join_opens_time, meeting_url.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();
