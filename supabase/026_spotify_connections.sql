-- Per-user Spotify OAuth (individual accounts, not shared).
-- Run in Supabase SQL Editor.

create table if not exists public.spotify_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  refresh_token_ciphertext text not null,
  spotify_user_id text,
  display_name text,
  scopes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spotify_connections enable row level security;

drop policy if exists "spotify_connections_select_own" on public.spotify_connections;
create policy "spotify_connections_select_own"
on public.spotify_connections for select to authenticated
using (user_id = auth.uid());

drop policy if exists "spotify_connections_insert_own" on public.spotify_connections;
create policy "spotify_connections_insert_own"
on public.spotify_connections for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "spotify_connections_update_own" on public.spotify_connections;
create policy "spotify_connections_update_own"
on public.spotify_connections for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "spotify_connections_delete_own" on public.spotify_connections;
create policy "spotify_connections_delete_own"
on public.spotify_connections for delete to authenticated
using (user_id = auth.uid());

drop trigger if exists spotify_connections_set_updated_at on public.spotify_connections;
create trigger spotify_connections_set_updated_at
before update on public.spotify_connections
for each row execute function public.set_updated_at();
