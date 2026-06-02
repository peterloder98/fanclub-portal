-- Remove points when a like is removed (no double-award on re-like thanks to unique index)
-- Run after 005_points.sql

create or replace function public.revoke_points_for_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.points_transactions
  where user_id = old.user_id
    and reason = 'post_like'
    and entity_type = 'post'
    and entity_id = old.post_id;
  return old;
end;
$$;

drop trigger if exists post_like_points_revoke on public.post_likes;
create trigger post_like_points_revoke
after delete on public.post_likes
for each row execute function public.revoke_points_for_post_like();

-- Realtime for points (topbar live update)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'points_transactions'
  ) then
    alter publication supabase_realtime add table public.points_transactions;
  end if;
end$$;
