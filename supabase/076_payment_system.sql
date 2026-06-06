-- Zahlungssystem (Testmodus): payments, Einstellungen, offene Buchhaltungsposten
-- Nach 075 in Supabase SQL Editor ausführen.

-- ── Referenznummern (BESTELLUNG-2026-0001, MITGLIED-2026-0001) ──────────────

create table if not exists public.payment_reference_counters (
  year int primary key,
  shop_seq int not null default 0 check (shop_seq >= 0),
  membership_seq int not null default 0 check (membership_seq >= 0)
);

insert into public.payment_reference_counters (year, shop_seq, membership_seq)
values (extract(year from current_date)::int, 0, 0)
on conflict (year) do nothing;

-- ── Zahlungsanbieter-Einstellungen ───────────────────────────────────────────

create table if not exists public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique
    check (provider in ('bank_transfer', 'paypal', 'stripe')),
  is_enabled boolean not null default true,
  is_test_mode boolean not null default true,
  public_config_json jsonb not null default '{}'::jsonb,
  private_config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists payment_settings_set_updated_at on public.payment_settings;
create trigger payment_settings_set_updated_at
before update on public.payment_settings
for each row execute function public.set_updated_at();

insert into public.payment_settings (provider, is_enabled, is_test_mode, public_config_json)
values
  (
    'bank_transfer',
    true,
    false,
    jsonb_build_object(
      'account_holder', 'Anni Perka Fanclub e.V.',
      'iban', 'DE00 0000 0000 0000 0000 00',
      'bic', 'TESTDE00XXX',
      'bank_name', 'Platzhalter-Bank'
    )
  ),
  ('paypal', true, true, jsonb_build_object('client_id_placeholder', 'PAYPAL_TEST_CLIENT_ID')),
  ('stripe', true, true, jsonb_build_object('publishable_key_placeholder', 'pk_test_placeholder'))
on conflict (provider) do nothing;

-- ── Zahlungen ────────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid references public.merchandise_orders(id) on delete set null,
  membership_id uuid references public.memberships(id) on delete set null,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'EUR',
  payment_type text not null
    check (payment_type in ('shop_order', 'membership_fee', 'other')),
  payment_method text not null
    check (payment_method in ('bank_transfer', 'paypal', 'stripe')),
  payment_status text not null default 'open'
    check (payment_status in ('open', 'pending', 'simulated', 'paid', 'cancelled', 'failed')),
  provider_reference text,
  internal_reference text not null,
  due_date date,
  paid_at timestamptz,
  manually_confirmed_by uuid references public.profiles(id) on delete set null,
  manually_confirmed_at timestamptz,
  admin_note text,
  receipt_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_internal_reference_uidx
  on public.payments (internal_reference);

create index if not exists payments_status_idx
  on public.payments (payment_status, created_at desc);

create index if not exists payments_user_idx
  on public.payments (user_id, created_at desc);

create index if not exists payments_order_idx
  on public.payments (order_id)
  where order_id is not null;

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- ── Buchhaltung: offene Posten (Erweiterung club_ledger_entries) ─────────────

alter table public.club_ledger_entries
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists order_id uuid references public.merchandise_orders(id) on delete set null,
  add column if not exists bookkeeping_status text
    check (bookkeeping_status is null or bookkeeping_status in ('open', 'paid', 'cancelled')),
  add column if not exists updated_at timestamptz not null default now();

-- Bestehende manuelle Buchungen gelten als bestätigt
update public.club_ledger_entries
set bookkeeping_status = 'paid'
where bookkeeping_status is null;

create index if not exists club_ledger_payment_idx
  on public.club_ledger_entries (payment_id)
  where payment_id is not null;

create index if not exists club_ledger_bookkeeping_status_idx
  on public.club_ledger_entries (bookkeeping_status, entry_date desc)
  where bookkeeping_status is not null;

drop trigger if exists club_ledger_entries_set_updated_at on public.club_ledger_entries;
create trigger club_ledger_entries_set_updated_at
before update on public.club_ledger_entries
for each row execute function public.set_updated_at();

-- ── Shop: Zahlungsstatus (getrennt vom Versandstatus) ────────────────────────

alter table public.merchandise_orders
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'cancelled'));

-- ── Audit-Log für manuelle Zahlungsänderungen ────────────────────────────────

create table if not exists public.payment_audit_log (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  action text not null,
  old_status text,
  new_status text,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payment_audit_log_payment_idx
  on public.payment_audit_log (payment_id, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.payment_settings enable row level security;
alter table public.payments enable row level security;
alter table public.payment_audit_log enable row level security;
alter table public.payment_reference_counters enable row level security;

-- Einstellungen: Mitglieder sehen nur öffentliche Felder via Server; keine Client-Policy
drop policy if exists "payment_settings_admin_all" on public.payment_settings;
create policy "payment_settings_admin_all"
on public.payment_settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin"
on public.payments for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own"
on public.payments for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "payments_update_admin" on public.payments;
create policy "payments_update_admin"
on public.payments for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "payment_audit_log_admin" on public.payment_audit_log;
create policy "payment_audit_log_admin"
on public.payment_audit_log for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "payment_reference_counters_admin" on public.payment_reference_counters;
create policy "payment_reference_counters_admin"
on public.payment_reference_counters for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Ledger: Mitglieder dürfen eigene offene Posten lesen (optional für „Meine Zahlungen“)
drop policy if exists "club_ledger_member_read_own" on public.club_ledger_entries;
create policy "club_ledger_member_read_own"
on public.club_ledger_entries for select to authenticated
using (
  member_id = auth.uid()
  and payment_id is not null
);
