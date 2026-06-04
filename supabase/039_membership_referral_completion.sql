-- Werbung: Antrag verknüpfen, +100 Punkte nach Freigabe, Benachrichtigung bei Einreichung
-- Run in Supabase SQL Editor after 038_membership_referral_points.sql

alter table public.membership_applications
  add column if not exists referred_by_user_id uuid references public.profiles(id) on delete set null;

alter table public.membership_applications
  add column if not exists referrer_notified_at timestamptz;

alter table public.membership_referral_sends
  add column if not exists application_id uuid references public.membership_applications(id) on delete set null;

create index if not exists membership_applications_referred_by_idx
  on public.membership_applications (referred_by_user_id)
  where referred_by_user_id is not null;

create unique index if not exists points_unique_membership_referral_completed
  on public.points_transactions (user_id, entity_type, entity_id)
  where reason = 'membership_referral_completed';
