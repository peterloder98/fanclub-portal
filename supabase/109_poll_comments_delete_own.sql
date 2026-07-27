-- Poll-Kommentare: eigene löschen + Admins alle

drop policy if exists "poll_comments_delete_admin" on public.poll_comments;
drop policy if exists "poll_comments_delete_own_or_admin" on public.poll_comments;

create policy "poll_comments_delete_own_or_admin"
on public.poll_comments
for delete to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
