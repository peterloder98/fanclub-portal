-- Gruppenchat: Lesestatus geräteübergreifend (Desktop ↔ Mobile)
-- Im Supabase SQL Editor ausführen.

alter table public.profiles
  add column if not exists group_chat_last_seen_at timestamptz;

comment on column public.profiles.group_chat_last_seen_at is
  'Zeitstempel der zuletzt gelesenen Gruppenchat-Nachricht (für Ungelesen-Badge, geräteübergreifend).';
