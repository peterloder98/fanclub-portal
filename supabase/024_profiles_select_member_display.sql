-- Allow authenticated members to read display fields of other profiles
-- (names + avatars for likes, polls, comments, feed authors).
-- Run in Supabase SQL Editor.

drop policy if exists "profiles_select_authenticated_members" on public.profiles;
create policy "profiles_select_authenticated_members"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
  )
);
