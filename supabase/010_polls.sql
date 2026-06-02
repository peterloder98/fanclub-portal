-- Polls / Umfragen
-- Run after 004_posts_comments_likes.sql (and 003 for is_admin)

create extension if not exists pgcrypto;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  allow_multiple boolean not null default false,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists polls_ends_at_idx on public.polls(ends_at, is_active);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists poll_options_poll_id_idx on public.poll_options(poll_id, sort_order);

create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id, option_id)
);

-- Single-choice: app deletes existing votes for (poll_id, user_id) before insert

create table if not exists public.poll_comments (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists poll_comments_poll_id_idx on public.poll_comments(poll_id, created_at);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.poll_comments enable row level security;

-- Polls: read active (not ended) for authenticated
drop policy if exists "polls_select_auth" on public.polls;
create policy "polls_select_auth"
on public.polls
for select to authenticated
using (is_active = true);

drop policy if exists "polls_insert_admin" on public.polls;
create policy "polls_insert_admin"
on public.polls
for insert to authenticated
with check (public.is_admin());

drop policy if exists "polls_update_admin" on public.polls;
create policy "polls_update_admin"
on public.polls
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "polls_delete_admin" on public.polls;
create policy "polls_delete_admin"
on public.polls
for delete to authenticated
using (public.is_admin());

-- Options
drop policy if exists "poll_options_select_auth" on public.poll_options;
create policy "poll_options_select_auth"
on public.poll_options
for select to authenticated
using (true);

drop policy if exists "poll_options_insert_admin" on public.poll_options;
create policy "poll_options_insert_admin"
on public.poll_options
for insert to authenticated
with check (public.is_admin());

-- Votes: read all (for results), insert own
drop policy if exists "poll_votes_select_auth" on public.poll_votes;
create policy "poll_votes_select_auth"
on public.poll_votes
for select to authenticated
using (true);

drop policy if exists "poll_votes_insert_own" on public.poll_votes;
create policy "poll_votes_insert_own"
on public.poll_votes
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "poll_votes_delete_own" on public.poll_votes;
create policy "poll_votes_delete_own"
on public.poll_votes
for delete to authenticated
using (user_id = auth.uid());

-- Comments
drop policy if exists "poll_comments_select_auth" on public.poll_comments;
create policy "poll_comments_select_auth"
on public.poll_comments
for select to authenticated
using (true);

drop policy if exists "poll_comments_insert_auth" on public.poll_comments;
create policy "poll_comments_insert_auth"
on public.poll_comments
for insert to authenticated
with check (author_id = auth.uid());

-- Enable realtime for live results (optional, polls votes)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'poll_votes'
  ) then
    alter publication supabase_realtime add table public.poll_votes;
  end if;
end$$;
