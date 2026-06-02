-- Posts: activity sort + birthday pinning
-- Run after 004_posts_comments_likes.sql and 008_posts_moderation_media.sql

alter table public.posts
  add column if not exists last_activity_at timestamptz,
  add column if not exists is_birthday boolean not null default false,
  add column if not exists birthday_date date;

-- Initialize for existing rows
update public.posts
set last_activity_at = coalesce(last_activity_at, created_at)
where last_activity_at is null;

create or replace function public.bump_post_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  pid := coalesce(new.post_id, old.post_id);
  if pid is null then
    return coalesce(new, old);
  end if;

  update public.posts
  set last_activity_at = now()
  where id = pid;

  return coalesce(new, old);
end;
$$;

drop trigger if exists post_comments_bump_activity on public.post_comments;
create trigger post_comments_bump_activity
after insert on public.post_comments
for each row execute function public.bump_post_activity();

drop trigger if exists post_likes_bump_activity on public.post_likes;
create trigger post_likes_bump_activity
after insert on public.post_likes
for each row execute function public.bump_post_activity();

