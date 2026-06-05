alter table public.event_admin_notes
  add column if not exists travel_info jsonb not null default '{}'::jsonb;

update public.event_admin_notes
set travel_info = jsonb_build_object(
  'station',
    case
      when coalesce(next_station, '') <> '' then
        jsonb_build_object('name', next_station, 'address', '', 'link', null, 'lat', null, 'lng', null, 'distanceMeters', null)
      else null
    end,
  'hotels',
    case
      when coalesce(next_hotel, '') <> '' then
        jsonb_build_array(
          jsonb_build_object('name', next_hotel, 'address', '', 'link', null, 'lat', null, 'lng', null, 'distanceMeters', null)
        )
      else '[]'::jsonb
    end,
  'notes', nullif(trim(notes), '')
)
where travel_info = '{}'::jsonb
  and (coalesce(next_station, '') <> '' or coalesce(next_hotel, '') <> '' or coalesce(notes, '') <> '');

alter table public.event_admin_notes drop column if exists next_station;
alter table public.event_admin_notes drop column if exists next_hotel;
alter table public.event_admin_notes drop column if exists notes;

drop policy if exists "event_admin_notes_admin_all" on public.event_admin_notes;

drop policy if exists "event_admin_notes_select_auth" on public.event_admin_notes;
create policy "event_admin_notes_select_auth"
on public.event_admin_notes for select to authenticated using (true);

drop policy if exists "event_admin_notes_insert_admin" on public.event_admin_notes;
create policy "event_admin_notes_insert_admin"
on public.event_admin_notes for insert to authenticated
with check (public.is_admin());

drop policy if exists "event_admin_notes_update_admin" on public.event_admin_notes;
create policy "event_admin_notes_update_admin"
on public.event_admin_notes for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "event_admin_notes_delete_admin" on public.event_admin_notes;
create policy "event_admin_notes_delete_admin"
on public.event_admin_notes for delete to authenticated
using (public.is_admin());
