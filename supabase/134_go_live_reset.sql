-- Go-Live Reset: Engagement/Testmüll leeren, Mitglieder & Stammdaten behalten.
-- VORHER: Backup der Produktion!
-- Einmalig manuell in Supabase SQL Editor ausführen (nicht automatisch bei jedem Deploy).
--
-- Behalten u. a.: profiles, memberships, auth.users, ledger, external_events,
-- club_meetings, achievement_definitions, email_templates, app_settings.

do $$
declare
  t text;
  tables text[] := array[
    'live_sessions',
    'group_chat_messages',
    'post_comment_likes',
    'post_comments',
    'post_reactions',
    'post_likes',
    'posts',
    'points_transactions',
    'user_achievements',
    'achievement_progress',
    'user_notifications',
    'member_warnings',
    'poll_votes',
    'poll_comments',
    'poll_options',
    'polls',
    'giveaway_winners',
    'giveaway_entry_answers',
    'giveaway_entries',
    'giveaway_comments',
    'giveaway_likes',
    'giveaway_question_options',
    'giveaway_questions',
    'giveaway_prizes',
    'giveaways',
    'event_participations',
    'club_meeting_participations',
    'app_activity_days',
    'live_session_attendance',
    'live_session_rsvps',
    'live_session_messages',
    'live_session_questions'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is not null then
      execute format('truncate table public.%I restart identity cascade', t);
      raise notice 'truncated %', t;
    else
      raise notice 'skip missing %', t;
    end if;
  end loop;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_app_active_at'
  ) then
    update public.profiles set last_app_active_at = null where last_app_active_at is not null;
  end if;
end $$;
