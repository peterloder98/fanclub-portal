-- Admins dürfen Verwarnungen löschen (Zurücknehmen)

drop policy if exists "member_warnings_admin_delete" on public.member_warnings;
create policy "member_warnings_admin_delete"
on public.member_warnings for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
