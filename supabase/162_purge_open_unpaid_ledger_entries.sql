-- Offene Vor-Buchungen (bookkeeping_status = open) für noch nicht bezahlte Zahlungen
-- aus der Kasse entfernen. payments-Zeilen unter Admin → Zahlungen bleiben erhalten.
-- Buchhaltung / Zahlungsliste zeigt erst nach Bestätigung Einnahmen.

delete from public.club_ledger_entries e
using public.payments p
where e.payment_id = p.id
  and e.bookkeeping_status = 'open'
  and p.payment_status is distinct from 'paid';

-- Orphan open rows (payment already gone)
delete from public.club_ledger_entries
where bookkeeping_status = 'open'
  and payment_id is not null
  and not exists (
    select 1 from public.payments p where p.id = club_ledger_entries.payment_id
  );
