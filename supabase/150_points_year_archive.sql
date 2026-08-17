-- Anni-Stars: Jahres-Archiv (Top-10 fair, ohne 1000-Zeilen-Limit),
-- keine Sterne fürs Geburtstagskind, Engagement nur an freigegebenen Beiträgen.
-- Einmal im Supabase SQL Editor ausführen.

-- ─── Berliner Jahresgrenzen ──────────────────────────────────────────────────
create or replace function public.points_year_start(p_year integer)
returns timestamptz
language sql
immutable
as $$
  select timezone('Europe/Berlin', make_timestamp(p_year, 1, 1, 0, 0, 0));
$$;

create or replace function public.points_year_end(p_year integer)
returns timestamptz
language sql
immutable
as $$
  select public.points_year_start(p_year + 1);
$$;

-- Summe in Postgres (keine REST-Zeilengrenze) — Basis für Rangliste, Archiv, Auslosung
create or replace function public.sum_points_by_user_for_year(p_year integer)
returns table (
  user_id uuid,
  points bigint,
  activity_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pt.user_id,
    coalesce(sum(pt.points), 0)::bigint as points,
    count(*)::bigint as activity_count
  from public.points_transactions pt
  where pt.created_at >= public.points_year_start(p_year)
    and pt.created_at < public.points_year_end(p_year)
    and pt.held_at is null
  group by pt.user_id
  having coalesce(sum(pt.points), 0) > 0;
$$;

create or replace function public.year_points_for_user(p_user_id uuid, p_year integer default null)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year int;
begin
  if p_user_id is null then
    return 0;
  end if;
  if auth.uid() is not null
     and auth.uid() <> p_user_id
     and not public.is_admin() then
    raise exception 'not allowed';
  end if;

  v_year := coalesce(
    p_year,
    extract(year from timezone('Europe/Berlin', now()))::int
  );

  return coalesce((
    select sum(pt.points)::bigint
    from public.points_transactions pt
    where pt.user_id = p_user_id
      and pt.held_at is null
      and pt.created_at >= public.points_year_start(v_year)
      and pt.created_at < public.points_year_end(v_year)
  ), 0);
end;
$$;

revoke all on function public.sum_points_by_user_for_year(integer) from public;
grant execute on function public.sum_points_by_user_for_year(integer) to authenticated;
grant execute on function public.sum_points_by_user_for_year(integer) to service_role;

revoke all on function public.year_points_for_user(uuid, integer) from public;
grant execute on function public.year_points_for_user(uuid, integer) to authenticated;
grant execute on function public.year_points_for_user(uuid, integer) to service_role;

-- Rangliste: Berliner Jahr, held_at ignorieren
do $$
declare
  has_hidden boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_hidden'
  ) into has_hidden;

  if has_hidden then
    execute $fn$
      create or replace function public.member_year_points_leaderboard(p_limit int default 50)
      returns table (
        user_id uuid,
        first_name text,
        last_name text,
        points bigint
      )
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        with sums as (
          select s.user_id, s.points
          from public.sum_points_by_user_for_year(
            extract(year from timezone('Europe/Berlin', now()))::int
          ) s
        )
        select
          p.id as user_id,
          p.first_name,
          p.last_name,
          s.points
        from sums s
        join public.profiles p on p.id = s.user_id
        join public.memberships m on m.user_id = p.id and m.status = 'active'
        where s.points > 0
          and coalesce(p.is_hidden, false) = false
          and coalesce(p.role, 'member') <> 'admin'
        order by s.points desc, p.last_name nulls last, p.first_name nulls last
        limit greatest(1, least(coalesce(p_limit, 50), 100));
      $body$;
    $fn$;
  else
    execute $fn$
      create or replace function public.member_year_points_leaderboard(p_limit int default 50)
      returns table (
        user_id uuid,
        first_name text,
        last_name text,
        points bigint
      )
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        with sums as (
          select s.user_id, s.points
          from public.sum_points_by_user_for_year(
            extract(year from timezone('Europe/Berlin', now()))::int
          ) s
        )
        select
          p.id as user_id,
          p.first_name,
          p.last_name,
          s.points
        from sums s
        join public.profiles p on p.id = s.user_id
        join public.memberships m on m.user_id = p.id and m.status = 'active'
        where s.points > 0
          and coalesce(p.role, 'member') <> 'admin'
        order by s.points desc, p.last_name nulls last, p.first_name nulls last
        limit greatest(1, least(coalesce(p_limit, 50), 100));
      $body$;
    $fn$;
  end if;
end $$;

revoke all on function public.member_year_points_leaderboard(int) from public;
grant execute on function public.member_year_points_leaderboard(int) to authenticated;

-- ─── Jahres-Archiv (einfrieren zum Jahreswechsel) ────────────────────────────
create table if not exists public.points_year_archive_meta (
  year integer primary key,
  frozen_at timestamptz not null default now(),
  lottery_completed_at timestamptz
);

create table if not exists public.points_year_archives (
  year integer not null references public.points_year_archive_meta(year) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  activity_count integer not null,
  primary key (year, user_id)
);

create index if not exists points_year_archives_year_points_idx
  on public.points_year_archives (year, points desc);

alter table public.points_year_archive_meta enable row level security;
alter table public.points_year_archives enable row level security;

