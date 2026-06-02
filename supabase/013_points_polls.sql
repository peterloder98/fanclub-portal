-- Points for poll participation (once per poll per user)
-- Run after 005_points.sql and 010_polls.sql

-- Ensure uniqueness: once per poll participation
create unique index if not exists points_unique_poll_vote
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'poll_vote';

create or replace function public.award_points_for_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Award once per poll, not per option (multi-select)
  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 5, 'poll_vote', 'poll', new.poll_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists poll_vote_points on public.poll_votes;
create trigger poll_vote_points
after insert on public.poll_votes
for each row execute function public.award_points_for_poll_vote();

