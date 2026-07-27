-- Fairness: keine Punkte für Eigenaktionen; Kommentar-Revoke nur wenn kein Kommentar mehr übrig;
-- Giveaway-Kommentar-Revoke; Clawback ungerechtfertigter Transaktionen.

-- ─── Post like ───────────────────────────────────────────────────────────────
create or replace function public.award_points_for_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_status text;
begin
  select p.author_id, p.status::text into v_author, v_status
  from public.posts p
  where p.id = new.post_id;

  -- Keine Punkte für eigene Beiträge / nicht freigegebene Posts
  if v_author is not null and v_author = new.user_id then
    return new;
  end if;
  if v_status is not null and v_status <> 'approved' then
    return new;
  end if;

  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 1, 'post_like', 'post', new.post_id)
  on conflict do nothing;
  return new;
end;
$$;

-- ─── Post comment award ──────────────────────────────────────────────────────
create or replace function public.award_points_for_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_birthday boolean;
  v_author uuid;
  v_status text;
begin
  select coalesce(p.is_birthday, false), p.author_id, p.status::text
  into v_is_birthday, v_author, v_status
  from public.posts p
  where p.id = new.post_id;

  -- Keine Punkte für Kommentare am eigenen Beitrag (Geburtstags-Posts haben meist keinen Author)
  if v_author is not null and v_author = new.author_id then
    return new;
  end if;
  if v_status is not null and v_status <> 'approved' then
    return new;
  end if;

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

-- ─── Post comment revoke (nur wenn kein weiterer eigener Kommentar) ──────────
create or replace function public.revoke_points_for_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_birthday boolean;
  remaining int;
begin
  select count(*) into remaining
  from public.post_comments
  where post_id = old.post_id
    and author_id = old.author_id;

  if remaining > 0 then
    return old;
  end if;

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

-- ─── RPC ensure / revoke (API-Fallback) ──────────────────────────────────────
create or replace function public.ensure_post_comment_points(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_birthday boolean;
  v_has_comment boolean;
  v_author uuid;
  v_status text;
  v_points int;
  v_reason text;
  v_row_count int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select coalesce(p.is_birthday, false), p.author_id, p.status::text
  into v_is_birthday, v_author, v_status
  from public.posts p
  where p.id = p_post_id;

  if v_author is not null and v_author = auth.uid() then
    return jsonb_build_object('ok', true, 'points', 0, 'reason', 'post_comment', 'awarded', false, 'skipped', 'own_post');
  end if;
  if v_status is not null and v_status <> 'approved' then
    return jsonb_build_object('ok', true, 'points', 0, 'reason', 'post_comment', 'awarded', false, 'skipped', 'not_approved');
  end if;

  select exists (
    select 1 from public.post_comments c
    where c.post_id = p_post_id and c.author_id = auth.uid()
  ) into v_has_comment;
  if not v_has_comment then
    return jsonb_build_object('ok', false, 'error', 'no_comment');
  end if;

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

  get diagnostics v_row_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'points', v_points,
    'reason', v_reason,
    'awarded', v_row_count > 0
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
  remaining int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select count(*) into remaining
  from public.post_comments
  where post_id = p_post_id
    and author_id = auth.uid();

  if remaining > 0 then
    return jsonb_build_object('ok', true, 'points', 0, 'reason', 'post_comment', 'revoked', false, 'skipped', 'still_has_comment');
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

-- ─── Poll vote: nicht am eigenen Poll ────────────────────────────────────────
create or replace function public.award_points_for_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select p.author_id into v_author from public.polls p where p.id = new.poll_id;
  if v_author is not null and v_author = new.user_id then
    return new;
  end if;

  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 5, 'poll_vote', 'poll', new.poll_id)
  on conflict do nothing;
  return new;
end;
$$;

-- ─── Giveaway like / comment ─────────────────────────────────────────────────
create or replace function public.award_points_for_giveaway_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  select g.author_id into v_author from public.giveaways g where g.id = new.giveaway_id;
  if v_author is not null and v_author = new.user_id then
    return new;
  end if;

  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.user_id, 1, 'giveaway_like', 'giveaway', new.giveaway_id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.award_points_for_giveaway_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  select g.author_id into v_author from public.giveaways g where g.id = new.giveaway_id;
  if v_author is not null and v_author = new.author_id then
    return new;
  end if;

  insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
  values (new.author_id, 1, 'giveaway_comment', 'giveaway', new.giveaway_id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.revoke_points_for_giveaway_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  remaining int;
begin
  select count(*) into remaining
  from public.giveaway_comments
  where giveaway_id = old.giveaway_id
    and author_id = old.author_id;

  if remaining > 0 then
    return old;
  end if;

  delete from public.points_transactions
  where user_id = old.author_id
    and reason = 'giveaway_comment'
    and entity_type = 'giveaway'
    and entity_id = old.giveaway_id;
  return old;
end;
$$;

drop trigger if exists giveaway_comment_revoke on public.giveaway_comments;
create trigger giveaway_comment_revoke
after delete on public.giveaway_comments
for each row execute function public.revoke_points_for_giveaway_comment();

-- ─── Clawback: ungerechtfertigte Eigenaktionen rückgängig ────────────────────
delete from public.points_transactions pt
using public.posts p
where pt.reason = 'post_like'
  and pt.entity_type = 'post'
  and pt.entity_id = p.id
  and p.author_id is not null
  and pt.user_id = p.author_id;

delete from public.points_transactions pt
using public.posts p
where pt.reason in ('post_comment', 'birthday_comment')
  and pt.entity_type = 'post'
  and pt.entity_id = p.id
  and p.author_id is not null
  and pt.user_id = p.author_id;

delete from public.points_transactions pt
using public.polls p
where pt.reason = 'poll_vote'
  and pt.entity_type = 'poll'
  and pt.entity_id = p.id
  and p.author_id is not null
  and pt.user_id = p.author_id;

delete from public.points_transactions pt
using public.giveaways g
where pt.reason = 'giveaway_like'
  and pt.entity_type = 'giveaway'
  and pt.entity_id = g.id
  and g.author_id is not null
  and pt.user_id = g.author_id;

delete from public.points_transactions pt
using public.giveaways g
where pt.reason = 'giveaway_comment'
  and pt.entity_type = 'giveaway'
  and pt.entity_id = g.id
  and g.author_id is not null
  and pt.user_id = g.author_id;
