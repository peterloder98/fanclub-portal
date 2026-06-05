-- Fiktive Event-Teilnahmen für Testmitglieder (Mitgliedsnummer gesetzt, aktiv)
-- Im Supabase SQL Editor ausführen (nach 035_event_participations.sql).

delete from public.event_participations
where user_id in (
  select p.id
  from public.profiles p
  join public.memberships m on m.user_id = p.id
  where m.status = 'active'
    and p.membership_number is not null
);

with events as (
  select
    id,
    row_number() over (order by start_at nulls last, title) as ern
  from public.external_events
  where is_visible = true
),
members as (
  select
    p.id as user_id,
    row_number() over (order by p.membership_number nulls last, p.last_name, p.first_name) as mrn
  from public.profiles p
  join public.memberships m on m.user_id = p.id
  where m.status = 'active'
    and p.membership_number is not null
)
insert into public.event_participations (event_id, user_id)
select e.id, mem.user_id
from events e
cross join members mem
where abs(hashtext(e.id::text || mem.user_id::text)) % 10 < 7
on conflict do nothing;
