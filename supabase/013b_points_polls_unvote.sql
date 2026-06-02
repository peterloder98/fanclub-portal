-- Revoke poll points when user removes their last vote on a poll
-- Run after 013_points_polls.sql

create or replace function public.revoke_points_for_poll_vote_if_empty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int;
begin
  select count(*) into remaining
  from public.poll_votes
  where poll_id = old.poll_id
    and user_id = old.user_id;

  if remaining = 0 then
    delete from public.points_transactions
    where user_id = old.user_id
      and reason = 'poll_vote'
      and entity_type = 'poll'
      and entity_id = old.poll_id;
  end if;

  return old;
end;
$$;

drop trigger if exists poll_vote_points_revoke on public.poll_votes;
create trigger poll_vote_points_revoke
after delete on public.poll_votes
for each row execute function public.revoke_points_for_poll_vote_if_empty();

