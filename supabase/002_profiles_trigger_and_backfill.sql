-- Create profiles automatically on auth user creation
-- and backfill profiles for existing auth users.
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Ensure profiles exists (created by 001_init.sql)
-- If you've not run 001_init.sql yet, run it first.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  fn text;
  ln text;
  un text;
  r public.app_role;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  fn := nullif(meta ->> 'first_name', '');
  ln := nullif(meta ->> 'last_name', '');
  un := nullif(meta ->> 'username', '');

  if un is null then
    un := replace(split_part(coalesce(new.email, 'user'), '@', 1), '.', '_');
  end if;

  -- role is optional; default to member
  begin
    r := (meta ->> 'role')::public.app_role;
  exception when others then
    r := 'member';
  end;

  insert into public.profiles (id, role, username, email, first_name, last_name)
  values (
    new.id,
    r,
    un,
    new.email,
    coalesce(fn, 'Mitglied'),
    coalesce(ln, 'Fanclub')
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill: create profiles for auth users that don't have one yet
insert into public.profiles (id, role, username, email, first_name, last_name)
select
  u.id,
  'member'::public.app_role,
  replace(split_part(coalesce(u.email, 'user'), '@', 1), '.', '_') as username,
  u.email,
  'Mitglied' as first_name,
  'Fanclub' as last_name
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

