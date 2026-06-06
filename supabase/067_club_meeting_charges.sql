-- Kosten pro Person bei Fanclub-Treffen (offen / bezahlt)

alter table public.club_meeting_participations
  add column if not exists charge_cents integer,
  add column if not exists charge_status text not null default 'none'
    check (charge_status in ('none', 'open', 'paid', 'waived')),
  add column if not exists paid_ledger_entry_id uuid references public.club_ledger_entries (id) on delete set null;

create index if not exists club_meeting_participations_open_charge_idx
  on public.club_meeting_participations (charge_status)
  where charge_status = 'open';

create or replace function public.club_meeting_participation_set_charge()
returns trigger
language plpgsql
as $$
declare
  v_cost integer;
begin
  select m.cost_cents into v_cost
  from public.club_meetings m
  where m.id = new.meeting_id;

  if v_cost is not null and v_cost > 0 then
    new.charge_cents := v_cost;
    new.charge_status := 'open';
  else
    new.charge_cents := null;
    new.charge_status := 'none';
  end if;
  return new;
end;
$$;

drop trigger if exists club_meeting_participation_set_charge_trg on public.club_meeting_participations;
create trigger club_meeting_participation_set_charge_trg
before insert on public.club_meeting_participations
for each row execute function public.club_meeting_participation_set_charge();
