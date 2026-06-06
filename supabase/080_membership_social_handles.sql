-- Optionale Social-Media-Angaben im Mitgliedsantrag
alter table public.membership_applications
  add column if not exists instagram text,
  add column if not exists facebook text;
