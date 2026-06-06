-- Alle Admins erhalten eine aktive Mitgliedschaft (für Benachrichtigungen, Teilnahmen, Verzeichnis).
-- Bestehende Admin-Mitgliedschaften werden auf „active“ gesetzt; fehlende werden angelegt.

update public.memberships m
set
  status = 'active',
  updated_at = now()
from public.profiles p
where m.user_id = p.id
  and p.role = 'admin'
  and m.status is distinct from 'active';

insert into public.memberships (user_id, start_date, end_date, fee_cents, status)
select
  p.id,
  date_trunc('year', current_date)::date,
  (date_trunc('year', current_date) + interval '1 year' - interval '1 day')::date,
  0,
  'active'
from public.profiles p
where p.role = 'admin'
  and not exists (
    select 1 from public.memberships m where m.user_id = p.id
  );
