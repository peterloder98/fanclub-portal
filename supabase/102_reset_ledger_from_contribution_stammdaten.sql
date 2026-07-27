-- Fake-/Test-Buchungen entfernen und echte Mitgliedsbeiträge aus Stammdaten neu anlegen.
-- Im Supabase SQL Editor ausführen.
--
-- Entfernt:
--   - alle bisherigen club_ledger_entries (inkl. Seed aus 051_seed_test_ledger.sql)
--   - zugehörige Activity-Log-Einträge zu Ledger/Zahlungen
-- Behält / legt neu an:
--   - eine Einnahme „Mitgliedsbeitrag“ je aktivem Mitglied mit gesetztem
--     profiles.contribution_date (Stammdatum) und memberships.fee_cents

begin;

-- 1) Historie zu Ledger-/Beitragseinträgen bereinigen
delete from public.member_activity_log
where event_type in ('payment_received', 'ledger_income', 'ledger_expense')
   or coalesce(metadata->>'ledger_entry_id', '') <> '';

-- 2) Alle bisherigen Buchungen entfernen (Fake-Seed + sonstige Testeinträge)
delete from public.club_ledger_entries;

-- 3) Echte Mitgliedsbeiträge aus Stammdaten (contribution_date + fee_cents)
insert into public.club_ledger_entries (
  entry_type,
  amount_cents,
  description,
  category,
  member_id,
  entry_date,
  bookkeeping_status
)
select
  'income',
  coalesce(m.fee_cents, 1500),
  'Mitgliedsbeitrag ' || extract(year from p.contribution_date::date)::text,
  'membership',
  p.id,
  p.contribution_date::date,
  'paid'
from public.profiles p
join public.memberships m on m.user_id = p.id
where m.status = 'active'
  and p.contribution_date is not null
  and p.contribution_date::text ~ '^\d{4}-\d{2}-\d{2}';

-- 4) Jahreszähler für Belegnummern neu aufbauen (falls Tabelle existiert)
do $$
begin
  if to_regclass('public.club_ledger_year_counters') is not null then
    delete from public.club_ledger_year_counters;
    insert into public.club_ledger_year_counters (fiscal_year, last_seq)
    select
      extract(year from entry_date)::int as fiscal_year,
      count(*)::int as last_seq
    from public.club_ledger_entries
    group by 1;
  end if;
end $$;

commit;
