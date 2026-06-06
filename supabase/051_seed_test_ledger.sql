-- Testdaten 2026: Beitritte ab 08.03.2026, je ein Beitrag 2026, Ausgaben ab 08.03.2026
-- Im Supabase SQL Editor ausführen (nach 049_club_ledger.sql und 074_ledger_entry_number.sql).
-- Setzt Buchungen zurück und legt sie neu an.

-- 0) Alte Buchungen + zugehörige Historie-Einträge entfernen
delete from public.member_activity_log
where event_type in ('payment_received', 'ledger_income', 'ledger_expense')
   or coalesce(metadata->>'ledger_entry_id', '') <> '';

delete from public.club_ledger_entries;

-- 1) Beitrittsdaten: frühestens 08.03.2026, gestaffelt bis ca. 2 Wochen vor heute (~19.05.2026)
with ranked as (
  select
    m.id as membership_id,
    m.user_id,
    row_number() over (order by p.membership_number nulls last, p.last_name, p.first_name) as rn,
    count(*) over ()::int as total
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.status = 'active'
    and p.membership_number is not null
)
update public.memberships m
set
  start_date = date '2026-03-08' + (
    case
      when r.total <= 1 then 0
      else (((r.rn - 1) * 72) / (r.total - 1))::integer
    end
  ),
  end_date = date '2026-03-08' + (
    case
      when r.total <= 1 then 0
      else (((r.rn - 1) * 72) / (r.total - 1))::integer
    end
  ) + 365
from ranked r
where m.id = r.membership_id;

-- 2) Beitragseingänge 2026: genau einmal pro Mitglied, 0–2 Tage nach Beitritt
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
),
inserted as (
  insert into public.club_ledger_entries (entry_type, amount_cents, description, category, member_id, entry_date)
  select
    'income',
    fee_cents,
    'Mitgliedsbeitrag 2026',
    'membership',
    user_id,
    start_date + ((rn % 3)::integer)
  from members
  returning member_id, entry_date
)
update public.profiles p
set contribution_date = i.entry_date
from inserted i
where p.id = i.member_id;

-- 3) Muster-Ausgaben ab 08.03.2026
insert into public.club_ledger_entries (entry_type, amount_cents, description, category, member_id, entry_date)
values
  ('expense', 450, 'Porto Versand Mitgliederpost', 'general', null, '2026-03-12'),
  ('expense', 850, 'Kugelschreiber mit Logo', 'merchandise', null, '2026-03-20'),
  ('expense', 2490, 'Fanschals Bestellung', 'merchandise', null, '2026-04-08'),
  ('expense', 1200, 'Kontoführungsgebühren', 'general', null, '2026-05-02');
