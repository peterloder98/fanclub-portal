-- Begrüßungspost (manuell per Post versendet): Datum am Profil vermerken
alter table public.profiles
  add column if not exists greeting_post_sent_at date;

comment on column public.profiles.greeting_post_sent_at is
  'Datum, an dem der manuelle Begrüßungspost an das neue Mitglied versendet wurde. NULL = noch offen.';
