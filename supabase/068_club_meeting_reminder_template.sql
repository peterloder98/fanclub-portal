-- Bearbeitbare E-Mail-Vorlage: Erinnerung an Fanclub-Treffen (nur angemeldete Mitglieder)

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'club_meeting_reminder',
  'Fanclub-Treffen Erinnerung',
  'Erinnerung: {{meeting_title}} am {{meeting_date}}',
  E'Hallo {{first_name}},\n\nkurze Erinnerung an unser Fanclub-Treffen:\n\n{{meeting_title}}\n{{meeting_date}} · {{meeting_location}}\n\n{{cost_hint}}\n\nAlle Infos und deine Anmeldung:\n{{meeting_url}}\n\n{{admin_signature_text}}',
  'Wird 7 und 2 Tage vor dem Treffen nur an angemeldete Mitglieder gesendet. Platzhalter: first_name, meeting_title, meeting_date, meeting_location, meeting_url, cost_hint, admin_signature_text, admin_signature_block.'
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();
