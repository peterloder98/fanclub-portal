-- Merchandise orders (see 057_merchandise_orders.sql)

alter table public.merchandise_variants
  add column if not exists qty_reserved int not null default 0 check (qty_reserved >= 0);

create table if not exists public.merchandise_product_ledger_links (
  product_id uuid not null references public.merchandise_products(id) on delete cascade,
  ledger_entry_id uuid not null references public.club_ledger_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, ledger_entry_id)
);

create table if not exists public.merchandise_stock_receipts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.merchandise_products(id) on delete cascade,
  variant_id uuid references public.merchandise_variants(id) on delete set null,
  qty_added int not null check (qty_added > 0),
  ledger_entry_id uuid references public.club_ledger_entries(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.merchandise_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'shipped', 'cancelled')),
  buyer_first_name text not null,
  buyer_last_name text not null,
  buyer_email text not null,
  buyer_phone text,
  buyer_street text not null,
  buyer_postal_code text not null,
  buyer_city text not null,
  buyer_country text not null default 'DE',
  total_cents int not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  shipped_at timestamptz,
  cancelled_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.merchandise_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.merchandise_orders(id) on delete cascade,
  product_id uuid references public.merchandise_products(id) on delete set null,
  variant_id uuid references public.merchandise_variants(id) on delete set null,
  product_name text not null,
  size_label text,
  qty int not null check (qty > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  line_total_cents int not null check (line_total_cents >= 0)
);

create table if not exists public.merchandise_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.merchandise_orders(id) on delete cascade,
  event_type text not null,
  title text not null,
  details text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.merchandise_stock_receipts enable row level security;
alter table public.merchandise_product_ledger_links enable row level security;
alter table public.merchandise_orders enable row level security;
alter table public.merchandise_order_items enable row level security;
alter table public.merchandise_order_events enable row level security;

drop policy if exists "merchandise_products_member_read_sale" on public.merchandise_products;
create policy "merchandise_products_member_read_sale"
on public.merchandise_products for select to authenticated
using (sale_price_cents > 0);

drop policy if exists "merchandise_variants_member_read_sale" on public.merchandise_variants;
create policy "merchandise_variants_member_read_sale"
on public.merchandise_variants for select to authenticated
using (exists (select 1 from public.merchandise_products p where p.id = product_id and p.sale_price_cents > 0));

drop policy if exists "merchandise_stock_receipts_admin" on public.merchandise_stock_receipts;
create policy "merchandise_stock_receipts_admin"
on public.merchandise_stock_receipts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "merchandise_ledger_links_admin" on public.merchandise_product_ledger_links;
create policy "merchandise_ledger_links_admin"
on public.merchandise_product_ledger_links for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "merchandise_orders_select_own_or_admin" on public.merchandise_orders;
create policy "merchandise_orders_select_own_or_admin"
on public.merchandise_orders for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "merchandise_orders_insert_own" on public.merchandise_orders;
create policy "merchandise_orders_insert_own"
on public.merchandise_orders for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "merchandise_orders_update_admin" on public.merchandise_orders;
create policy "merchandise_orders_update_admin"
on public.merchandise_orders for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "merchandise_order_items_select" on public.merchandise_order_items;
create policy "merchandise_order_items_select"
on public.merchandise_order_items for select to authenticated
using (exists (select 1 from public.merchandise_orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

drop policy if exists "merchandise_order_items_insert_own" on public.merchandise_order_items;
create policy "merchandise_order_items_insert_own"
on public.merchandise_order_items for insert to authenticated
with check (exists (select 1 from public.merchandise_orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "merchandise_order_events_select" on public.merchandise_order_events;
create policy "merchandise_order_events_select"
on public.merchandise_order_events for select to authenticated
using (exists (select 1 from public.merchandise_orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

drop policy if exists "merchandise_order_events_admin_insert" on public.merchandise_order_events;
create policy "merchandise_order_events_admin_insert"
on public.merchandise_order_events for insert to authenticated
with check (public.is_admin());
