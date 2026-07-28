-- Vorübergehende App-Sperre (z. B. offener Beitrag / Klärung mit Vorstand)

alter table public.memberships
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

comment on column public.memberships.suspended_at is 'Zeitpunkt der vorübergehenden App-Sperre (status=suspended).';
comment on column public.memberships.suspension_reason is 'Optionaler Hinweis für Admin (z. B. Zahlungsrückstand).';

comment on column public.memberships.status is 'active | inactive | applied | suspended (vorübergehend kein App-Zugang)';
