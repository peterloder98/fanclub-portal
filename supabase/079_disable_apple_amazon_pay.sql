-- Apple Pay und Amazon Pay deaktivieren (nicht mehr im Checkout anbieten)
-- Nach 077 in Supabase SQL Editor ausführen.

update public.payment_settings
set is_enabled = false, updated_at = now()
where provider in ('apple_pay', 'amazon_pay');
