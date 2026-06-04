-- Sonderverlosung Top-10 Statuspunkte am Jahreswechsel

alter table public.giveaways
  add column if not exists is_year_end_lottery boolean not null default false;

alter table public.giveaways
  add column if not exists points_year integer;

alter table public.giveaways
  add column if not exists year_end_confirmed_at timestamptz;

comment on column public.giveaways.is_year_end_lottery is
  'Jahresend-Sonderverlosung: nur Top-10 des points_year, automatische Teilnahme, Auslosung nach Admin-Bestätigung.';

create table if not exists public.year_end_lottery_runs (
  points_year integer primary key,
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  top_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  points_reset_notified_at timestamptz
);

alter table public.year_end_lottery_runs enable row level security;

drop policy if exists "year_end_lottery_runs_admin" on public.year_end_lottery_runs;
create policy "year_end_lottery_runs_admin"
on public.year_end_lottery_runs for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Keine Statuspunkte für automatische Jahresend-Teilnahmen
create or replace function public.award_points_for_giveaway_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.giveaways g
    where g.id = new.giveaway_id and g.is_year_end_lottery = true
  ) then
    return new;
  end if;
  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 2, 'giveaway_entry', 'giveaway', new.giveaway_id)
  on conflict do nothing;
  return new;
end;
$$;
