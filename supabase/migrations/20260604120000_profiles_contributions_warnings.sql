-- Beitragsdatum (manuell), Verwarnungen, Vertrags-PDF-Pfad

alter table public.profiles
  add column if not exists contribution_date date;

alter table public.profiles
  add column if not exists warning_count int not null default 0;

alter table public.profiles
  add column if not exists contract_pdf_path text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_warning_count_nonneg'
  ) then
    alter table public.profiles
      add constraint profiles_warning_count_nonneg check (warning_count >= 0);
  end if;
end$$;

create table if not exists public.member_warnings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  issued_by uuid references public.profiles(id) on delete set null,
  comment_type text not null check (comment_type in ('post', 'poll', 'giveaway')),
  comment_id uuid not null,
  comment_text text not null,
  comment_created_at timestamptz not null,
  context_title text,
  context_author_name text,
  context_kind text not null check (context_kind in ('post', 'poll', 'giveaway')),
  created_at timestamptz not null default now()
);

create index if not exists member_warnings_member_idx
  on public.member_warnings (member_id, created_at desc);

alter table public.member_warnings enable row level security;

drop policy if exists "member_warnings_admin_select" on public.member_warnings;
create policy "member_warnings_admin_select"
on public.member_warnings for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Admins may delete poll/giveaway comments (moderation)
drop policy if exists "poll_comments_delete_admin" on public.poll_comments;
create policy "poll_comments_delete_admin"
on public.poll_comments for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
