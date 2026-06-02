-- Avatars: add profile field + storage policies (public bucket recommended for now)
-- Run in Supabase SQL Editor.

alter table public.profiles
add column if not exists avatar_path text;

-- Allow users to update their own avatar_path
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Storage policies for storage.objects are intentionally NOT included here,
-- because some Supabase projects restrict altering storage.objects unless you run as the owner.
-- Easiest dev setup:
-- - Create bucket "avatars"
-- - Mark it public
-- - Rely on bucket public access (no storage RLS needed in dev)

