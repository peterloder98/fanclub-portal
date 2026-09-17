-- Abrechnung Anni & Management (vertraulich).
-- Zugang: role=anni, Peter Loder, profiles.is_management.
-- Nicht für den übrigen Vorstand, nicht für das Vorschau-Konto.

alter table public.profiles
  add column if not exists is_hidden boolean not null default false;

alter table public.profiles
  add column if not exists browse_only boolean not null default false;

alter table public.profiles
  add column if not exists is_management boolean not null default false;

comment on column public.profiles.is_management is
  'Verstecktes Management (z. B. Jo/Leo): Zugang nur zur Anni-Abrechnung, nicht Mitgliederverzeichnis.';

create index if not exists profiles_is_management_idx
  on public.profiles (is_management)
  where is_management = true;

update public.profiles
set is_hidden = true
where id = '1b70d88f-e28d-48f3-b3cb-646eaf06f19a'
  and is_hidden is distinct from true;

create or replace function public.is_anni_management_finance_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.browse_only, false) = false
      and p.id <> '9f3c2e18-7a64-4d1b-b8e0-2c5a9f17d6e4'::uuid
      and (
        p.id = '1b70d88f-e28d-48f3-b3cb-646eaf06f19a'::uuid
        or p.role = 'anni'
        or coalesce(p.is_management, false)
      )
  );
$$;

create table if not exists public.anni_mgmt_income_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  constraint anni_mgmt_income_types_label_unique unique (label)
);

insert into public.anni_mgmt_income_types (label, sort_order)
values
  ('Gage', 10),
  ('GEMA', 20),
  ('GVL', 30)
on conflict (label) do nothing;

create table if not exists public.anni_mgmt_jobs (
  id uuid primary key default gen_random_uuid(),
  performance_date date not null,
  label text not null,
  description text,
  invoice_due_date date not null,
  invoice_sent boolean not null default false,
  invoice_sent_at date,
  paid boolean not null default false,
  paid_at date,
  invoice_pdf_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anni_mgmt_jobs_paid_date check (not paid or paid_at is not null)
);

create index if not exists anni_mgmt_jobs_paid_at_idx
  on public.anni_mgmt_jobs (paid_at desc)
  where paid;

create index if not exists anni_mgmt_jobs_due_idx
  on public.anni_mgmt_jobs (invoice_due_date);

create table if not exists public.anni_mgmt_job_lines (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.anni_mgmt_jobs (id) on delete cascade,
  line_kind text not null
    check (line_kind in (
      'income',
      'travel_to_client',
      'extra_client_spesen',
      'expense_travel',
      'expense_other'
    )),
  income_type text,
  amount_cents int not null check (amount_cents >= 0),
  traveler text check (traveler is null or traveler in ('anni', 'management')),
  travel_mode text check (
    travel_mode is null
    or travel_mode in ('bahn', 'flug', 'zug', 'auto', 'hotel', 'spesen', 'auslagen', 'other')
  ),
  km numeric(10, 2),
  route_description text,
  reimbursed_at timestamptz,
  reimbursed_year int,
  reimbursed_month int check (
    reimbursed_month is null
    or (reimbursed_month >= 1 and reimbursed_month <= 12)
  ),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists anni_mgmt_job_lines_job_idx
  on public.anni_mgmt_job_lines (job_id);

create index if not exists anni_mgmt_job_lines_mgmt_travel_idx
  on public.anni_mgmt_job_lines (traveler, reimbursed_at)
  where line_kind = 'expense_travel' and traveler = 'management';

create table if not exists public.anni_mgmt_pool_payouts (
  id uuid primary key default gen_random_uuid(),
  payout_date date not null,
  amount_cents int not null check (amount_cents > 0),
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.anni_mgmt_month_settlements (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month >= 1 and month <= 12),
  income_base_cents int not null default 0,
  fee_cents int not null default 0,
  management_travel_cents int not null default 0,
  total_cents int not null default 0,
  settled_at timestamptz not null default now(),
  settled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint anni_mgmt_month_settlements_year_month unique (year, month)
);

alter table public.anni_mgmt_income_types enable row level security;
alter table public.anni_mgmt_jobs enable row level security;
alter table public.anni_mgmt_job_lines enable row level security;
alter table public.anni_mgmt_pool_payouts enable row level security;
alter table public.anni_mgmt_month_settlements enable row level security;

drop policy if exists "anni_mgmt_income_types_all" on public.anni_mgmt_income_types;
create policy "anni_mgmt_income_types_all"
on public.anni_mgmt_income_types for all to authenticated
using (public.is_anni_management_finance_user())
with check (public.is_anni_management_finance_user());

drop policy if exists "anni_mgmt_jobs_all" on public.anni_mgmt_jobs;
create policy "anni_mgmt_jobs_all"
on public.anni_mgmt_jobs for all to authenticated
using (public.is_anni_management_finance_user())
with check (public.is_anni_management_finance_user());

drop policy if exists "anni_mgmt_job_lines_all" on public.anni_mgmt_job_lines;
create policy "anni_mgmt_job_lines_all"
on public.anni_mgmt_job_lines for all to authenticated
using (public.is_anni_management_finance_user())
with check (public.is_anni_management_finance_user());

drop policy if exists "anni_mgmt_pool_payouts_all" on public.anni_mgmt_pool_payouts;
create policy "anni_mgmt_pool_payouts_all"
on public.anni_mgmt_pool_payouts for all to authenticated
using (public.is_anni_management_finance_user())
with check (public.is_anni_management_finance_user());

drop policy if exists "anni_mgmt_month_settlements_all" on public.anni_mgmt_month_settlements;
create policy "anni_mgmt_month_settlements_all"
on public.anni_mgmt_month_settlements for all to authenticated
using (public.is_anni_management_finance_user())
with check (public.is_anni_management_finance_user());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anni-management-docs',
  'anni-management-docs',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anni_mgmt_docs_select" on storage.objects;
create policy "anni_mgmt_docs_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'anni-management-docs'
  and public.is_anni_management_finance_user()
);

drop policy if exists "anni_mgmt_docs_insert" on storage.objects;
create policy "anni_mgmt_docs_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'anni-management-docs'
  and public.is_anni_management_finance_user()
);

drop policy if exists "anni_mgmt_docs_update" on storage.objects;
create policy "anni_mgmt_docs_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'anni-management-docs'
  and public.is_anni_management_finance_user()
)
with check (
  bucket_id = 'anni-management-docs'
  and public.is_anni_management_finance_user()
);

drop policy if exists "anni_mgmt_docs_delete" on storage.objects;
create policy "anni_mgmt_docs_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'anni-management-docs'
  and public.is_anni_management_finance_user()
);
