-- Im Projekt anni-perka-fanclub ausführen
-- Dashboard-URL muss enthalten: ujrnbanfdympmaztdehe
-- (nicht das andere Org-Projekt ykkaqblxrtafsdhdvzmy)
--
-- Idempotent: Posts-Tabelle falls nötig anlegen, dann Pin + Event von–bis.

create extension if not exists pgcrypto;

-- Basis Posts (nur wenn komplett fehlt)
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'posts'
  ) then
    if not exists (
      select 1 from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where t.typname = 'post_status' and n.nspname = 'public'
    ) then
      create type public.post_status as enum ('pending', 'approved', 'rejected', 'deleted');
    end if;

    create table public.posts (
      id uuid primary key default gen_random_uuid(),
      author_id uuid references public.profiles(id) on delete set null,
      author_role public.app_role not null default 'member',
      title text not null,
      body text not null,
      created_at timestamptz not null default now(),
      status public.post_status not null default 'approved',
      approved_at timestamptz,
      approved_by uuid references public.profiles(id) on delete set null,
      updated_at timestamptz not null default now(),
      last_activity_at timestamptz,
      is_birthday boolean not null default false,
      birthday_date date
    );

    create table if not exists public.post_comments (
      id uuid primary key default gen_random_uuid(),
      post_id uuid not null references public.posts(id) on delete cascade,
      author_id uuid not null references public.profiles(id) on delete cascade,
      body text not null,
      created_at timestamptz not null default now(),
      parent_comment_id uuid references public.post_comments(id) on delete set null,
      reply_to_user_id uuid references public.profiles(id) on delete set null
    );

    create table if not exists public.post_likes (
      post_id uuid not null references public.posts(id) on delete cascade,
      user_id uuid not null references public.profiles(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (post_id, user_id)
    );

    create table if not exists public.post_media (
      id uuid primary key default gen_random_uuid(),
      post_id uuid not null references public.posts(id) on delete cascade,
      storage_path text not null,
      width integer,
      height integer,
      created_at timestamptz not null default now()
    );

    alter table public.posts enable row level security;
    alter table public.post_comments enable row level security;
    alter table public.post_likes enable row level security;
    alter table public.post_media enable row level security;
  end if;
end$$;

-- Pin-Spalten (088)
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

-- Event von–bis (089)
alter table public.external_events
  add column if not exists end_at timestamptz,
  add column if not exists date_label text;

create index if not exists external_events_end_at_idx
  on public.external_events (end_at)
  where end_at is not null;

-- Autoren sehen eigene pending Posts (090)
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
