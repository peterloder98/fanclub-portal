-- Race-safe Mitgliedsnummern-Vergabe (atomarer Zähler + Unique-Index ohne Pending-Label).
-- Im Supabase SQL Editor ausführen (nach 023_profiles_membership_number.sql).

create table if not exists public.membership_number_counters (
  id int primary key default 1 check (id = 1),
  last_seq int not null default 0 check (last_seq >= 0)
);

-- Bestehenden Unique-Index ersetzen: Pending-Platzhalter darf mehrfach vorkommen.
drop index if exists public.profiles_membership_number_unique;

create unique index if not exists profiles_membership_number_unique
  on public.profiles (membership_number)
  where membership_number is not null
    and membership_number <> ''
    and membership_number <> 'Wird nach Freigabe vergeben';

-- Zähler aus bereits vergebenen numerischen Mitgliedsnummern initialisieren.
insert into public.membership_number_counters (id, last_seq)
select
  1,
  coalesce(
    (
      select max(nullif(regexp_replace(p.membership_number, '\D', '', 'g'), '')::int)
      from public.profiles p
      where p.membership_number is not null
        and btrim(p.membership_number) <> ''
        and p.membership_number <> 'Wird nach Freigabe vergeben'
        and regexp_replace(p.membership_number, '\D', '', 'g') ~ '^\d+$'
    ),
    0
  )
on conflict (id) do update
set last_seq = greatest(
  public.membership_number_counters.last_seq,
  excluded.last_seq
);

create or replace function public.allocate_next_membership_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_existing int;
  v_seq int;
begin
  insert into public.membership_number_counters (id, last_seq)
  values (1, 0)
  on conflict (id) do nothing;

  select coalesce(
    max(nullif(regexp_replace(p.membership_number, '\D', '', 'g'), '')::int),
    0
  )
  into v_max_existing
  from public.profiles p
  where p.membership_number is not null
    and btrim(p.membership_number) <> ''
    and p.membership_number <> 'Wird nach Freigabe vergeben'
    and regexp_replace(p.membership_number, '\D', '', 'g') ~ '^\d+$';

  -- Row-Lock auf dem Counter-Eintrag: parallel Allocations serialisieren.
  -- greatest(...) berücksichtigt manuell gesetzte Nummern oberhalb des Zählers.
  update public.membership_number_counters
  set last_seq = greatest(last_seq, v_max_existing) + 1
  where id = 1
  returning last_seq into v_seq;

  if v_seq is null then
    raise exception 'membership_number_counters row missing';
  end if;

  return v_seq::text;
end;
$$;

revoke all on function public.allocate_next_membership_number() from public;
grant execute on function public.allocate_next_membership_number() to service_role;
grant execute on function public.allocate_next_membership_number() to authenticated;

alter table public.membership_number_counters enable row level security;

drop policy if exists "membership_number_counters_admin" on public.membership_number_counters;
create policy "membership_number_counters_admin"
on public.membership_number_counters for all to authenticated
using (public.is_admin())
with check (public.is_admin());
