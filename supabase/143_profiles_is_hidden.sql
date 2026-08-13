-- Versteckte Profile (z. B. System-Admin): nicht in Mitglieder-UI / Rangliste,
-- keine Anni-Stars. Rolle und Login bleiben unverändert.

alter table public.profiles
  add column if not exists is_hidden boolean not null default false;

comment on column public.profiles.is_hidden is
  'Wenn true: unsichtbar für Mitglieder-Verzeichnis/Suche/Ranglisten; keine Punkte. Admin bleibt sichtbar im Admin-Bereich.';

create index if not exists profiles_is_hidden_idx
  on public.profiles (is_hidden)
  where is_hidden = true;

-- Peter Loder (Admin) verstecken
update public.profiles
set is_hidden = true
where id = '1b70d88f-e28d-48f3-b3cb-646eaf06f19a'
   or lower(email) = 'mail@peter-loder.de'
   or (lower(coalesce(first_name, '')) = 'peter' and lower(coalesce(last_name, '')) = 'loder');

-- Bestehende Sterne / Badges für versteckte Profile entfernen
delete from public.points_transactions
where user_id in (select id from public.profiles where is_hidden = true);

do $$
begin
  if to_regclass('public.user_achievements') is not null then
    delete from public.user_achievements
    where user_id in (select id from public.profiles where is_hidden = true);
  end if;
end$$;

-- Punkte-Inserts für versteckte Profile still verwerfen
create or replace function public.skip_points_for_hidden_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.profiles p
    where p.id = new.user_id
      and coalesce(p.is_hidden, false)
  ) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists points_skip_hidden_profiles on public.points_transactions;
create trigger points_skip_hidden_profiles
before insert on public.points_transactions
for each row execute function public.skip_points_for_hidden_profiles();

-- Jahrespunkte-Rangliste: versteckte Profile ausschließen
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
    and coalesce(p.is_hidden, false) = false
  order by s.points desc, p.last_name nulls last, p.first_name nulls last
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.member_year_points_leaderboard(int) from public;
grant execute on function public.member_year_points_leaderboard(int) to authenticated;
