-- Pause / Fortsetzen für Gewinnspiele
alter table public.giveaways
  add column if not exists is_paused boolean not null default false;

create index if not exists giveaways_paused_idx on public.giveaways(is_paused) where is_paused = true;
