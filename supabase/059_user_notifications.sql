-- In-App-Benachrichtigungen (Glocke in der Topbar)

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link_url text,
  link_label text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id)
  where read_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own"
on public.user_notifications for select to authenticated
using (user_id = auth.uid());

drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own"
on public.user_notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
