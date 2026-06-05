-- Belege, Merchandise, Verknüpfung Buchung ↔ Historie

alter table public.club_ledger_entries
  add column if not exists receipt_storage_path text;

alter table public.club_ledger_entries
  add column if not exists activity_log_id uuid references public.member_activity_log(id) on delete set null;

create index if not exists club_ledger_activity_log_idx
  on public.club_ledger_entries (activity_log_id)
  where activity_log_id is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-documents',
  'club-documents',
  false,
  524288,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create table if not exists public.merchandise_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sale_price_cents int not null check (sale_price_cents > 0),
  purchase_total_cents int check (purchase_total_cents is null or purchase_total_cents >= 0),
  image_path text,
  has_sizes boolean not null default false,
  ledger_entry_id uuid references public.club_ledger_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.merchandise_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.merchandise_products(id) on delete cascade,
  size_label text,
  qty_purchased int not null default 0 check (qty_purchased >= 0),
  qty_sold int not null default 0 check (qty_sold >= 0),
  qty_gifted int not null default 0 check (qty_gifted >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, size_label)
);

create index if not exists merchandise_variants_product_idx
  on public.merchandise_variants (product_id);

alter table public.merchandise_products enable row level security;
alter table public.merchandise_variants enable row level security;

drop policy if exists "merchandise_products_admin_all" on public.merchandise_products;
create policy "merchandise_products_admin_all"
on public.merchandise_products for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "merchandise_variants_admin_all" on public.merchandise_variants;
create policy "merchandise_variants_admin_all"
on public.merchandise_variants for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
