-- Teilnahme an Events („Am Event teilnehmen“)
create table if not exists public.event_participations (
  event_id uuid not null references public.external_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_participations_event_idx on public.event_participations(event_id);

alter table public.event_participations enable row level security;

drop policy if exists "event_participations_select_auth" on public.event_participations;
create policy "event_participations_select_auth"
on public.event_participations for select to authenticated using (true);

drop policy if exists "event_participations_insert_own" on public.event_participations;
create policy "event_participations_insert_own"
on public.event_participations for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "event_participations_delete_own" on public.event_participations;
create policy "event_participations_delete_own"
on public.event_participations for delete to authenticated
using (user_id = auth.uid());
