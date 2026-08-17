-- Mitgliedschaft ohne eigenen App-Zugang (z. B. ohne eigene E-Mail).
-- billing_email: nur Beitrags-/Zahlungserinnerungen, darf einer anderen Person gehören.
-- Einmal im Supabase SQL Editor ausführen.

alter table public.profiles
  add column if not exists no_app_access boolean not null default false;

alter table public.profiles
  add column if not exists billing_email text;

comment on column public.profiles.no_app_access is
  'Kein App-Login, nicht in Mitglieder-App/WhatsApp. Mitgliedschaft und Beitrag bleiben.';

comment on column public.profiles.billing_email is
  'Nur für Beitrags- und Zahlungserinnerungen. Darf die Adresse eines anderen Mitglieds sein. Keine sonstigen App-Mails.';

create index if not exists profiles_no_app_access_idx
  on public.profiles (no_app_access)
  where no_app_access = true;
