-- Minimal posts/comments/likes for the feed (v1).
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  author_role public.app_role not null default 'member',
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_likes enable row level security;

-- Select: any authenticated user can read
drop policy if exists "posts_select_auth" on public.posts;
create policy "posts_select_auth" on public.posts
for select to authenticated
using (true);

drop policy if exists "comments_select_auth" on public.post_comments;
create policy "comments_select_auth" on public.post_comments
for select to authenticated
using (true);

drop policy if exists "likes_select_auth" on public.post_likes;
create policy "likes_select_auth" on public.post_likes
for select to authenticated
using (true);

-- Insert: authenticated users (later: require active membership)
drop policy if exists "comments_insert_auth" on public.post_comments;
create policy "comments_insert_auth" on public.post_comments
for insert to authenticated
with check (author_id = auth.uid());

drop policy if exists "likes_insert_auth" on public.post_likes;
create policy "likes_insert_auth" on public.post_likes
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "likes_delete_own" on public.post_likes;
create policy "likes_delete_own" on public.post_likes
for delete to authenticated
using (user_id = auth.uid());

-- Create posts: admin + anni (later: fine-grained)
drop policy if exists "posts_insert_admin_anni" on public.posts;
create policy "posts_insert_admin_anni" on public.posts
for insert to authenticated
with check (public.is_admin() or (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'anni')));

-- Seed two demo posts (optional)
-- Note: run after you have at least one admin + one anni user in profiles

