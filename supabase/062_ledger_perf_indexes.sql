-- Performance: Buchhaltung & Beitragsstatus bei vielen Mitgliedern

create index if not exists club_ledger_member_membership_idx
  on public.club_ledger_entries (member_id, entry_date)
  where entry_type = 'income' and category = 'membership';

create index if not exists memberships_active_user_idx
  on public.memberships (user_id)
  where status = 'active';
