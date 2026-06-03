-- Punkte für erfolgreiche Antrags-Einladung per E-Mail (+20, einmal pro Empfänger-Adresse)
-- Run in Supabase SQL Editor.

create table if not exists public.membership_referral_sends (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists membership_referral_sends_unique_email
  on public.membership_referral_sends (sender_id, (lower(trim(recipient_email))));

alter table public.membership_referral_sends enable row level security;

drop policy if exists "membership_referral_sends_select_own" on public.membership_referral_sends;
create policy "membership_referral_sends_select_own"
on public.membership_referral_sends
for select to authenticated
using (sender_id = auth.uid());

create unique index if not exists points_unique_membership_referral
  on public.points_transactions (user_id, entity_type, entity_id)
  where reason = 'membership_referral';
