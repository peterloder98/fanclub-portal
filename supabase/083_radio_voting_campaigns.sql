-- Radio-Hörervotings (externe Sender-Charts)

create table if not exists public.radio_voting_campaigns (
  id uuid primary key default gen_random_uuid(),
  station text not null,
  region text not null,
  chart_name text not null,
  voting_url text not null,
  ends_at timestamptz not null,
  song_title text not null,
  instructions text not null,
  steps text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  is_active boolean not null default true,
  cycle_key text not null default '1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists radio_voting_campaigns_active_ends_idx
  on public.radio_voting_campaigns (is_active, ends_at, sort_order);

create table if not exists public.radio_voting_participations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.radio_voting_campaigns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  cycle_key text not null,
  clicked_at timestamptz not null default now(),
  unique (campaign_id, user_id, cycle_key)
);

create index if not exists radio_voting_participations_campaign_cycle_idx
  on public.radio_voting_participations (campaign_id, cycle_key);

alter table public.radio_voting_campaigns enable row level security;
alter table public.radio_voting_participations enable row level security;

drop policy if exists "radio_voting_campaigns_select_active" on public.radio_voting_campaigns;
create policy "radio_voting_campaigns_select_active"
on public.radio_voting_campaigns for select to authenticated
using (is_active = true);

drop policy if exists "radio_voting_campaigns_admin_all" on public.radio_voting_campaigns;
create policy "radio_voting_campaigns_admin_all"
on public.radio_voting_campaigns for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "radio_voting_participations_select_own" on public.radio_voting_participations;
create policy "radio_voting_participations_select_own"
on public.radio_voting_participations for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "radio_voting_participations_insert_own" on public.radio_voting_participations;
create policy "radio_voting_participations_insert_own"
on public.radio_voting_participations for insert to authenticated
with check (user_id = auth.uid());

-- Ein Anni-Star pro Kampagne und Runde
create unique index if not exists points_transactions_radio_voting_once
  on public.points_transactions (user_id, entity_id)
  where reason = 'radio_voting';

-- Votingheld: Radio-Votings + Umfragen
update public.achievement_definitions
set
  description = 'Radio-Hörervotings und Umfragen in der App.',
  metric = 'voting_engagement'
where slug = 'voting_hero';

-- Startdaten (fiktive Beispiel-Votings)
insert into public.radio_voting_campaigns (
  station, region, chart_name, voting_url, ends_at, song_title, instructions, steps, sort_order
) values
(
  'Radio Hamburg',
  'Hamburg & Schleswig-Holstein',
  'TOP 845',
  'https://www.radiohamburg.de/charts/top-845/voting',
  '2026-06-15 20:00:00+02',
  'Anni Perka — aktueller Titel',
  'Stimme für Anni in der TOP 845 ab — je höher der Platz, desto öfter läuft der Song im Programm.',
  array[
    'Link öffnen und ggf. Cookie-Banner bestätigen.',
    'Nach „Anni Perka“ oder dem Songtitel suchen.',
    'Song auswählen und Stimme abgeben (oft 1× täglich möglich).',
    'Seite offen lassen, bis „Danke für deine Stimme“ erscheint.'
  ],
  10
),
(
  'NDR 2',
  'Norddeutschland',
  'Soundcheck',
  'https://www.ndr.de/radio/ndr2/sendungen/soundcheck/voting',
  '2026-06-12 18:00:00+02',
  'Anni Perka — Soundcheck-Kandidatin',
  'Im NDR-2-Soundcheck entscheidet das Publikum über neue Titel — Anni braucht deine Stimme für Rotation.',
  array[
    'Auf den Voting-Link tippen (NDR-Seite).',
    'Anni Perka in der Kandidatenliste finden.',
    'Auf „Abstimmen“ / Herz klicken.',
    'Bei Bedarf morgen erneut abstimmen — viele Charts erlauben tägliche Stimmen.'
  ],
  20
),
(
  'Bayern 3',
  'Bayern',
  'Bayern 3 Votes',
  'https://www.bayern3.de/bayern3votes',
  '2026-06-20 23:59:00+02',
  'Anni Perka — Bayern 3 Votes',
  'Bayern 3 Votes ist das Hörer-Voting des Senders — gute Platzierungen bringen mehr Airplay.',
  array[
    'Voting-Seite öffnen und Anni Perka suchen.',
    'Titel markieren und Stimme abgeben.',
    'Optional: Link mit Freunden teilen, damit mehr Fans mitmachen.'
  ],
  30
),
(
  'Radio Regenbogen',
  'Baden-Württemberg',
  'TOP 25',
  'https://www.regenbogen.de/charts/top-25/voting',
  '2026-06-18 21:00:00+02',
  'Anni Perka — TOP-25-Kandidatin',
  'In der Radio-Regenbogen-TOP-25 kannst du Anni nach oben voten — Top-Plätze bedeuten häufigere Plays.',
  array[
    'Link öffnen → Chart-Voting aufrufen.',
    'Song von Anni Perka wählen.',
    'Stimme bestätigen — bei Regenbogen oft mehrfach pro Woche möglich.'
  ],
  40
),
(
  'MDR Jump',
  'Mitteldeutschland',
  'Live-Charts',
  'https://www.mdrjump.de/charts/live-charts/voting',
  '2026-06-14 19:00:00+02',
  'Anni Perka — Live-Charts',
  'MDR Jump Live-Charts: Hörerstimmen bestimmen die Playlist — hilf Anni in die vorderen Ränge.',
  array[
    'Voting-Link öffnen.',
    'Nach Anni Perka filtern oder in der Liste scrollen.',
    'Abstimmen und Erfolgsmeldung abwarten.',
    'Fanclub-Tipp: Erinnerung im Kalender für tägliches Voting setzen.'
  ],
  50
);
