-- Mitglieder-Karte: alle aktiven Mitgliedschaften lesbar (nur user_id + status), nicht nur die eigene.
drop policy if exists "memberships_select_active_directory" on public.memberships;

create policy "memberships_select_active_directory"
on public.memberships
for select
to authenticated
using (status = 'active');
