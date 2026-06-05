-- E-Mail-Versandhistorie (Erfolg/Fehler, erneut senden)

create table if not exists public.email_send_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null check (status in ('sent', 'failed', 'skipped')),
  to_address text not null,
  subject text not null,
  body_text text not null,
  body_html text,
  error_message text,
  skip_reason text,
  template_key text,
  context jsonb not null default '{}'::jsonb,
  smtp_account_id uuid,
  retry_of uuid references public.email_send_log (id) on delete set null,
  resent_at timestamptz
);

create index if not exists email_send_log_created_idx on public.email_send_log (created_at desc);
create index if not exists email_send_log_status_idx on public.email_send_log (status, created_at desc);

alter table public.email_send_log enable row level security;

-- Nur Server/Admin (keine öffentliche Policy)
