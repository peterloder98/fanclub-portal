-- SMTP accounts for outbound mail (admin-managed)
-- Run in Supabase SQL Editor. Set SMTP_SECRET in app env (not in DB).

create table if not exists public.smtp_accounts (
  id uuid primary key default gen_random_uuid(),
  server text not null,
  port integer not null,
  encryption text not null default 'SSL', -- SSL | TLS | STARTTLS | NONE
  email text not null,
  password_ciphertext text not null,
  display_name text,
  reply_to text,
  is_default boolean not null default false,
  artistflow_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smtp_accounts_default_idx on public.smtp_accounts(is_default);

drop trigger if exists smtp_accounts_set_updated_at on public.smtp_accounts;
create trigger smtp_accounts_set_updated_at
before update on public.smtp_accounts
for each row execute function public.set_updated_at();

alter table public.smtp_accounts enable row level security;

-- No policies: access only via service role in API routes.
