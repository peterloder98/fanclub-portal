-- App-Registrierungsstatus für Mitglieder (Offen / Registriert / Gelöscht)
-- Im Supabase SQL Editor ausführen.

alter table public.profiles
  add column if not exists app_registration_status text not null default 'open';

alter table public.profiles
  drop constraint if exists profiles_app_registration_status_check;

alter table public.profiles
  add constraint profiles_app_registration_status_check
  check (app_registration_status in ('open', 'registered', 'deleted'));

alter table public.profiles
  add column if not exists app_registered_at timestamptz;

alter table public.profiles
  add column if not exists app_registration_deleted_at timestamptz;

comment on column public.profiles.app_registration_status is
  'In-App-Registrierung: open = noch nicht eingerichtet, registered = Zugang eingerichtet, deleted = Zugang gelöscht';
