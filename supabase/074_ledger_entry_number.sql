-- Vorgangsnummern für Buchhaltung: JJJJ-NNNN (fortlaufend pro Buchungsjahr)
-- Im Supabase SQL Editor ausführen (nach 049_club_ledger.sql).

create table if not exists public.club_ledger_year_counters (
  fiscal_year int primary key,
  last_seq int not null default 0 check (last_seq >= 0)
);

alter table public.club_ledger_entries
  add column if not exists entry_number text;

create unique index if not exists club_ledger_entries_entry_number_uidx
  on public.club_ledger_entries (entry_number)
  where entry_number is not null;

create or replace function public.allocate_ledger_entry_number(p_entry_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int;
  v_seq int;
begin
  v_year := extract(year from coalesce(p_entry_date, current_date))::int;

  insert into public.club_ledger_year_counters (fiscal_year, last_seq)
  values (v_year, 0)
  on conflict (fiscal_year) do nothing;

  update public.club_ledger_year_counters
  set last_seq = last_seq + 1
  where fiscal_year = v_year
  returning last_seq into v_seq;

  return v_year::text || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

create or replace function public.club_ledger_set_entry_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entry_number is null or btrim(new.entry_number) = '' then
    new.entry_number := public.allocate_ledger_entry_number(new.entry_date);
  end if;
  return new;
end;
$$;

drop trigger if exists club_ledger_entries_set_entry_number on public.club_ledger_entries;
create trigger club_ledger_entries_set_entry_number
before insert on public.club_ledger_entries
for each row execute function public.club_ledger_set_entry_number();

-- Bestehende Buchungen (inkl. Testdaten) chronologisch nummerieren — VOR dem Schutz-Trigger
do $$
declare
  r record;
begin
  for r in
    select id, entry_date
    from public.club_ledger_entries
    where entry_number is null
    order by entry_date asc, created_at asc, id asc
  loop
    update public.club_ledger_entries
    set entry_number = public.allocate_ledger_entry_number(r.entry_date)
    where id = r.id;
  end loop;
end;
$$;

alter table public.club_ledger_entries
  alter column entry_number set not null;

create or replace function public.club_ledger_protect_entry_number()
returns trigger
language plpgsql
as $$
begin
  -- Nur bereits vergebene Nummern schützen (Backfill darf NULL → Nummer setzen)
  if old.entry_number is not null and old.entry_number is distinct from new.entry_number then
    new.entry_number := old.entry_number;
  end if;
  return new;
end;
$$;

drop trigger if exists club_ledger_entries_protect_entry_number on public.club_ledger_entries;
create trigger club_ledger_entries_protect_entry_number
before update on public.club_ledger_entries
for each row execute function public.club_ledger_protect_entry_number();
