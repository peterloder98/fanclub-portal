-- Dualer Jahresbeitrag für Neuanträge: Kenntnisnahme der Beitragstufen (15 € DE / 20 € Ausland).
alter table public.membership_applications
  add column if not exists fee_tiers_accepted_at timestamptz;
