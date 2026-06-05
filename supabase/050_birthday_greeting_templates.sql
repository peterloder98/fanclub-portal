-- Geburtstagsgrüße (editierbar, rotierend per Hash)

create table if not exists public.birthday_greeting_templates (
  id uuid primary key default gen_random_uuid(),
  title_template text not null,
  body_template text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists birthday_greeting_templates_active_sort_idx
  on public.birthday_greeting_templates (is_active, sort_order);

alter table public.birthday_greeting_templates enable row level security;

drop policy if exists "birthday_greeting_templates_admin_all" on public.birthday_greeting_templates;
create policy "birthday_greeting_templates_admin_all"
on public.birthday_greeting_templates
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

insert into public.birthday_greeting_templates (title_template, body_template, sort_order)
select v.title_template, v.body_template, v.sort_order
from (values
  (
    1,
    'Alles Gute, {{first_name}}! 🎂',
    '{{salutation}}, wir wünschen dir heute alles Gute zu deinem Geburtstag — dein Anni Perka Fanclub.'
  ),
  (
    2,
    'Happy Birthday! 🎉',
    '{{salutation}}, der Fanclub feiert dich heute: alles Liebe zum Geburtstag und einen wundervollen Tag!'
  ),
  (
    3,
    'Geburtstagsgrüße',
    '{{salutation}}, von uns aus dem Anni Perka Fanclub: herzlichen Glückwunsch und viel Freude an deinem besonderen Tag!'
  ),
  (
    4,
    'Heute ist dein Tag!',
    '{{salutation}}, wir denken heute besonders an dich — alles Gute, Gesundheit und schöne Momente wünscht dir dein Fanclub-Team.'
  ),
  (
    5,
    'Zum Geburtstag',
    '{{salutation}}, danke, dass du Teil der Community bist. Heute wünschen wir dir von Herzen einen tollen Geburtstag! — Anni Perka Fanclub'
  )
) as v(sort_order, title_template, body_template)
where not exists (select 1 from public.birthday_greeting_templates limit 1);
