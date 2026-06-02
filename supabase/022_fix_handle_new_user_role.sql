-- Fix: new auth users without role metadata got NULL role → user creation failed.
-- Run in Supabase SQL Editor.

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

  r := 'member'::public.app_role;
  if nullif(meta ->> 'role', '') is not null then
    begin
      r := (meta ->> 'role')::public.app_role;
    exception when others then
      r := 'member'::public.app_role;
    end;
  end if;

  begin
    insert into public.profiles (id, role, username, email, first_name, last_name)
    values (
      new.id,
      r,
      un,
      new.email,
      coalesce(fn, 'Mitglied'),
      coalesce(ln, 'Fanclub')
    );
  exception when unique_violation then
    un := un || '_' || left(replace(new.id::text, '-', ''), 8);
    insert into public.profiles (id, role, username, email, first_name, last_name)
    values (
      new.id,
      r,
      un,
      new.email,
      coalesce(fn, 'Mitglied'),
      coalesce(ln, 'Fanclub')
    );
  end;

  return new;
end;
$$;
