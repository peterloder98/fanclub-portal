-- Wiederverwendbare Club-Setup-Tokens (App-Zugang / Passwort einrichten).
-- Gültig bis Passwort gesetzt oder Ablauf — nicht One-Shot wie Supabase recovery OTP.
-- Im Supabase SQL Editor ausführen, falls Skript-Apply fehlschlägt.

create table if not exists public.account_setup_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint account_setup_tokens_token_hash_unique unique (token_hash)
);

create index if not exists account_setup_tokens_user_id_idx
  on public.account_setup_tokens (user_id);

create index if not exists account_setup_tokens_active_idx
  on public.account_setup_tokens (user_id, expires_at)
  where consumed_at is null;

comment on table public.account_setup_tokens is
  'Club-eigene Setup-Links: wiederverwendbar bis consumed_at oder expires_at; Hash at rest.';

alter table public.account_setup_tokens enable row level security;
-- Keine öffentlichen Policies: Zugriff nur über Service-Role (Server).
