alter table public.merchandise_products
  drop constraint if exists merchandise_products_sale_price_cents_check;

alter table public.merchandise_products
  add constraint merchandise_products_sale_price_cents_check
  check (sale_price_cents >= 0);
