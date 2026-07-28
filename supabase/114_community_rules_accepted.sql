-- Fanclub-Regeln: Zustimmung bei erstem App-Zugang

alter table public.profiles
  add column if not exists community_rules_accepted_at timestamptz;

comment on column public.profiles.community_rules_accepted_at is
  'Zeitpunkt der Zustimmung zu den Fanclub-Regeln (WhatsApp & App).';
