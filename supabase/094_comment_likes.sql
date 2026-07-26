-- Likes auf Post-Kommentare

create table if not exists public.post_comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists post_comment_likes_user_idx
  on public.post_comment_likes (user_id);

alter table public.post_comment_likes enable row level security;

drop policy if exists "comment_likes_select_auth" on public.post_comment_likes;
create policy "comment_likes_select_auth"
on public.post_comment_likes
for select to authenticated
using (true);

drop policy if exists "comment_likes_insert_own" on public.post_comment_likes;
create policy "comment_likes_insert_own"
on public.post_comment_likes
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "comment_likes_delete_own" on public.post_comment_likes;
create policy "comment_likes_delete_own"
on public.post_comment_likes
for delete to authenticated
using (user_id = auth.uid());
