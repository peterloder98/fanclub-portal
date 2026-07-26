-- Benachrichtigungen automatisch entfernen, wenn die verknüpfte Entität gelöscht wird

create or replace function public.cleanup_notifications_on_row_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_key text;
  entity_id text;
begin
  meta_key := TG_ARGV[0];
  entity_id := OLD.id::text;
  delete from public.user_notifications
  where metadata->>meta_key = entity_id;
  return OLD;
end;
$$;

drop trigger if exists trg_cleanup_notifications_giveaway on public.giveaways;
create trigger trg_cleanup_notifications_giveaway
after delete on public.giveaways
for each row execute function public.cleanup_notifications_on_row_delete('giveaway_id');

drop trigger if exists trg_cleanup_notifications_poll on public.polls;
create trigger trg_cleanup_notifications_poll
after delete on public.polls
for each row execute function public.cleanup_notifications_on_row_delete('poll_id');

drop trigger if exists trg_cleanup_notifications_radio_voting on public.radio_voting_campaigns;
create trigger trg_cleanup_notifications_radio_voting
after delete on public.radio_voting_campaigns
for each row execute function public.cleanup_notifications_on_row_delete('campaign_id');

drop trigger if exists trg_cleanup_notifications_event on public.external_events;
create trigger trg_cleanup_notifications_event
after delete on public.external_events
for each row execute function public.cleanup_notifications_on_row_delete('event_id');

drop trigger if exists trg_cleanup_notifications_meeting on public.club_meetings;
create trigger trg_cleanup_notifications_meeting
after delete on public.club_meetings
for each row execute function public.cleanup_notifications_on_row_delete('meeting_id');

drop trigger if exists trg_cleanup_notifications_post on public.posts;
create trigger trg_cleanup_notifications_post
after delete on public.posts
for each row execute function public.cleanup_notifications_on_row_delete('post_id');
