-- Antworten auf Kommentare (Feed-Beiträge)

alter table public.post_comments
  add column if not exists parent_comment_id uuid references public.post_comments(id) on delete set null,
  add column if not exists reply_to_user_id uuid references public.profiles(id) on delete set null;

create index if not exists post_comments_parent_idx
  on public.post_comments (parent_comment_id)
  where parent_comment_id is not null;

create index if not exists post_comments_reply_to_idx
  on public.post_comments (reply_to_user_id)
  where reply_to_user_id is not null;
