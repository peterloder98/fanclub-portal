-- Antragsteller-Bestätigung (bearbeitbar) + Standard-Signatur für E-Mails
-- Run in Supabase SQL Editor.

create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_admin_all" on public.app_settings;
create policy "app_settings_admin_all"
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.app_settings (key, value)
values ('default_mail_signature_id', 'club-default')
on conflict (key) do nothing;

insert into public.email_templates (key, name, description, subject, body_text, body_html)
values (
  'membership_application_received',
  'Antrag eingegangen (an Antragsteller/in)',
  'Bestätigung nach Absenden des Mitgliedschaftsantrags inkl. PDF-Anhang.',
  'Dein Antrag – Anni Perka Fanclub',
  E'Liebe/r {{first_name}},

dein Antrag als neues Mitglied für den Anni Perka Fanclub ist eingegangen.

Bitte denke an die Überweisung des Mitgliedsbeitrages auf das im Antrag angegebene Konto.

Sobald der Betrag eingegangen ist, schalten wir dich für die Fanclub App als Benutzer frei und fügen dich in die WhatsApp-Gruppe des Fanclubs hinzu.',
  NULL
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  subject = excluded.subject,
  body_text = excluded.body_text,
  updated_at = now();
