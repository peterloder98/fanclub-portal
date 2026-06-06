-- Apple Pay, Amazon Pay + Zahlungen für Mitgliedsanträge
-- Nach 076 in Supabase SQL Editor ausführen.

alter table public.payments
  add column if not exists application_id uuid references public.membership_applications(id) on delete set null;

create index if not exists payments_application_idx
  on public.payments (application_id)
  where application_id is not null;

alter table public.payment_settings drop constraint if exists payment_settings_provider_check;
alter table public.payment_settings
  add constraint payment_settings_provider_check
  check (provider in ('bank_transfer', 'paypal', 'stripe', 'apple_pay', 'amazon_pay'));

insert into public.payment_settings (provider, is_enabled, is_test_mode, public_config_json)
values
  ('apple_pay', true, true, jsonb_build_object('merchant_id_placeholder', 'merchant.com.placeholder')),
  ('amazon_pay', true, true, jsonb_build_object('seller_id_placeholder', 'AMAZON_PAY_TEST_SELLER'))
on conflict (provider) do nothing;

alter table public.payments drop constraint if exists payments_payment_method_check;
alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method in ('bank_transfer', 'paypal', 'stripe', 'apple_pay', 'amazon_pay'));