drop policy if exists "points_year_archive_meta_select" on public.points_year_archive_meta;
create policy "points_year_archive_meta_select"
on public.points_year_archive_meta for select to authenticated using (true);

drop policy if exists "points_year_archives_select_own_or_admin" on public.points_year_archives;
create policy "points_year_archives_select_own_or_admin"
on public.points_year_archives for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create or replace function public.freeze_points_year(p_year integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current int;
  v_count int;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'not allowed';
  end if;

  v_current := extract(year from timezone('Europe/Berlin', now()))::int;
  if p_year >= v_current then
    return jsonb_build_object('ok', false, 'error', 'year_not_ended', 'year', p_year);
  end if;

  if exists (select 1 from public.points_year_archive_meta where year = p_year) then
    select count(*)::int into v_count from public.points_year_archives where year = p_year;
    return jsonb_build_object('ok', true, 'already_frozen', true, 'year', p_year, 'rows', v_count);
  end if;

  insert into public.points_year_archive_meta (year, frozen_at)
  values (p_year, now());

  insert into public.points_year_archives (year, user_id, points, activity_count)
  select p_year, s.user_id, s.points::int, s.activity_count::int
  from public.sum_points_by_user_for_year(p_year) s;

  select count(*)::int into v_count from public.points_year_archives where year = p_year;
  return jsonb_build_object('ok', true, 'already_frozen', false, 'year', p_year, 'rows', v_count);
exception
  when unique_violation then
    select count(*)::int into v_count from public.points_year_archives where year = p_year;
    return jsonb_build_object('ok', true, 'already_frozen', true, 'year', p_year, 'rows', v_count);
end;
$$;

revoke all on function public.freeze_points_year(integer) from public;
grant execute on function public.freeze_points_year(integer) to service_role;
grant execute on function public.freeze_points_year(integer) to authenticated;

-- ─── Keine Sterne fürs Geburtstagskind (kommentieren/liken bleibt erlaubt) ──
create or replace function public.award_points_for_post_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_birthday uuid;
  v_status text;
begin
  select p.author_id, p.birthday_user_id, p.status::text
  into v_author, v_birthday, v_status
  from public.posts p
  where p.id = new.post_id;

  if v_author is not null and v_author = new.user_id then
    return new;
  end if;
  if v_birthday is not null and v_birthday = new.user_id then
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

create or replace function public.award_points_for_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_birthday boolean;
  v_author uuid;
  v_birthday uuid;
  v_status text;
begin
  select coalesce(p.is_birthday, false), p.author_id, p.birthday_user_id, p.status::text
  into v_is_birthday, v_author, v_birthday, v_status
  from public.posts p
  where p.id = new.post_id;

  if v_author is not null and v_author = new.author_id then
    return new;
  end if;
  if v_birthday is not null and v_birthday = new.author_id then
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
  v_birthday uuid;
  v_status text;
  v_points int;
  v_reason text;
  v_row_count int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select coalesce(p.is_birthday, false), p.author_id, p.birthday_user_id, p.status::text
  into v_is_birthday, v_author, v_birthday, v_status
  from public.posts p
  where p.id = p_post_id;

  if v_author is not null and v_author = auth.uid() then
    return jsonb_build_object('ok', true, 'points', 0, 'reason', 'post_comment', 'awarded', false, 'skipped', 'own_post');
  end if;
  if v_birthday is not null and v_birthday = auth.uid() then
    return jsonb_build_object('ok', true, 'points', 0, 'reason', 'birthday_comment', 'awarded', false, 'skipped', 'birthday_honoree');
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

-- Bereits gutgeschriebene Sterne des Geburtstagskinds zurücknehmen
delete from public.points_transactions pt
using public.posts p
where pt.entity_type = 'post'
  and pt.entity_id = p.id
  and p.birthday_user_id is not null
  and pt.user_id = p.birthday_user_id
  and pt.reason in ('post_like', 'birthday_comment', 'post_comment');

-- ─── Vor Freigabe: kein Like, kein Kommentar, keine Bearbeitung ──────────────
drop policy if exists "comments_insert_auth" on public.post_comments;
create policy "comments_insert_auth"
on public.post_comments
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'approved'
  )
);

drop policy if exists "comments_update_own" on public.post_comments;
create policy "comments_update_own"
on public.post_comments
for update to authenticated
using (
  author_id = auth.uid()
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
)
with check (
  author_id = auth.uid()
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
);

drop policy if exists "post_reactions_insert_own" on public.post_reactions;
create policy "post_reactions_insert_own"
on public.post_reactions
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'approved'
  )
);

drop policy if exists "post_reactions_update_own" on public.post_reactions;
create policy "post_reactions_update_own"
on public.post_reactions
for update to authenticated
using (
  user_id = auth.uid()
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
)
with check (
  user_id = auth.uid()
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
);

drop policy if exists "comment_likes_insert_own" on public.post_comment_likes;
create policy "comment_likes_insert_own"
on public.post_comment_likes
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.post_comments c
    join public.posts p on p.id = c.post_id
    where c.id = comment_id and p.status = 'approved'
  )
);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
on public.posts
for update to authenticated
using (author_id = auth.uid() and status = 'approved')
with check (author_id = auth.uid() and status = 'approved');
