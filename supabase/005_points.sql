-- Points system v1: award points on likes/comments (once per post per user)
-- Run in Supabase SQL Editor AFTER 004_posts_comments_likes.sql.

create extension if not exists pgcrypto;

create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  reason text not null,
  entity_type text not null, -- e.g. "post"
  entity_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.points_transactions enable row level security;

drop policy if exists "points_select_own" on public.points_transactions;
create policy "points_select_own"
on public.points_transactions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "points_select_admin_all" on public.points_transactions;
create policy "points_select_admin_all"
on public.points_transactions
for select to authenticated
using (public.is_admin());

-- Ensure "once per post" for each reason
create unique index if not exists points_unique_like
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'post_like';

create unique index if not exists points_unique_comment
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'post_comment';

create or replace function public.award_points_for_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 1, 'post_like', 'post', new.post_id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.award_points_for_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.author_id, 3, 'post_comment', 'post', new.post_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists post_like_points on public.post_likes;
create trigger post_like_points
after insert on public.post_likes
for each row execute function public.award_points_for_post_like();

drop trigger if exists post_comment_points on public.post_comments;
create trigger post_comment_points
after insert on public.post_comments
for each row execute function public.award_points_for_post_comment();

