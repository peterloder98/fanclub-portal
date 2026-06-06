-- Shop: Versandkosten in Bestellungen ausweisen (nach 077)
alter table public.merchandise_orders
  add column if not exists subtotal_cents int,
  add column if not exists shipping_cents int not null default 0 check (shipping_cents >= 0);

-- Bestehende Bestellungen: bisheriger Gesamtbetrag = Warenwert, ohne Versand
update public.merchandise_orders
set
  subtotal_cents = total_cents,
  shipping_cents = 0
where subtotal_cents is null;
