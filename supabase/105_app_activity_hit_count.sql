-- App-Zugriffe: Zähler pro User/Tag (für Statistik „App-Zugriffe/Monat“)
-- Im Supabase SQL Editor ausführen.

alter table public.app_activity_days
  add column if not exists hit_count integer not null default 1;

comment on column public.app_activity_days.hit_count is 'Anzahl App-Heartbeats / Zugriffe an diesem Tag';
