-- Einladungsdaten für vorausgefüllten Mitgliedsantrag
alter table public.membership_referral_sends
  add column if not exists recipient_first_name text,
  add column if not exists recipient_last_name text,
  add column if not exists recipient_gender text;

comment on column public.membership_referral_sends.recipient_gender is 'm oder w — für Anrede und Vorausfüllung';
