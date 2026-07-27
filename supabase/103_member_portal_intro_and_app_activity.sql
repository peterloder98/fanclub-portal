-- Mitglieder-Portal (Intro-Fragen) + App-Aktivität für Admin-Statistik
-- Im Supabase SQL Editor ausführen.

-- 1) Öffentliche Intro-Antworten (alle optional)
alter table public.profiles
  add column if not exists intro_discovered_anni text,
  add column if not exists intro_favorite_song text,
  add column if not exists intro_other_artists text,
  add column if not exists intro_hobbies text,
  add column if not exists intro_perfect_concert text,
  add column if not exists intro_onboarding_dismissed_at timestamptz,
  add column if not exists last_app_active_at timestamptz;

comment on column public.profiles.intro_discovered_anni is 'Wie bist du auf Anni aufmerksam geworden?';
comment on column public.profiles.intro_favorite_song is 'Lieblingssong von Anni';
comment on column public.profiles.intro_other_artists is 'Weitere Schlagerkünstler';
comment on column public.profiles.intro_hobbies is 'Hobbies';
comment on column public.profiles.intro_perfect_concert is 'Perfektes Konzert';
comment on column public.profiles.intro_onboarding_dismissed_at is 'Onboarding (Fragen) übersprungen oder gespeichert';
comment on column public.profiles.last_app_active_at is 'Letzte App-Aktivität (Heartbeat)';

-- 2) Tägliche Aktivität für Monatskurven (ein Eintrag pro User/Tag)
create table if not exists public.app_activity_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index if not exists app_activity_days_date_idx
  on public.app_activity_days (activity_date desc);

alter table public.app_activity_days enable row level security;

drop policy if exists "app_activity_days_admin_select" on public.app_activity_days;
create policy "app_activity_days_admin_select"
on public.app_activity_days
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Inserts nur über Service-Role / Server-Actions (kein Client-Insert nötig)

-- 3) Bestehende Profile: Onboarding nicht nachträglich erzwingen
--    (nur neue Mitglieder nach dieser Migration sehen /willkommen)
update public.profiles
set intro_onboarding_dismissed_at = now()
where intro_onboarding_dismissed_at is null;
