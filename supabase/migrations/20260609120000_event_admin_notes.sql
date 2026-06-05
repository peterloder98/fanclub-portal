-- Vorstand-Notizen pro Event (unabhängig von Artistflow-JSON)

create table if not exists public.event_admin_notes (
  event_id uuid primary key references public.external_events(id) on delete cascade,
  next_station text,
  next_hotel text,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

drop trigger if exists event_admin_notes_set_updated_at on public.event_admin_notes;
create trigger event_admin_notes_set_updated_at
before update on public.event_admin_notes
for each row execute function public.set_updated_at();

alter table public.event_admin_notes enable row level security;

drop policy if exists "event_admin_notes_admin_all" on public.event_admin_notes;
create policy "event_admin_notes_admin_all"
on public.event_admin_notes for all to authenticated
using (public.is_admin())
with check (public.is_admin());
