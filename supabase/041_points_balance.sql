-- Punkte-Balance: Gewinnspiel-Teilnahme +2, Event-Teilnahme +1
-- Nach 035_event_participations.sql und 031_giveaways.sql ausführen.

-- Gewinnspiel: Eintrag nur noch +2 (Chance auf echten Gewinn bleibt Hauptmotivation)
create or replace function public.award_points_for_giveaway_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 2, 'giveaway_entry', 'giveaway', new.giveaway_id)
  on conflict do nothing;
  return new;
end;
$$;

-- Event: einmal +1 pro Event bei „Am Event teilnehmen“
create unique index if not exists points_unique_event_participation
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'event_participation';

create or replace function public.award_points_for_event_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 1, 'event_participation', 'event', new.event_id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.revoke_points_for_event_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.points_transactions
  where user_id = old.user_id
    and reason = 'event_participation'
    and entity_type = 'event'
    and entity_id = old.event_id;
  return old;
end;
$$;

drop trigger if exists event_participation_points on public.event_participations;
create trigger event_participation_points
after insert on public.event_participations
for each row execute function public.award_points_for_event_participation();

drop trigger if exists event_participation_revoke on public.event_participations;
create trigger event_participation_revoke
after delete on public.event_participations
for each row execute function public.revoke_points_for_event_participation();
