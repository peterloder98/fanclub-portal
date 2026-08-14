-- Einmalige +5 Werbe-Sterne pro Absender + Empfänger-E-Mail (auch bei Reminder-Mails / Parallel-Klicks).
-- Im Supabase SQL Editor ausführen.

create table if not exists public.membership_referral_point_awards (
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  send_id uuid references public.membership_referral_sends(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (sender_id, recipient_email)
);

comment on table public.membership_referral_point_awards is
  'Ledger: Werbe-Sterne (+5) maximal einmal pro Absender und Empfänger-Adresse. Reminder erzeugen neue Sends, aber keinen zweiten Bonus.';

create index if not exists membership_referral_point_awards_send_id_idx
  on public.membership_referral_point_awards (send_id)
  where send_id is not null;

alter table public.membership_referral_point_awards enable row level security;

-- Nur Service-Role / Backend (Admin-Client) schreibt; Mitglieder brauchen keinen direkten Zugriff.
drop policy if exists "membership_referral_point_awards_select_own" on public.membership_referral_point_awards;
create policy "membership_referral_point_awards_select_own"
on public.membership_referral_point_awards
for select
to authenticated
using (sender_id = auth.uid());

-- Bestehende Awards nachziehen (erste Send-ID pro Absender+E-Mail)
insert into public.membership_referral_point_awards (sender_id, recipient_email, send_id)
select distinct on (pt.user_id, lower(s.recipient_email))
  pt.user_id,
  lower(s.recipient_email),
  s.id
from public.points_transactions pt
join public.membership_referral_sends s on s.id = pt.entity_id
where pt.reason = 'membership_referral'
  and s.recipient_email is not null
  and length(trim(s.recipient_email)) > 0
order by pt.user_id, lower(s.recipient_email), s.created_at asc
on conflict do nothing;
