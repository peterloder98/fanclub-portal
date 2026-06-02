-- Post update/delete policies for authors + admins
-- Run after 008_posts_moderation_media.sql

drop policy if exists "posts_update_admin_only" on public.posts;
drop policy if exists "posts_delete_admin_only" on public.posts;

-- Authors can update their own posts (body/title)
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
on public.posts
for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

-- Admins can update any post (moderation / approve)
drop policy if exists "posts_update_admin" on public.posts;
create policy "posts_update_admin"
on public.posts
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Authors can delete their own posts; admins can delete any
drop policy if exists "posts_delete_own_or_admin" on public.posts;
create policy "posts_delete_own_or_admin"
on public.posts
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());
