-- Live: Anwesenheit für Sterne + Aufräumen beendeter Sessions (per Cron)

create table if not exists public.live_session_attendance (
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  points_awarded_at timestamptz,
  primary key (session_id, user_id)
);

create index if not exists live_session_attendance_user_idx
  on public.live_session_attendance (user_id, last_seen_at desc);

alter table public.live_session_attendance enable row level security;

drop policy if exists "live_session_attendance_select_own" on public.live_session_attendance;
create policy "live_session_attendance_select_own"
on public.live_session_attendance
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Schreibzugriff nur über Server (Service Role)

create unique index if not exists points_unique_live_session_participation
  on public.points_transactions (user_id, entity_type, entity_id)
  where reason = 'live_session_participation';
