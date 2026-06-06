-- Anni-Stars: Badges, erweiterte Empfehlungen, Shop-Sterne, Adventskalender-Vorbereitung
-- Bestehende points_transactions bleibt die zentrale Historie.

-- ─── Badge-Definitionen (Katalog) ───────────────────────────────────────────
create table if not exists public.achievement_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  description text not null,
  icon_key text not null default 'trophy',
  metric text not null,
  bronze_threshold integer not null,
  silver_threshold integer not null,
  gold_threshold integer not null,
  platinum_threshold integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Freigeschaltete Badges pro Mitglied ────────────────────────────────────
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievement_definitions(id) on delete cascade,
  tier text not null check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  unlocked_at timestamptz not null default now(),
  progress_snapshot jsonb not null default '{}'::jsonb,
  unique (user_id, achievement_id, tier)
);

create index if not exists user_achievements_user_idx
  on public.user_achievements (user_id, unlocked_at desc);

-- ─── Fortschritt bis zur nächsten Stufe ─────────────────────────────────────
create table if not exists public.achievement_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievement_definitions(id) on delete cascade,
  current_value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ─── Empfehlungen erweitern ─────────────────────────────────────────────────
alter table public.membership_referral_sends
  add column if not exists referral_token uuid default gen_random_uuid(),
  add column if not exists link_opened_at timestamptz,
  add column if not exists converted_application_id uuid references public.membership_applications(id) on delete set null,
  add column if not exists converted_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

create unique index if not exists membership_referral_sends_token_idx
  on public.membership_referral_sends (referral_token)
  where referral_token is not null;

create table if not exists public.referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referral_send_id uuid not null references public.membership_referral_sends(id) on delete cascade,
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.membership_applications(id) on delete set null,
  approved_at timestamptz not null default now(),
  stars_awarded integer not null default 0,
  unique (referred_user_id),
  unique (referral_send_id)
);

create index if not exists referral_conversions_referrer_idx
  on public.referral_conversions (referrer_user_id, approved_at desc);

-- ─── Shop: Anni-Stars pro Bestellung (idempotent) ───────────────────────────
create table if not exists public.merchandise_order_star_awards (
  order_id uuid primary key references public.merchandise_orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stars_awarded integer not null check (stars_awarded >= 0),
  order_total_cents integer not null,
  awarded_at timestamptz not null default now(),
  revoked_at timestamptz,
  points_transaction_id uuid references public.points_transactions(id) on delete set null
);

create unique index if not exists points_unique_shop_order
  on public.points_transactions (user_id, entity_type, entity_id)
  where reason = 'shop_order';

-- ─── Adventskalender (Vorbereitung) ─────────────────────────────────────────
create table if not exists public.advent_calendar_days (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year >= 2024 and year <= 2100),
  day_number integer not null check (day_number >= 1 and day_number <= 24),
  title text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  opens_at timestamptz,
  members_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, day_number)
);

create table if not exists public.advent_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.advent_calendar_days(id) on delete cascade,
  content_type text not null default 'placeholder'
    check (content_type in ('text', 'image', 'video', 'giveaway', 'quiz', 'discount', 'placeholder')),
  title text,
  body text,
  media_path text,
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists advent_calendar_entries_day_idx
  on public.advent_calendar_entries (day_id, sort_order);

drop trigger if exists advent_calendar_days_set_updated_at on public.advent_calendar_days;
create trigger advent_calendar_days_set_updated_at
before update on public.advent_calendar_days
for each row execute function public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.achievement_progress enable row level security;
alter table public.referral_conversions enable row level security;
alter table public.merchandise_order_star_awards enable row level security;
alter table public.advent_calendar_days enable row level security;
alter table public.advent_calendar_entries enable row level security;

drop policy if exists "achievement_definitions_select_all" on public.achievement_definitions;
create policy "achievement_definitions_select_all"
on public.achievement_definitions for select to authenticated using (true);

drop policy if exists "user_achievements_select_own" on public.user_achievements;
create policy "user_achievements_select_own"
on public.user_achievements for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "achievement_progress_select_own" on public.achievement_progress;
create policy "achievement_progress_select_own"
on public.achievement_progress for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "referral_conversions_select" on public.referral_conversions;
create policy "referral_conversions_select"
on public.referral_conversions for select to authenticated
using (referrer_user_id = auth.uid() or public.is_admin());

drop policy if exists "merchandise_order_star_awards_select_own" on public.merchandise_order_star_awards;
create policy "merchandise_order_star_awards_select_own"
on public.merchandise_order_star_awards for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "advent_calendar_days_select_published" on public.advent_calendar_days;
create policy "advent_calendar_days_select_published"
on public.advent_calendar_days for select to authenticated
using (status = 'published' or public.is_admin());

drop policy if exists "advent_calendar_days_admin_all" on public.advent_calendar_days;
create policy "advent_calendar_days_admin_all"
on public.advent_calendar_days for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "advent_calendar_entries_select" on public.advent_calendar_entries;
create policy "advent_calendar_entries_select"
on public.advent_calendar_entries for select to authenticated
using (
  exists (
    select 1 from public.advent_calendar_days d
    where d.id = day_id and (d.status = 'published' or public.is_admin())
  )
);

drop policy if exists "advent_calendar_entries_admin_all" on public.advent_calendar_entries;
create policy "advent_calendar_entries_admin_all"
on public.advent_calendar_entries for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- ─── Badge-Katalog seed ───────────────────────────────────────────────────────
insert into public.achievement_definitions
  (slug, name, category, description, icon_key, metric, bronze_threshold, silver_threshold, gold_threshold, platinum_threshold, sort_order)
values
  ('concert_pro', 'Konzertprofi', 'events', 'Bestätigte Event-Teilnahmen über „Ich bin dabei“.', 'music', 'event_participations', 3, 10, 25, 50, 10),
  ('voting_hero', 'Votingheld', 'community', 'Teilnahmen an Umfragen in der App.', 'vote', 'poll_votes', 5, 10, 25, 50, 20),
  ('birthday_greeter', 'Geburtstagsgratulant', 'community', 'Gratulationen unter Geburtstags-Beiträgen im Feed.', 'cake', 'birthday_comments', 3, 10, 25, 50, 30),
  ('club_veteran', 'Fanclub-Urgestein', 'membership', 'Dauer der aktiven Mitgliedschaft im Fanclub.', 'shield', 'membership_years', 1, 2, 5, 10, 40),
  ('merch_legend', 'Merch-Legende', 'shop', 'Gekaufte Artikel im Fanshop (versendet, nicht storniert).', 'shirt', 'merch_items_purchased', 5, 15, 25, 50, 50),
  ('referral_pro', 'Werbeprofi', 'referrals', 'Empfehlungsmails und erfolgreich geworbene Mitglieder.', 'users', 'referral_score', 5, 10, 20, 20, 60)
on conflict (slug) do nothing;
