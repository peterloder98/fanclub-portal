-- Online membership applications (Antrag)
-- Run in Supabase SQL Editor after 001_init.sql

create extension if not exists pgcrypto;

create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'submitted', -- submitted | reviewed | approved | rejected

  first_name text not null,
  last_name text not null,
  birthdate date not null,
  gender text,
  street text not null,
  postal_code text not null,
  city text not null,
  country text not null default 'Deutschland',
  phone text not null,
  email text not null,

  membership_start_date date,
  account_holder text,
  iban text,
  bic text,

  privacy_accepted boolean not null default false,
  statute_accepted boolean not null default false,
  media_consent boolean not null default false,

  signature_applicant_path text,
  signature_guardian_path text,
  signed_at_place text not null,
  signed_at_date date not null,

  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists membership_applications_status_idx
  on public.membership_applications(status, created_at desc);

create index if not exists membership_applications_email_idx
  on public.membership_applications(email);

drop trigger if exists membership_applications_set_updated_at on public.membership_applications;
create trigger membership_applications_set_updated_at
before update on public.membership_applications
for each row execute function public.set_updated_at();

alter table public.membership_applications enable row level security;

drop policy if exists "membership_applications_select_admin" on public.membership_applications;
create policy "membership_applications_select_admin"
on public.membership_applications
for select to authenticated
using (public.is_admin());

drop policy if exists "membership_applications_update_admin" on public.membership_applications;
create policy "membership_applications_update_admin"
on public.membership_applications
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Inserts happen via service role in API route (no public insert policy).
--
-- Storage: create bucket `membership-signatures` (private) in Supabase Dashboard.
-- Signatures bucket `signatures` (private) for admin signatures — use signed URLs via API.
