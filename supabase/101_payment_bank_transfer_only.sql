-- Nur Banküberweisung aktiv (PayPal/Stripe/Wallets aus)

update public.payment_settings
set is_enabled = false
where provider is distinct from 'bank_transfer';

insert into public.payment_settings (provider, is_enabled, is_test_mode, public_config_json)
values ('bank_transfer', true, false, '{}'::jsonb)
on conflict (provider) do update set is_enabled = true;
