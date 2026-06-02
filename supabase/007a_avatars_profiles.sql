-- Avatars v1 (DB only): add profile field + allow user update own row
-- Run in Supabase SQL Editor.

alter table public.profiles
add column if not exists avatar_path text;

-- Allow users to update their own avatar_path (and other profile fields later)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

