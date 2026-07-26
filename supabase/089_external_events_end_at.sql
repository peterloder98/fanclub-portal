-- Multi-day events (Artistflow dateLabel ranges like "08.10. - 11.10.2026")
alter table public.external_events
  add column if not exists end_at timestamptz,
  add column if not exists date_label text;

comment on column public.external_events.end_at is 'End of multi-day trip/event; null for single-day';
comment on column public.external_events.date_label is 'Original Artistflow dateLabel for reference';

create index if not exists external_events_end_at_idx
  on public.external_events (end_at)
  where end_at is not null;
