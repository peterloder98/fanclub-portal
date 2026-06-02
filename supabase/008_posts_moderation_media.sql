-- Posts moderation + media attachments (up to 4 images per post)
-- Run in Supabase SQL Editor after 004_posts_comments_likes.sql

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where t.typname = 'post_status' and n.nspname = 'public') then
    create type public.post_status as enum ('pending', 'approved', 'rejected', 'deleted');
  end if;
end$$;

alter table public.posts
  add column if not exists status public.post_status not null default 'approved',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- updated_at trigger (re-use existing function from 001_init.sql)
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists post_media_post_id_idx on public.post_media(post_id, created_at);

alter table public.post_media enable row level security;

-- Media: select allowed for authenticated users if post is visible to them
drop policy if exists "post_media_select_auth_visible" on public.post_media;
create policy "post_media_select_auth_visible"
on public.post_media
for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and (
        public.is_admin()
        or (exists(select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'anni'))
        or p.status = 'approved'
      )
  )
);

-- Posts select: only approved for normal users, everything for admin/anni
drop policy if exists "posts_select_auth" on public.posts;
create policy "posts_select_auth"
on public.posts
for select to authenticated
using (
  public.is_admin()
  or (exists(select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'anni'))
  or status = 'approved'
);

-- Insert posts: any authenticated user can create their own post.
-- Admin/Anni can create approved posts, members create pending posts.
drop policy if exists "posts_insert_admin_anni" on public.posts;
drop policy if exists "posts_insert_auth_moderated" on public.posts;
create policy "posts_insert_auth_moderated"
on public.posts
for insert to authenticated
with check (
  author_id = auth.uid()
  and (
    (public.is_admin() or (exists(select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'anni')))
    or status = 'pending'
  )
);

-- Update posts: admin only (for moderation)
drop policy if exists "posts_update_admin_only" on public.posts;
create policy "posts_update_admin_only"
on public.posts
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Delete posts: admin only
drop policy if exists "posts_delete_admin_only" on public.posts;
create policy "posts_delete_admin_only"
on public.posts
for delete to authenticated
using (public.is_admin());

-- Insert media: admin only via service role route in app (keeps storage simple)
drop policy if exists "post_media_insert_admin_only" on public.post_media;
create policy "post_media_insert_admin_only"
on public.post_media
for insert to authenticated
with check (public.is_admin());

