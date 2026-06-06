-- Zahlungsfrist nach Anmeldung + Admin darf Teilnehmer entfernen

alter table public.club_meetings
  add column if not exists payment_deadline_days integer not null default 14
    check (payment_deadline_days >= 1 and payment_deadline_days <= 90);

alter table public.club_meeting_participations
  add column if not exists payment_due_at timestamptz;

create index if not exists club_meeting_participations_payment_due_idx
  on public.club_meeting_participations (payment_due_at)
  where charge_status = 'open';

create or replace function public.club_meeting_participation_set_charge()
returns trigger
language plpgsql
as $$
declare
  v_cost integer;
  v_deadline_days integer;
begin
  select m.cost_cents, coalesce(m.payment_deadline_days, 14)
  into v_cost, v_deadline_days
  from public.club_meetings m
  where m.id = new.meeting_id;

  if v_cost is not null and v_cost > 0 then
    new.charge_cents := v_cost;
    new.charge_status := 'open';
    new.payment_due_at := now() + make_interval(days => v_deadline_days);
  else
    new.charge_cents := null;
    new.charge_status := 'none';
    new.payment_due_at := null;
  end if;
  return new;
end;
$$;

drop policy if exists "club_meeting_participations_admin_delete" on public.club_meeting_participations;
create policy "club_meeting_participations_admin_delete"
on public.club_meeting_participations for delete to authenticated
using (public.is_admin());
