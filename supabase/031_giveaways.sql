-- Gewinnspiele (Giveaways)
-- Run after 010_polls.sql, 005_points.sql, 003_rls

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'giveaway_entry_mode') then
    create type public.giveaway_entry_mode as enum ('simple', 'quiz');
  end if;
  if not exists (select 1 from pg_type where typname = 'giveaway_status') then
    create type public.giveaway_status as enum ('active', 'ended', 'drawn');
  end if;
end$$;

create table if not exists public.giveaways (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  entry_mode public.giveaway_entry_mode not null default 'simple',
  ends_at timestamptz not null,
  status public.giveaway_status not null default 'active',
  is_active boolean not null default true,
  admin_ended_notified_at timestamptz,
  winners_drawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists giveaways_ends_at_idx on public.giveaways(ends_at, status);

create table if not exists public.giveaway_prizes (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists giveaway_prizes_giveaway_idx on public.giveaway_prizes(giveaway_id, sort_order);

create table if not exists public.giveaway_questions (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  question_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists giveaway_questions_giveaway_idx on public.giveaway_questions(giveaway_id, sort_order);

create table if not exists public.giveaway_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.giveaway_questions(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists giveaway_question_options_q_idx
  on public.giveaway_question_options(question_id, sort_order);

create table if not exists public.giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (giveaway_id, user_id)
);

create index if not exists giveaway_entries_giveaway_idx on public.giveaway_entries(giveaway_id, is_eligible);

create table if not exists public.giveaway_entry_answers (
  entry_id uuid not null references public.giveaway_entries(id) on delete cascade,
  question_id uuid not null references public.giveaway_questions(id) on delete cascade,
  option_id uuid not null references public.giveaway_question_options(id) on delete cascade,
  primary key (entry_id, question_id)
);

create table if not exists public.giveaway_winners (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  prize_id uuid not null references public.giveaway_prizes(id) on delete cascade unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  drawn_at timestamptz not null default now(),
  winner_notified_at timestamptz,
  unique (giveaway_id, user_id)
);

create table if not exists public.giveaway_likes (
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (giveaway_id, user_id)
);

create table if not exists public.giveaway_comments (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists giveaway_comments_giveaway_idx on public.giveaway_comments(giveaway_id, created_at);

-- Active membership helper
create or replace function public.has_active_membership()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.end_date >= current_date
  );
$$;

create or replace function public.can_participate_in_giveaways()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'anni')
    )
    or public.has_active_membership();
$$;

drop trigger if exists giveaways_set_updated_at on public.giveaways;
create trigger giveaways_set_updated_at
before update on public.giveaways
for each row execute function public.set_updated_at();

alter table public.giveaways enable row level security;
alter table public.giveaway_prizes enable row level security;
alter table public.giveaway_questions enable row level security;
alter table public.giveaway_question_options enable row level security;
alter table public.giveaway_entries enable row level security;
alter table public.giveaway_entry_answers enable row level security;
alter table public.giveaway_winners enable row level security;
alter table public.giveaway_likes enable row level security;
alter table public.giveaway_comments enable row level security;

-- Giveaways: all authenticated can read active giveaways (incl. ended/drawn for archive)
drop policy if exists "giveaways_select_auth" on public.giveaways;
create policy "giveaways_select_auth"
on public.giveaways for select to authenticated
using (is_active = true);

drop policy if exists "giveaways_insert_admin" on public.giveaways;
create policy "giveaways_insert_admin"
on public.giveaways for insert to authenticated
with check (public.is_admin());

drop policy if exists "giveaways_update_admin" on public.giveaways;
create policy "giveaways_update_admin"
on public.giveaways for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "giveaways_delete_admin" on public.giveaways;
create policy "giveaways_delete_admin"
on public.giveaways for delete to authenticated
using (public.is_admin());

-- Child tables: read with giveaway visible
drop policy if exists "giveaway_prizes_select_auth" on public.giveaway_prizes;
create policy "giveaway_prizes_select_auth"
on public.giveaway_prizes for select to authenticated using (true);

drop policy if exists "giveaway_prizes_write_admin" on public.giveaway_prizes;
create policy "giveaway_prizes_write_admin"
on public.giveaway_prizes for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "giveaway_questions_select_auth" on public.giveaway_questions;
create policy "giveaway_questions_select_auth"
on public.giveaway_questions for select to authenticated using (true);

drop policy if exists "giveaway_questions_write_admin" on public.giveaway_questions;
create policy "giveaway_questions_write_admin"
on public.giveaway_questions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "giveaway_question_options_select_auth" on public.giveaway_question_options;
create policy "giveaway_question_options_select_auth"
on public.giveaway_question_options for select to authenticated using (true);

drop policy if exists "giveaway_question_options_write_admin" on public.giveaway_question_options;
create policy "giveaway_question_options_write_admin"
on public.giveaway_question_options for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Entries
drop policy if exists "giveaway_entries_select_auth" on public.giveaway_entries;
create policy "giveaway_entries_select_auth"
on public.giveaway_entries for select to authenticated using (true);

drop policy if exists "giveaway_entries_insert_member" on public.giveaway_entries;
create policy "giveaway_entries_insert_member"
on public.giveaway_entries for insert to authenticated
with check (
  user_id = auth.uid()
  and public.can_participate_in_giveaways()
);

drop policy if exists "giveaway_entry_answers_select_own_or_admin" on public.giveaway_entry_answers;
create policy "giveaway_entry_answers_select_own_or_admin"
on public.giveaway_entry_answers for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.giveaway_entries e
    where e.id = entry_id and e.user_id = auth.uid()
  )
);

