-- Stammdaten-Änderungen von Mitgliedern: Freigabe durch Admins

create table if not exists public.profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  previous jsonb not null default '{}'::jsonb,
  proposed jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text
);

create index if not exists profile_change_requests_status_created_idx
  on public.profile_change_requests (status, created_at desc);

create index if not exists profile_change_requests_user_status_idx
  on public.profile_change_requests (user_id, status);

-- Nur eine offene Anfrage pro Mitglied
create unique index if not exists profile_change_requests_one_pending_per_user
  on public.profile_change_requests (user_id)
  where status = 'pending';

alter table public.profile_change_requests enable row level security;

drop policy if exists "profile_change_requests_select_own_or_admin" on public.profile_change_requests;
create policy "profile_change_requests_select_own_or_admin"
on public.profile_change_requests
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "profile_change_requests_insert_own" on public.profile_change_requests;
create policy "profile_change_requests_insert_own"
on public.profile_change_requests
for insert to authenticated
with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "profile_change_requests_update_admin" on public.profile_change_requests;
create policy "profile_change_requests_update_admin"
on public.profile_change_requests
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profile_change_requests_delete_admin" on public.profile_change_requests;
create policy "profile_change_requests_delete_admin"
on public.profile_change_requests
for delete to authenticated
using (public.is_admin());
