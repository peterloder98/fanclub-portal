-- Mitglieder: E-Mail-Benachrichtigungen abschaltbar (opt-in default = an)
-- Pflichtmails (Verwarnungen, Beitrag, Zugang, Login-Änderung, …) bleiben ohne Pref-Spalte.

alter table public.profiles
  add column if not exists email_pref_new_giveaway boolean not null default true,
  add column if not exists email_pref_new_poll boolean not null default true,
  add column if not exists email_pref_new_event boolean not null default true,
  add column if not exists email_pref_meeting_reminders boolean not null default true,
  add column if not exists email_pref_live boolean not null default true,
  add column if not exists email_pref_app_activity boolean not null default true;

comment on column public.profiles.email_pref_new_giveaway is
  'E-Mail bei neuem Gewinnspiel (Massen-Mail). true = erlaubt.';
comment on column public.profiles.email_pref_new_poll is
  'E-Mail bei neuer Umfrage (Massen-Mail). true = erlaubt.';
comment on column public.profiles.email_pref_new_event is
  'E-Mail bei neuem Auftritt/Event (Massen-Mail). true = erlaubt.';
comment on column public.profiles.email_pref_meeting_reminders is
  'E-Mail-Erinnerung vor Fanclub-Treffen (7/2 Tage). true = erlaubt.';
comment on column public.profiles.email_pref_live is
  'E-Mail zu Live mit Anni (Einladung + Erinnerung). true = erlaubt.';
comment on column public.profiles.email_pref_app_activity is
  'E-Mail bei App-Anmelde-/Inaktivitäts-Erinnerung. true = erlaubt.';
