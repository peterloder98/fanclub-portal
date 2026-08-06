-- Live-Sessions: Anni Video + Session-Chat + Fragen-Warteschlange

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  join_opens_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  host_token_hash text not null,
  livekit_room_name text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_sessions_time_order check (
    join_opens_at <= starts_at and starts_at < ends_at
  ),
  constraint live_sessions_title_len check (char_length(trim(title)) between 1 and 120),
  constraint live_sessions_slug_len check (char_length(trim(slug)) between 2 and 80)
);

create index if not exists live_sessions_status_join_idx
  on public.live_sessions (status, join_opens_at, starts_at);

create index if not exists live_sessions_host_token_hash_idx
  on public.live_sessions (host_token_hash);

create table if not exists public.live_session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint live_session_messages_body_len
    check (char_length(trim(body)) between 1 and 1000)
);

create index if not exists live_session_messages_session_created_idx
  on public.live_session_messages (session_id, created_at asc);

create table if not exists public.live_session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismissed_by uuid references public.profiles (id) on delete set null,
  constraint live_session_questions_body_len
    check (char_length(trim(body)) between 1 and 500)
);

create index if not exists live_session_questions_open_idx
  on public.live_session_questions (session_id, created_at asc)
  where dismissed_at is null;

alter table public.live_sessions enable row level security;
alter table public.live_session_messages enable row level security;
alter table public.live_session_questions enable row level security;

-- Sessions: Mitglieder lesen (für Join-Fenster / Live); nur Admin schreibt via Service Role / Admin-Client
drop policy if exists "live_sessions_select_auth" on public.live_sessions;
create policy "live_sessions_select_auth"
on public.live_sessions
for select to authenticated
using (true);

drop policy if exists "live_sessions_admin_all" on public.live_sessions;
create policy "live_sessions_admin_all"
on public.live_sessions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Chat: lesen/schreiben wenn authentifiziert (Join-Fenster prüft die App)
drop policy if exists "live_session_messages_select_auth" on public.live_session_messages;
create policy "live_session_messages_select_auth"
on public.live_session_messages
for select to authenticated
using (true);

drop policy if exists "live_session_messages_insert_own" on public.live_session_messages;
create policy "live_session_messages_insert_own"
on public.live_session_messages
for insert to authenticated
with check (author_id = auth.uid());

drop policy if exists "live_session_messages_delete_own_or_admin" on public.live_session_messages;
create policy "live_session_messages_delete_own_or_admin"
on public.live_session_messages
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

-- Fragen
drop policy if exists "live_session_questions_select_auth" on public.live_session_questions;
create policy "live_session_questions_select_auth"
on public.live_session_questions
for select to authenticated
using (true);

drop policy if exists "live_session_questions_insert_own" on public.live_session_questions;
create policy "live_session_questions_insert_own"
on public.live_session_questions
for insert to authenticated
with check (author_id = auth.uid());

drop policy if exists "live_session_questions_update_admin" on public.live_session_questions;
create policy "live_session_questions_update_admin"
on public.live_session_questions
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_session_messages'
  ) then
    alter publication supabase_realtime add table public.live_session_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_session_questions'
  ) then
    alter publication supabase_realtime add table public.live_session_questions;
  end if;
end $$;
