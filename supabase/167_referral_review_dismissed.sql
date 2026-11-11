-- Status für automatisch geschlossene Doppel-Prüfungen.
-- Die App schließt solche Fälle auch ohne dieses Skript (dann als „released“
-- mit der Notiz „Automatisch geschlossen: …“). Dieses Skript nur im
-- Supabase-SQL-Editor ausführen, damit der Status „dismissed“ heißt.
-- Vorstandsentscheidungen (released / clawed_back) bleiben unverändert.

alter table public.membership_referral_reviews
  drop constraint if exists membership_referral_reviews_status_check;

alter table public.membership_referral_reviews
  add constraint membership_referral_reviews_status_check
  check (status in ('open', 'released', 'clawed_back', 'dismissed'));

comment on column public.membership_referral_reviews.status is
  'open = wartet auf Vorstand; released = Punkte freigegeben; clawed_back = Punkte zurückgenommen; dismissed = automatisch geschlossen, dieselben Einladungen waren schon entschieden';
