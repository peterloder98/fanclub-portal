-- Höchstens ein fixierter Feed-Beitrag. Der zuletzt fixierte bleibt.

create or replace function public.posts_guard_pin_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(current_setting('app.allow_pin_cleanup', true), '') = 'on' then
    return new;
  end if;
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

create or replace function public.posts_collapse_extra_pins()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  keep_id uuid;
begin
  select p.id into keep_id
  from public.posts p
  where p.is_pinned
  order by p.pinned_at desc nulls last, p.created_at desc
  limit 1;

  if keep_id is null then
    return;
  end if;

  perform set_config('app.allow_pin_cleanup', 'on', true);

  update public.posts
  set is_pinned = false,
      pinned_at = null,
      pinned_by = null
  where is_pinned
    and id <> keep_id;
end;
$$;

revoke all on function public.posts_collapse_extra_pins() from public;
grant execute on function public.posts_collapse_extra_pins() to service_role;

select public.posts_collapse_extra_pins();

create unique index if not exists posts_single_pinned_idx
  on public.posts ((is_pinned))
  where is_pinned;
