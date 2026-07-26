-- Verwarnungen auch für Gruppenchat-Nachrichten

alter table public.member_warnings
  drop constraint if exists member_warnings_comment_type_check;

alter table public.member_warnings
  drop constraint if exists member_warnings_context_kind_check;

alter table public.member_warnings
  add constraint member_warnings_comment_type_check
  check (comment_type in ('post', 'poll', 'giveaway', 'chat'));

alter table public.member_warnings
  add constraint member_warnings_context_kind_check
  check (context_kind in ('post', 'poll', 'giveaway', 'chat'));
