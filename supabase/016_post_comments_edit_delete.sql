-- Comment edit/delete: own comments + admin delete any
-- Run in Supabase SQL Editor after 004_posts_comments_likes.sql

drop policy if exists "comments_update_own" on public.post_comments;
create policy "comments_update_own"
on public.post_comments
for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

drop policy if exists "comments_delete_own_or_admin" on public.post_comments;
create policy "comments_delete_own_or_admin"
on public.post_comments
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());
