-- Artistflow feed sync tables (events + cache + logs)
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.external_events (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'artistflow',
  external_id text not null,

  title text not null,
  start_at timestamptz,
  timezone text,
  venue text,
  address text,
  postal_code text,
  city text,
  country text,
  ticket_url text,
  published boolean not null default true,
  secret boolean not null default false,

  feed_updated_at timestamptz,
  content_hash text not null,

  lat double precision,
  lng double precision,
  geocoding_status text not null default 'pending', -- pending|success|failed
  geocoded_at timestamptz,

  last_seen_at timestamptz not null default now(),
  is_visible boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (source, external_id)
);

create index if not exists external_events_visible_idx on public.external_events(is_visible, start_at);

create table if not exists public.geocoding_cache (
  id uuid primary key default gen_random_uuid(),
  address_signature text not null unique,
  lat double precision,
  lng double precision,
  status text not null, -- success|failed
  geocoded_at timestamptz not null default now()
);

create table if not exists public.artistflow_sync_logs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  feed_url text,
  total integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  hidden integer not null default 0,
  geocoding_queued integer not null default 0,
  error text
);

-- updated_at trigger (re-use existing function)
drop trigger if exists external_events_set_updated_at on public.external_events;
create trigger external_events_set_updated_at
before update on public.external_events
for each row execute function public.set_updated_at();

alter table public.external_events enable row level security;
alter table public.artistflow_sync_logs enable row level security;

drop policy if exists "external_events_select_auth_visible" on public.external_events;
create policy "external_events_select_auth_visible"
on public.external_events
for select to authenticated
using (is_visible = true and published = true and secret = false);

drop policy if exists "external_events_select_admin_all" on public.external_events;
create policy "external_events_select_admin_all"
on public.external_events
for select to authenticated
using (public.is_admin());

drop policy if exists "sync_logs_select_admin" on public.artistflow_sync_logs;
create policy "sync_logs_select_admin"
on public.artistflow_sync_logs
for select to authenticated
using (public.is_admin());

