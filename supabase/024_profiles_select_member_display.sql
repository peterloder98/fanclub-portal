-- Allow authenticated members to read display fields of other profiles
-- (names + avatars for likes, polls, comments, feed authors).
-- Run in Supabase SQL Editor.
--
-- WICHTIG: Kein Subselect auf public.profiles in der Policy (sonst RLS-Rekursion
-- und Feed-Fehler „infinite recursion detected in policy for relation profiles“).

drop policy if exists "profiles_select_authenticated_members" on public.profiles;

create policy "profiles_select_authenticated_members"
on public.profiles
for select
to authenticated
using (auth.uid() is not null);
