-- Kalenderjahr-Beiträge: Jahres-Mail-Vorlage + Versand-Protokoll

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'membership_contribution_new_year',
  'Jahresbeitrag (neues Kalenderjahr)',
  'Dein Mitgliedsbeitrag {{contribution_year}} – Anni Perka Fanclub',
  $text${{salutation}},

wir wünschen dir frohe Weihnachten, einen guten Rutsch ins neue Jahr {{contribution_year}} und vor allem: bleib gesund!

Es ist schön, dass du Teil unserer Fanclub-Familie bist — gemeinsam erleben wir Musik, Treffen und besondere Momente rund um Anni. Darauf freuen wir uns auch im kommenden Jahr.

Für das Kalenderjahr {{contribution_year}} wird dein Jahresbeitrag in Kürze fällig:

Beitragsjahr:        {{contribution_year}}
Jahresbeitrag:       {{fee_eur}}
Fällig ab:           {{due_date}}
Zahlungsfrist:       bis {{payment_deadline}}

Bitte überweise den Betrag auf unser Fanclubkonto:

Empfänger:           {{bank_account_holder}}
IBAN:                {{bank_iban}}
Verwendungszweck:    {{payment_reference}}

Du kannst die Überweisung gerne schon vor dem 01.01.{{contribution_year}} tätigen. Bitte den Verwendungszweck exakt so übernehmen — dann können wir deinen Eingang schnell zuordnen.

So geht es weiter:
1. Du überweist den Jahresbeitrag bis spätestens {{payment_deadline}}.
2. Wir verbuchen deinen Eingang und bestätigen dies in der Fanclub-App.
3. Bei Fragen melde dich jederzeit bei uns.

{{open_contributions_block}}$text$,
  null,
  'Automatisch am 27.12. an aktive Mitglieder: Beitrag für das kommende Kalenderjahr. Signatur wird automatisch angehängt.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description,
  updated_at = now();

create table if not exists public.membership_contribution_notices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  contribution_year int not null check (contribution_year >= 2000 and contribution_year <= 2100),
  channel text not null default 'email' check (channel in ('email')),
  sent_at timestamptz not null default now(),
  unique (member_id, contribution_year, channel)
);

create index if not exists membership_contribution_notices_year_idx
  on public.membership_contribution_notices (contribution_year, sent_at desc);

alter table public.membership_contribution_notices enable row level security;

drop policy if exists "membership_contribution_notices_admin" on public.membership_contribution_notices;
create policy "membership_contribution_notices_admin"
on public.membership_contribution_notices
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
