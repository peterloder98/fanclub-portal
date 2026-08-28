-- Stille Vorschau-Konten: dauerhaft nur lesen, unsichtbar auch für den Vorstand.
-- App filtert zusätzlich über BROWSE_ONLY_PROFILE_IDS.

alter table public.profiles
  add column if not exists browse_only boolean not null default false;

comment on column public.profiles.browse_only is
  'Wenn true: unsichtbar für Mitglieder und Vorstand; kein Community-Schreiben.';

create index if not exists profiles_browse_only_idx
  on public.profiles (browse_only)
  where browse_only = true;

update public.profiles
set
  browse_only = true,
  is_hidden = true
where id = '9f3c2e18-7a64-4d1b-b8e0-2c5a9f17d6e4';

create or replace function public.is_browse_only_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = '9f3c2e18-7a64-4d1b-b8e0-2c5a9f17d6e4'::uuid
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.browse_only, false)
    );
$$;

create or replace function public.reject_browse_only_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_browse_only_user() then
    raise exception 'Dieses Konto ist nur zum Anschauen.';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'post_comments',
    'post_reactions',
    'post_comment_likes',
    'post_likes',
    'group_chat_messages',
    'poll_comments',
    'poll_votes',
    'voting_comments',
    'voting_votes',
    'giveaway_comments',
    'giveaway_likes',
    'giveaway_entries',
    'event_participations',
    'live_session_rsvps',
    'live_session_questions',
    'live_session_chat_messages',
    'live_session_attendance',
    'profile_change_requests',
    'app_activity_days'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('drop trigger if exists reject_browse_only_writes on public.%I', t);
    execute format(
      'create trigger reject_browse_only_writes before insert or update on public.%I for each row execute function public.reject_browse_only_writes()',
      t
    );
  end loop;
end$$;
