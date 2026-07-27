-- Kurz-Bio für Mitglieder-Portal („Ein paar Worte über mich“)
-- Im Supabase SQL Editor ausführen.

alter table public.profiles
  add column if not exists short_bio text;

comment on column public.profiles.short_bio is 'Ein paar Worte über mich (max. 150 Zeichen, öffentlich im Portal)';

-- Soft-Limit in der App; DB-Check optional
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_short_bio_len'
  ) then
    alter table public.profiles
      add constraint profiles_short_bio_len
      check (short_bio is null or char_length(short_bio) <= 150);
  end if;
end $$;
