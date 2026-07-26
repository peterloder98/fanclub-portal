-- Einmal im Supabase SQL Editor ausführen (behebt Events-Fehler + Post-Pin/Freigabe).
-- Danach: Admin → Artistflow Sync, damit end_at aus dateLabel gefüllt wird.

-- Posts fixieren
alter table public.posts
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references public.profiles(id) on delete set null;

create index if not exists posts_pinned_idx
  on public.posts (is_pinned desc, pinned_at desc nulls last);

create or replace function public.posts_guard_pin_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (
    new.is_pinned is distinct from old.is_pinned
    or new.pinned_at is distinct from old.pinned_at
    or new.pinned_by is distinct from old.pinned_by
  ) and not public.is_admin() then
    raise exception 'Nur Admins dürfen Posts fixieren oder lösen.';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_guard_pin_fields on public.posts;
create trigger posts_guard_pin_fields
before update on public.posts
for each row execute function public.posts_guard_pin_fields();

-- Event von–bis
alter table public.external_events
  add column if not exists end_at timestamptz,
  add column if not exists date_label text;

create index if not exists external_events_end_at_idx
  on public.external_events (end_at)
  where end_at is not null;

-- Autoren sehen eigene pending Posts
drop policy if exists "posts_select_auth" on public.posts;
create policy "posts_select_auth"
on public.posts
for select to authenticated
using (
  public.is_admin()
  or (exists(select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'anni'))
  or status = 'approved'
  or author_id = auth.uid()
);

drop policy if exists "post_media_select_auth_visible" on public.post_media;
create policy "post_media_select_auth_visible"
on public.post_media
for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and (
        public.is_admin()
        or (exists(select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'anni'))
        or p.status = 'approved'
        or p.author_id = auth.uid()
      )
  )
);
