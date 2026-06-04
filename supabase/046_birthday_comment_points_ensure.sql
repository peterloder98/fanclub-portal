-- Geburtstags-Kommentar-Punkte: Trigger sicherstellen + manuelles Nachziehen per RPC

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

drop trigger if exists post_comment_points on public.post_comments;
create trigger post_comment_points
after insert on public.post_comments
for each row execute function public.award_points_for_post_comment();

create unique index if not exists points_unique_birthday_comment
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'birthday_comment';

-- Falls der Trigger nicht lief: Punkte nachziehen (eigener Kommentar auf dem Beitrag)
create or replace function public.ensure_post_comment_points(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_birthday boolean;
  v_has_comment boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select exists (
    select 1 from public.post_comments c
    where c.post_id = p_post_id and c.author_id = auth.uid()
  ) into v_has_comment;
  if not v_has_comment then
    return false;
  end if;

  select coalesce(p.is_birthday, false) into v_is_birthday
  from public.posts p
  where p.id = p_post_id;

  if v_is_birthday then
    insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
    values (auth.uid(), 2, 'birthday_comment', 'post', p_post_id)
    on conflict do nothing;
  else
    insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
    values (auth.uid(), 3, 'post_comment', 'post', p_post_id)
    on conflict do nothing;
  end if;
  return true;
end;
$$;

revoke all on function public.ensure_post_comment_points(uuid) from public;
grant execute on function public.ensure_post_comment_points(uuid) to authenticated;
