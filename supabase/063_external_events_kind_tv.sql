-- Artistflow: kind (event | tv) + TV-Sender
alter table public.external_events
  add column if not exists kind text not null default 'event',
  add column if not exists broadcaster text;

alter table public.external_events
  drop constraint if exists external_events_kind_check;

alter table public.external_events
  add constraint external_events_kind_check check (kind in ('event', 'tv'));

create index if not exists external_events_kind_visible_idx
  on public.external_events (kind, is_visible, start_at);
