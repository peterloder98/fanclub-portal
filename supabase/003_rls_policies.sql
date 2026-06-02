-- RLS policies for early development.
-- Run in Supabase SQL Editor.

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

-- Helper: check if current user is admin (based on profiles.role)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- MEMBERSHIPS
drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_own"
on public.memberships
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "memberships_select_admin_all" on public.memberships;
create policy "memberships_select_admin_all"
on public.memberships
for select
to authenticated
using (public.is_admin());

