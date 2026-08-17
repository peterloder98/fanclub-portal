-- Vorstände (role=admin) nicht in der Jahres-Rangliste und damit nicht in der
-- Top-10-Sonderverlosung. Einmal im Supabase SQL Editor ausführen
-- (auch wenn 150 bereits gelaufen ist).

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
