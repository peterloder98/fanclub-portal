-- Admin-Benachrichtigung bei neuem Antrag (Wortlaut + Link zum Antragsdialog)
-- Run in Supabase SQL Editor.

insert into public.email_templates (key, name, description, subject, body_text, body_html)
values (
  'membership_application_admin_notify',
  'Neuer Antrag (an Admins)',
  'Benachrichtigung an alle Admins bei neuem Mitgliedschaftsantrag.',
  'Neuer Mitgliedsantrag: {{applicant_name}}',
  E'Hallo {{admin_first_name}},

soeben ({{submitted_at}}) ist ein neuer Mitgliedschaftsantrag von {{applicant_name}} eingegangen.

Bitte klicke hier, um ihn dir anzusehen:
{{application_admin_url}}

Sobald der Beitrag eingegangen ist, schalte das Mitglied als neu frei.

Liebe Grüße
Deine Anni Perka Fanclub App

{{admin_signature_text}}',
  NULL
)
on conflict (key) do update set
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();
