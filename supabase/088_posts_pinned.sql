-- Admin can pin posts to the top of the feed
-- Members must not be able to change pin state (even via posts_update_own).

alter table public.posts
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references public.profiles(id) on delete set null;

create index if not exists posts_pinned_idx
  on public.posts (is_pinned desc, pinned_at desc nulls last);

comment on column public.posts.is_pinned is 'Admin-only: post stays at top of feed until unpinned';

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
