-- Historie für Mitglieder & Antragsteller (Vorstand)
-- Run in Supabase SQL Editor.

create table if not exists public.member_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  application_id uuid references public.membership_applications(id) on delete set null,
  event_type text not null,
  title text not null,
  details text,
  link_url text,
  link_label text,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists member_activity_log_user_id_idx
  on public.member_activity_log (user_id, created_at desc);

create index if not exists member_activity_log_application_id_idx
  on public.member_activity_log (application_id, created_at desc);

alter table public.member_activity_log enable row level security;

drop policy if exists "member_activity_log_admin_all" on public.member_activity_log;
create policy "member_activity_log_admin_all"
on public.member_activity_log
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "member_activity_log_select_own" on public.member_activity_log;
create policy "member_activity_log_select_own"
on public.member_activity_log
for select
to authenticated
using (user_id = auth.uid());
