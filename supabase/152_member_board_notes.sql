-- Interne Vorstands-Bemerkungen am Mitglied (nicht öffentlich).
-- Einmal im Supabase SQL Editor ausführen.

create table if not exists public.member_board_notes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  note text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint member_board_notes_note_len check (char_length(note) <= 2000)
);

comment on table public.member_board_notes is
  'Nur Vorstand: interne Hinweise zum Mitglied (z. B. nicht kontaktieren). Nicht für die Mitglieder-App.';

drop trigger if exists member_board_notes_set_updated_at on public.member_board_notes;
create trigger member_board_notes_set_updated_at
before update on public.member_board_notes
for each row execute function public.set_updated_at();

alter table public.member_board_notes enable row level security;

revoke all on table public.member_board_notes from public;
grant select, insert, update, delete on table public.member_board_notes to authenticated;
grant all on table public.member_board_notes to service_role;

drop policy if exists "member_board_notes_admin_all" on public.member_board_notes;
create policy "member_board_notes_admin_all"
on public.member_board_notes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
