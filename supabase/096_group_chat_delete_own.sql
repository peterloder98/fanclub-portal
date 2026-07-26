-- Eigenen Chat-Eintrag löschen dürfen; Admins weiterhin alle

drop policy if exists "group_chat_delete_admin" on public.group_chat_messages;
drop policy if exists "group_chat_delete_own_or_admin" on public.group_chat_messages;

create policy "group_chat_delete_own_or_admin"
on public.group_chat_messages
for delete to authenticated
using (author_id = auth.uid() or public.is_admin());
