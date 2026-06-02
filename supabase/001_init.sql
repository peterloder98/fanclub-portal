-- Minimal schema for early development/testing.
-- Run in Supabase SQL Editor.

-- Enable pgcrypto for gen_random_uuid() if not already enabled
create extension if not exists pgcrypto;

-- Roles (later we can move to a dedicated roles table if needed)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'anni', 'member');
  end if;
end$$;

-- Public profiles table (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'member',

  username text not null unique,
  email text,

  first_name text not null,
  last_name text not null,
  birthdate date,
  gender text,

  street text,
  postal_code text,
  city text,
  country text,
  phone text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Memberships (separate so reactivation/history can evolve later)
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  start_date date not null,
  end_date date not null,
  fee_cents integer not null default 0,
  status text not null default 'active', -- active | inactive

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memberships_user_id_idx on public.memberships(user_id);
create unique index if not exists memberships_unique_user_start on public.memberships(user_id, start_date);

-- Updated-at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