drop policy if exists "giveaway_entry_answers_insert_own" on public.giveaway_entry_answers;
create policy "giveaway_entry_answers_insert_own"
on public.giveaway_entry_answers for insert to authenticated
with check (
  exists (
    select 1 from public.giveaway_entries e
    where e.id = entry_id and e.user_id = auth.uid()
  )
);

-- Winners visible to all authenticated once drawn
drop policy if exists "giveaway_winners_select_auth" on public.giveaway_winners;
create policy "giveaway_winners_select_auth"
on public.giveaway_winners for select to authenticated using (true);

drop policy if exists "giveaway_winners_write_admin" on public.giveaway_winners;
create policy "giveaway_winners_write_admin"
on public.giveaway_winners for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Likes
drop policy if exists "giveaway_likes_select_auth" on public.giveaway_likes;
create policy "giveaway_likes_select_auth"
on public.giveaway_likes for select to authenticated using (true);

drop policy if exists "giveaway_likes_insert_member" on public.giveaway_likes;
create policy "giveaway_likes_insert_member"
on public.giveaway_likes for insert to authenticated
with check (user_id = auth.uid() and public.can_participate_in_giveaways());

drop policy if exists "giveaway_likes_delete_own" on public.giveaway_likes;
create policy "giveaway_likes_delete_own"
on public.giveaway_likes for delete to authenticated
using (user_id = auth.uid());

-- Comments
drop policy if exists "giveaway_comments_select_auth" on public.giveaway_comments;
create policy "giveaway_comments_select_auth"
on public.giveaway_comments for select to authenticated using (true);

drop policy if exists "giveaway_comments_insert_member" on public.giveaway_comments;
create policy "giveaway_comments_insert_member"
on public.giveaway_comments for insert to authenticated
with check (author_id = auth.uid() and public.can_participate_in_giveaways());

drop policy if exists "giveaway_comments_update_own" on public.giveaway_comments;
create policy "giveaway_comments_update_own"
on public.giveaway_comments for update to authenticated
using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "giveaway_comments_delete_own_or_admin" on public.giveaway_comments;
create policy "giveaway_comments_delete_own_or_admin"
on public.giveaway_comments for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

-- Points: entry (+10), like (+1), comment (+1), unlike unvote patterns
create unique index if not exists points_unique_giveaway_entry
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'giveaway_entry';

create unique index if not exists points_unique_giveaway_like
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'giveaway_like';

create unique index if not exists points_unique_giveaway_comment
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'giveaway_comment';

create or replace function public.award_points_for_giveaway_entry()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 10, 'giveaway_entry', 'giveaway', new.giveaway_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists giveaway_entry_points on public.giveaway_entries;
create trigger giveaway_entry_points
after insert on public.giveaway_entries
for each row execute function public.award_points_for_giveaway_entry();

create or replace function public.award_points_for_giveaway_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 1, 'giveaway_like', 'giveaway', new.giveaway_id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.revoke_points_for_giveaway_unlike()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.points_transactions
  where user_id = old.user_id
    and reason = 'giveaway_like'
    and entity_type = 'giveaway'
    and entity_id = old.giveaway_id;
  return old;
end;
$$;

drop trigger if exists giveaway_like_points on public.giveaway_likes;
create trigger giveaway_like_points
after insert on public.giveaway_likes
for each row execute function public.award_points_for_giveaway_like();

drop trigger if exists giveaway_unlike_points on public.giveaway_likes;
create trigger giveaway_unlike_points
after delete on public.giveaway_likes
for each row execute function public.revoke_points_for_giveaway_unlike();

create or replace function public.award_points_for_giveaway_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.author_id, 1, 'giveaway_comment', 'giveaway', new.giveaway_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists giveaway_comment_points on public.giveaway_comments;
create trigger giveaway_comment_points
after insert on public.giveaway_comments
for each row execute function public.award_points_for_giveaway_comment();
