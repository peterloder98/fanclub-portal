-- Authors may see their own pending/rejected posts (moderation queue UX).
-- Admins/Anni see all; everyone else only approved.

drop policy if exists "posts_select_auth" on public.posts;
create policy "posts_select_auth"
on public.posts
for select to authenticated
using (
  public.is_admin()
  or (exists(select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'anni'))
  or status = 'approved'
  or author_id = auth.uid()
);

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
        or p.author_id = auth.uid()
      )
  )
);
