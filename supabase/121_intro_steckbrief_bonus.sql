-- Steckbrief: Erinnerungen + einmaliger Anni-Stars-Bonus

alter table public.profiles
  add column if not exists intro_reminder_count smallint not null default 0;

comment on column public.profiles.intro_reminder_count is
  'Anzahl gesendeter Steckbrief-Erinnerungen (max. 2)';

create unique index if not exists points_unique_profile_intro
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'profile_intro_complete';
