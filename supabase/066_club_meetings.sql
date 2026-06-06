-- Fanclub-Treffen (eigene Termine, unabhängig von Artistflow-Events)

create table if not exists public.club_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  body text,
  schedule text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  address text,
  postal_code text,
  city text,
  country text default 'Deutschland',
  travel_info jsonb not null default '{}'::jsonb,
  cost_cents integer,
  cost_label text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled', 'completed')),
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists club_meetings_starts_at_idx
  on public.club_meetings (starts_at);

create index if not exists club_meetings_status_starts_idx
  on public.club_meetings (status, starts_at desc);

drop trigger if exists club_meetings_set_updated_at on public.club_meetings;
create trigger club_meetings_set_updated_at
before update on public.club_meetings
for each row execute function public.set_updated_at();

create table if not exists public.club_meeting_participations (
  meeting_id uuid not null references public.club_meetings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create index if not exists club_meeting_participations_user_idx
  on public.club_meeting_participations (user_id);

-- Fotos & Nachberichte (Phase 2 — Tabelle schon anlegen)
create table if not exists public.club_meeting_media (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.club_meetings (id) on delete cascade,
  kind text not null check (kind in ('photo', 'report')),
  storage_path text,
  caption text,
  report_body text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists club_meeting_media_meeting_idx
  on public.club_meeting_media (meeting_id, created_at desc);

alter table public.club_meetings enable row level security;
alter table public.club_meeting_participations enable row level security;
alter table public.club_meeting_media enable row level security;

drop policy if exists "club_meetings_select_published" on public.club_meetings;
create policy "club_meetings_select_published"
on public.club_meetings for select to authenticated
using (status = 'published' or public.is_admin());

drop policy if exists "club_meetings_admin_all" on public.club_meetings;
create policy "club_meetings_admin_all"
on public.club_meetings for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "club_meeting_participations_select" on public.club_meeting_participations;
create policy "club_meeting_participations_select"
on public.club_meeting_participations for select to authenticated
using (true);

drop policy if exists "club_meeting_participations_own" on public.club_meeting_participations;
create policy "club_meeting_participations_own"
on public.club_meeting_participations for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "club_meeting_participations_delete_own" on public.club_meeting_participations;
create policy "club_meeting_participations_delete_own"
on public.club_meeting_participations for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "club_meeting_media_select_published" on public.club_meeting_media;
create policy "club_meeting_media_select_published"
on public.club_meeting_media for select to authenticated
using (
  exists (
    select 1 from public.club_meetings m
    where m.id = meeting_id
      and (m.status in ('published', 'completed') or public.is_admin())
  )
);

drop policy if exists "club_meeting_media_admin_write" on public.club_meeting_media;
create policy "club_meeting_media_admin_write"
on public.club_meeting_media for all to authenticated
using (public.is_admin())
with check (public.is_admin());
