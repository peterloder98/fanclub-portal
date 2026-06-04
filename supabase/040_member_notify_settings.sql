-- Einstellungen: Mitglieder per E-Mail über neue Gewinnspiele / Umfragen (Standard: aus)
insert into public.app_settings (key, value)
values
  ('notify_members_new_giveaway', 'false'),
  ('notify_members_new_poll', 'false')
on conflict (key) do nothing;
