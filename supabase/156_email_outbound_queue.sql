-- Gedrosselter Massenversand: Warteschlange für Club-SMTP (web.de etc.)

create table if not exists public.email_outbound_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  send_after timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'cancelled')),
  to_address text not null,
  template_key text not null,
  template_vars jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  dedupe_key text,
  error_message text,
  attempts int not null default 0,
  sent_at timestamptz
);

create index if not exists email_outbound_queue_pending_idx
  on public.email_outbound_queue (status, send_after, created_at);

create unique index if not exists email_outbound_queue_dedupe_pending
  on public.email_outbound_queue (dedupe_key)
  where status = 'pending' and dedupe_key is not null;

alter table public.email_outbound_queue enable row level security;
