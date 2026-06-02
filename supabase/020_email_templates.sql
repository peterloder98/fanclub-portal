-- Editable email templates (admin)
-- Run after 019_smtp_accounts.sql

create table if not exists public.email_templates (
  key text primary key,
  name text not null,
  subject text not null,
  body_text text not null,
  body_html text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

alter table public.email_templates enable row level security;

-- Service role only (admin UI via server actions)

insert into public.email_templates (key, name, description, subject, body_text, body_html)
values
(
  'membership_application_received',
  'Antrag eingegangen (an Antragsteller/in)',
  'Wird nach digitalem Absenden des Mitgliedschaftsantrags versendet (mit PDF-Anhang).',
  'Dein Mitgliedschaftsantrag – Anni-Perka-Fanclub',
  E'Hallo {{first_name}},\n\nvielen Dank für deinen digital unterzeichneten Mitgliedschaftsantrag beim Anni-Perka-Fanclub e. V. Im Anhang findest du deinen Antrag inklusive Satzung.\n\nWir prüfen deinen Antrag und bitten dich, den Mitgliedsbeitrag in Höhe von {{fee_eur}} auf das im Antrag angegebene Konto zu überweisen.\n\nSobald der Beitrag bei uns eingegangen ist, erhältst du eine weitere E-Mail mit einem Zugangslink zur Fanclub-App. Wenn du die Aufnahme in die WhatsApp-Gruppe gewünscht hast, nehmen wir dich dafür ebenfalls auf.\n\nBei Fragen erreichst du uns jederzeit.\n\n{{admin_signature_text}}',
  NULL
),
(
  'membership_application_admin_notify',
  'Neuer Antrag (an Admins)',
  'Benachrichtigung an alle Admins bei neuem Mitgliedschaftsantrag.',
  'Neuer Mitgliedschaftsantrag: {{applicant_name}}',
  E'Es ist ein neuer digital unterzeichneter Mitgliedschaftsantrag eingegangen.\n\nName: {{applicant_name}}\nE-Mail: {{email}}\nAntrags-ID: {{application_id}}\n\nBitte prüfe den Antrag im Admin-Bereich und schalte die Mitgliedschaft nach Zahlungseingang frei:\n{{admin_applications_url}}\n\nDer vollständige Antrag ist als PDF angehängt.\n\n{{admin_signature_text}}',
  NULL
)
on conflict (key) do nothing;
