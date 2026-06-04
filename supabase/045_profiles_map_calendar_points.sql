-- Karte: gespeicherte Koordinaten + Kalender-Standard pro User
-- Punkte: Geburtstags-Kommentar +2, Kommentar-Löschung zieht Punkte ab

alter table public.profiles
  add column if not exists map_lat double precision,
  add column if not exists map_lng double precision,
  add column if not exists preferred_calendar text default 'ask';

comment on column public.profiles.map_lat is 'Geocodiert aus PLZ/Ort (Mitglieder-Karte), keine Straße.';
comment on column public.profiles.preferred_calendar is 'ask | google | outlook | ics';

-- Kommentar-Punkte: einmal pro Beitrag; Geburtstag +2
create unique index if not exists points_unique_birthday_comment
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'birthday_comment';

create or replace function public.award_points_for_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_birthday boolean;
begin
  select coalesce(p.is_birthday, false) into v_is_birthday
  from public.posts p
  where p.id = new.post_id;

  if v_is_birthday then
    insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
    values (new.author_id, 2, 'birthday_comment', 'post', new.post_id)
    on conflict do nothing;
  else
    insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
    values (new.author_id, 3, 'post_comment', 'post', new.post_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.revoke_points_for_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.points_transactions
  where user_id = old.author_id
    and entity_type = 'post'
    and entity_id = old.post_id
    and reason in ('post_comment', 'birthday_comment');
  return old;
end;
$$;

drop trigger if exists post_comment_revoke on public.post_comments;
create trigger post_comment_revoke
after delete on public.post_comments
for each row execute function public.revoke_points_for_post_comment();
