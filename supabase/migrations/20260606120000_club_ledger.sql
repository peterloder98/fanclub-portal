-- Mini-Buchhaltung: Einnahmen & Ausgaben (optional einem Mitglied zugeordnet)

create table if not exists public.club_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('income', 'expense')),
  amount_cents int not null check (amount_cents > 0),
  description text not null,
  category text not null default 'general'
    check (category in ('membership', 'merchandise', 'event', 'general', 'other')),
  member_id uuid references public.profiles(id) on delete set null,
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists club_ledger_entries_date_idx
  on public.club_ledger_entries (entry_date desc, created_at desc);

create index if not exists club_ledger_entries_member_idx
  on public.club_ledger_entries (member_id, entry_date desc)
  where member_id is not null;

alter table public.club_ledger_entries enable row level security;

drop policy if exists "club_ledger_admin_all" on public.club_ledger_entries;
create policy "club_ledger_admin_all"
on public.club_ledger_entries
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

update public.profiles p
set warning_count = w.cnt
from (
  select member_id, count(*)::int as cnt
  from public.member_warnings
  group by member_id
) w
where p.id = w.member_id and p.warning_count < w.cnt;
