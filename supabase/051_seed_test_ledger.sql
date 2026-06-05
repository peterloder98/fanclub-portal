-- Testdaten: verschiedene Aufnahmedaten + Beiträge + Ausgaben
-- Im Supabase SQL Editor ausführen (nach 049_club_ledger.sql).

-- 1) Aufnahmedaten staffeln (aktive Mitglieder mit Mitgliedsnummer)
with ranked as (
  select
    m.id as membership_id,
    m.user_id,
    row_number() over (order by p.membership_number nulls last, p.last_name, p.first_name) as rn
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.status = 'active'
    and p.membership_number is not null
)
update public.memberships m
set
  start_date = (date '2018-03-15' + ((r.rn - 1) * 73))::date,
  end_date = (date '2018-03-15' + ((r.rn - 1) * 73) + 365)::date
from ranked r
where m.id = r.membership_id;

-- 2) Beitragseingänge: 1–5 Tage vor Aufnahme, pro Mitglied
with members as (
  select
    m.user_id,
    m.start_date,
    coalesce(m.fee_cents, 1500) as fee_cents,
    row_number() over (order by p.membership_number) as rn
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.status = 'active'
    and p.membership_number is not null
    and m.start_date is not null
)
insert into public.club_ledger_entries (entry_type, amount_cents, description, category, member_id, entry_date)
select
  'income',
  fee_cents,
  'Mitgliedsbeitrag ' || extract(year from start_date)::text,
  'membership',
  user_id,
  (start_date - (1 + (rn % 5)))::date
from members
where not exists (
  select 1 from public.club_ledger_entries e
  where e.member_id = members.user_id
    and e.category = 'membership'
    and e.entry_type = 'income'
);

-- 3) Allgemeine Ausgaben (nur einmal anlegen)
insert into public.club_ledger_entries (entry_type, amount_cents, description, category, member_id, entry_date)
select * from (values
  ('expense'::text, 450, 'Porto Versand Mitgliederpost', 'general'::text, null::uuid, '2025-11-12'::date),
  ('expense', 2490, 'Fanschals Bestellung', 'merchandise', null, '2025-10-05'),
  ('expense', 1200, 'Kontoführungsgebühren', 'general', null, '2026-01-02'),
  ('expense', 850, 'Kugelschreiber mit Logo', 'merchandise', null, '2025-09-18')
) as v(entry_type, amount_cents, description, category, member_id, entry_date)
where not exists (
  select 1 from public.club_ledger_entries
  where description = 'Kugelschreiber mit Logo'
);
