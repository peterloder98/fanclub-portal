-- Öffentlicher Fanclub-Gruppenchat (eine gemeinsame Timeline)

create table if not exists public.group_chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint group_chat_messages_body_len
    check (char_length(trim(body)) between 1 and 1000)
);

create index if not exists group_chat_messages_created_at_idx
  on public.group_chat_messages (created_at desc);

create index if not exists group_chat_messages_author_created_idx
  on public.group_chat_messages (author_id, created_at desc);

alter table public.group_chat_messages enable row level security;

drop policy if exists "group_chat_select_auth" on public.group_chat_messages;
create policy "group_chat_select_auth"
on public.group_chat_messages
for select to authenticated
using (true);

drop policy if exists "group_chat_insert_own" on public.group_chat_messages;
create policy "group_chat_insert_own"
on public.group_chat_messages
for insert to authenticated
with check (author_id = auth.uid());

drop policy if exists "group_chat_delete_admin" on public.group_chat_messages;
drop policy if exists "group_chat_delete_own_or_admin" on public.group_chat_messages;
create policy "group_chat_delete_own_or_admin"
on public.group_chat_messages
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_chat_messages'
  ) then
    alter publication supabase_realtime add table public.group_chat_messages;
  end if;
end $$;
