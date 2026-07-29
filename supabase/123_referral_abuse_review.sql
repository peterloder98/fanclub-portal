-- Referral abuse review: held points + review cases + relax forever-unique email index

alter table public.points_transactions
  add column if not exists held_at timestamptz;

comment on column public.points_transactions.held_at is
  'Wenn gesetzt: Punkte vorläufig gesperrt (zählen nicht zum Kontostand), z. B. Verdacht bei Empfehlungen';

create index if not exists points_transactions_held_at_idx
  on public.points_transactions (user_id, held_at)
  where held_at is not null;

drop index if exists public.membership_referral_sends_unique_email;

create table if not exists public.membership_referral_reviews (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'released', 'clawed_back')),
  reasons jsonb not null default '[]'::jsonb,
  referral_send_ids uuid[] not null default '{}',
  points_transaction_ids uuid[] not null default '{}',
  triggered_at timestamptz not null default now(),
  notified_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now()
);

create index if not exists membership_referral_reviews_open_idx
  on public.membership_referral_reviews (status, triggered_at desc)
  where status = 'open';

create unique index if not exists membership_referral_reviews_one_open_per_referrer
  on public.membership_referral_reviews (referrer_user_id)
  where status = 'open';

alter table public.membership_referral_reviews enable row level security;

drop policy if exists "membership_referral_reviews_admin_select" on public.membership_referral_reviews;
create policy "membership_referral_reviews_admin_select"
on public.membership_referral_reviews
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'referral_abuse_admin_notify',
  'Verdacht: Empfehlungs-Sterne prüfen',
  'Prüfung nötig: Auffällige Mitgliedseinladungen',
  $text$Hallo {{admin_first_name}},

bei den Mitglieder-Einladungen gibt es einen Verdachtsfall zur Prüfung.

Werber/in: {{referrer_name}} ({{referrer_email}})
Gründe: {{reasons_text}}

Einladungen (Auszug):
{{sends_list}}

Bitte im Admin-Bereich prüfen und Punkte freigeben oder zurücknehmen:
{{review_url}}

Dies ist eine stille Admin-Meldung — das Mitglied sieht keinen Hinweis.
$text$,
  $html$<p>Hallo {{admin_first_name}},</p>
<p>bei den Mitglieder-Einladungen gibt es einen Verdachtsfall zur Prüfung.</p>
<p><strong>Werber/in:</strong> {{referrer_name}} ({{referrer_email}})<br/>
<strong>Gründe:</strong> {{reasons_text}}</p>
<p><strong>Einladungen (Auszug):</strong></p>
<pre style="white-space:pre-wrap;font-family:inherit;">{{sends_list}}</pre>
<p><a href="{{review_url}}">Im Admin prüfen und entscheiden</a></p>
<p style="color:#64748b;font-size:13px;">Stille Admin-Meldung — das Mitglied sieht keinen Hinweis.</p>
$html$,
  'Admin-Alarm bei auffälligen Empfehlungs-Einladungen (Punkte vorläufig gehalten)'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description,
  updated_at = now();
