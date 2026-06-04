-- Mitglieder-Karte, Geburtstags-Posts, Admin-Audit, Leaderboard-RPC
-- Im Supabase SQL Editor ausführen.

alter table public.posts
  add column if not exists birthday_user_id uuid references public.profiles(id) on delete set null;

create unique index if not exists posts_birthday_user_day_unique
  on public.posts (birthday_date, birthday_user_id)
  where is_birthday = true and birthday_user_id is not null;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_admin_select" on public.admin_audit_log;
create policy "admin_audit_log_admin_select"
on public.admin_audit_log
for select
to authenticated
using (public.is_admin());

drop policy if exists "admin_audit_log_admin_insert" on public.admin_audit_log;
create policy "admin_audit_log_admin_insert"
on public.admin_audit_log
for insert
to authenticated
with check (public.is_admin() and actor_id = auth.uid());

-- Jahrespunkte-Rangliste (nur Anzeigename + Punkte, aktive Mitglieder)
create or replace function public.member_year_points_leaderboard(p_limit int default 50)
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  points bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with year_start as (
    select date_trunc('year', now() at time zone 'Europe/Berlin')::timestamptz as ts
  ),
  sums as (
    select pt.user_id, coalesce(sum(pt.points), 0)::bigint as points
    from public.points_transactions pt, year_start ys
    where pt.created_at >= ys.ts
    group by pt.user_id
  )
  select
    p.id as user_id,
    p.first_name,
    p.last_name,
    s.points
  from sums s
  join public.profiles p on p.id = s.user_id
  join public.memberships m on m.user_id = p.id and m.status = 'active'
  where s.points > 0
  order by s.points desc, p.last_name nulls last, p.first_name nulls last
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.member_year_points_leaderboard(int) from public;
grant execute on function public.member_year_points_leaderboard(int) to authenticated;
