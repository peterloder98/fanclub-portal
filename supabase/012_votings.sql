-- Votings
-- Admins create; members see active + results; users vote once

create extension if not exists pgcrypto;

create table if not exists public.votings (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  allow_multiple boolean not null default false,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists votings_ends_at_idx on public.votings(ends_at, is_active);

create table if not exists public.voting_options (
  id uuid primary key default gen_random_uuid(),
  voting_id uuid not null references public.votings(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists voting_options_voting_id_idx on public.voting_options(voting_id, sort_order);

create table if not exists public.voting_votes (
  voting_id uuid not null references public.votings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_id uuid not null references public.voting_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (voting_id, user_id, option_id)
);

create table if not exists public.voting_comments (
  id uuid primary key default gen_random_uuid(),
  voting_id uuid not null references public.votings(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists voting_comments_voting_id_idx on public.voting_comments(voting_id, created_at);

alter table public.votings enable row level security;
alter table public.voting_options enable row level security;
alter table public.voting_votes enable row level security;
alter table public.voting_comments enable row level security;

-- Votings: read active for authenticated
drop policy if exists "votings_select_auth" on public.votings;
create policy "votings_select_auth"
on public.votings
for select to authenticated
using (is_active = true);

drop policy if exists "votings_insert_admin" on public.votings;
create policy "votings_insert_admin"
on public.votings
for insert to authenticated
with check (public.is_admin());

drop policy if exists "votings_update_admin" on public.votings;
create policy "votings_update_admin"
on public.votings
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "votings_delete_admin" on public.votings;
create policy "votings_delete_admin"
on public.votings
for delete to authenticated
using (public.is_admin());

-- Options
drop policy if exists "voting_options_select_auth" on public.voting_options;
create policy "voting_options_select_auth"
on public.voting_options
for select to authenticated
using (true);

drop policy if exists "voting_options_insert_admin" on public.voting_options;
create policy "voting_options_insert_admin"
on public.voting_options
for insert to authenticated
with check (public.is_admin());

-- Votes
drop policy if exists "voting_votes_select_auth" on public.voting_votes;
create policy "voting_votes_select_auth"
on public.voting_votes
for select to authenticated
using (true);

drop policy if exists "voting_votes_insert_own" on public.voting_votes;
create policy "voting_votes_insert_own"
on public.voting_votes
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "voting_votes_delete_own" on public.voting_votes;
create policy "voting_votes_delete_own"
on public.voting_votes
for delete to authenticated
using (user_id = auth.uid());

-- Comments
drop policy if exists "voting_comments_select_auth" on public.voting_comments;
create policy "voting_comments_select_auth"
on public.voting_comments
for select to authenticated
using (true);

drop policy if exists "voting_comments_insert_auth" on public.voting_comments;
create policy "voting_comments_insert_auth"
on public.voting_comments
for insert to authenticated
with check (author_id = auth.uid());

-- Realtime for live results (optional)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'voting_votes'
  ) then
    alter publication supabase_realtime add table public.voting_votes;
  end if;
end$$;

