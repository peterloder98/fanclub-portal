-- Kommentar-Punkte: Vergabe + Entzug (Trigger + RPC)

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
declare
  v_is_birthday boolean;
begin
  select coalesce(p.is_birthday, false) into v_is_birthday
  from public.posts p
  where p.id = old.post_id;

  delete from public.points_transactions
  where user_id = old.author_id
    and entity_type = 'post'
    and entity_id = old.post_id
    and reason = case when v_is_birthday then 'birthday_comment' else 'post_comment' end;
  return old;
end;
$$;

drop trigger if exists post_comment_points on public.post_comments;
create trigger post_comment_points
after insert on public.post_comments
for each row execute function public.award_points_for_post_comment();

drop trigger if exists post_comment_revoke on public.post_comments;
create trigger post_comment_revoke
after delete on public.post_comments
for each row execute function public.revoke_points_for_post_comment();

create unique index if not exists points_unique_birthday_comment
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'birthday_comment';

create unique index if not exists points_unique_comment
  on public.points_transactions(user_id, entity_type, entity_id)
  where reason = 'post_comment';

create or replace function public.ensure_post_comment_points(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_birthday boolean;
  v_has_comment boolean;
  v_points int;
  v_reason text;
  v_inserted boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select exists (
    select 1 from public.post_comments c
    where c.post_id = p_post_id and c.author_id = auth.uid()
  ) into v_has_comment;
  if not v_has_comment then
    return jsonb_build_object('ok', false, 'error', 'no_comment');
  end if;

  select coalesce(p.is_birthday, false) into v_is_birthday
  from public.posts p
  where p.id = p_post_id;

  if v_is_birthday then
    v_points := 2;
    v_reason := 'birthday_comment';
  else
    v_points := 3;
    v_reason := 'post_comment';
  end if;

  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (auth.uid(), v_points, v_reason, 'post', p_post_id)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'ok', true,
    'points', v_points,
    'reason', v_reason,
    'awarded', v_inserted > 0
  );
end;
$$;

create or replace function public.revoke_post_comment_points(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_birthday boolean;
  v_points int;
  v_reason text;
  v_deleted int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select coalesce(p.is_birthday, false) into v_is_birthday
  from public.posts p
  where p.id = p_post_id;

  if v_is_birthday then
    v_points := 2;
    v_reason := 'birthday_comment';
  else
    v_points := 3;
    v_reason := 'post_comment';
  end if;

  delete from public.points_transactions
  where user_id = auth.uid()
    and entity_type = 'post'
    and entity_id = p_post_id
    and reason = v_reason;

  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'ok', true,
    'points', v_points,
    'reason', v_reason,
    'revoked', v_deleted > 0
  );
end;
$$;

revoke all on function public.ensure_post_comment_points(uuid) from public;
grant execute on function public.ensure_post_comment_points(uuid) to authenticated;
revoke all on function public.revoke_post_comment_points(uuid) from public;
grant execute on function public.revoke_post_comment_points(uuid) to authenticated;
