-- Bankdaten werden nicht erhoben; bestehende Antragswerte löschen.
update public.membership_applications
set
  account_holder = null,
  iban = null,
  bic = null
where account_holder is not null
   or iban is not null
   or bic is not null;
