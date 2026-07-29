-- Post-Reaktionen (ersetzt post_likes): Herz, Daumen, Traurig, Feiern, Wow

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null check (
    reaction_type in ('heart', 'thumbs_up', 'sad', 'celebrate', 'wow')
  ),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_reactions_post_id_idx on public.post_reactions(post_id);
create index if not exists post_reactions_user_id_idx on public.post_reactions(user_id);

-- Bestehende Likes übernehmen
insert into public.post_reactions (post_id, user_id, reaction_type, created_at)
select post_id, user_id, 'heart', created_at
from public.post_likes
on conflict (post_id, user_id) do nothing;

alter table public.post_reactions enable row level security;

drop policy if exists "post_reactions_select_auth" on public.post_reactions;
create policy "post_reactions_select_auth" on public.post_reactions
for select to authenticated using (true);

drop policy if exists "post_reactions_insert_own" on public.post_reactions;
create policy "post_reactions_insert_own" on public.post_reactions
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "post_reactions_update_own" on public.post_reactions;
create policy "post_reactions_update_own" on public.post_reactions
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "post_reactions_delete_own" on public.post_reactions;
create policy "post_reactions_delete_own" on public.post_reactions
for delete to authenticated using (user_id = auth.uid());

-- Alte Trigger entfernen
drop trigger if exists post_likes_bump_activity on public.post_likes;
drop trigger if exists post_like_points on public.post_likes;
drop trigger if exists post_like_points_revoke on public.post_likes;

-- Punkte: gleiche Logik wie bisher (post_like), nur auf post_reactions
create or replace function public.award_points_for_post_reaction()
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

create or replace function public.revoke_points_for_post_reaction()
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

drop trigger if exists post_reactions_bump_activity on public.post_reactions;
create trigger post_reactions_bump_activity
after insert on public.post_reactions
for each row execute function public.bump_post_activity();

drop trigger if exists post_reaction_points on public.post_reactions;
create trigger post_reaction_points
after insert on public.post_reactions
for each row execute function public.award_points_for_post_reaction();

drop trigger if exists post_reaction_points_revoke on public.post_reactions;
create trigger post_reaction_points_revoke
after delete on public.post_reactions
for each row execute function public.revoke_points_for_post_reaction();

drop table if exists public.post_likes;
