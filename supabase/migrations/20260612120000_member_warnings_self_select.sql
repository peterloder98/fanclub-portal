-- Mitglieder dürfen eigene Verwarnungen einsehen (Profil-Verwaltung)

drop policy if exists "member_warnings_select_own" on public.member_warnings;
create policy "member_warnings_select_own"
on public.member_warnings for select to authenticated
using (member_id = auth.uid());
