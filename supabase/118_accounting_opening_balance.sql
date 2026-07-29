-- Buchhaltung: Anfangsbestand + Mitgliedsbeiträge nur für Mitgliederverwaltung
alter table club_ledger_entries
  add column if not exists include_in_accounting boolean not null default true;

comment on column club_ledger_entries.include_in_accounting is
  'false = nur Mitgliederverwaltung (z. B. Beiträge), nicht in Buchhaltungs-Saldo';

update club_ledger_entries
set include_in_accounting = false
where category = 'membership';
