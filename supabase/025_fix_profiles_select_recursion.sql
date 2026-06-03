-- Fix: 024 mit Subselect auf profiles verursachte RLS-Rekursion → Feed lädt nicht.
-- Einmal im Supabase SQL Editor ausführen, wenn der Feed nach 024 kaputt ging.

drop policy if exists "profiles_select_authenticated_members" on public.profiles;

create policy "profiles_select_authenticated_members"
on public.profiles
for select
to authenticated
using (auth.uid() is not null);
