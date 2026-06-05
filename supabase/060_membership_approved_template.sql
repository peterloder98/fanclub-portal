-- Willkommens-E-Mail nach Freigabe des Mitgliedsantrags

insert into public.email_templates (key, name, description, subject, body_text, body_html)
values (
  'membership_approved_welcome',
  'Mitgliedschaft freigegeben (an neues Mitglied)',
  'Wird nach Freigabe des Antrags versendet — enthält Mitgliedsnummer und Link zur Passwortvergabe.',
  'Annahme deines Mitgliedsantrages',
  E'Liebe/r {{first_name}},\n\nEs freut uns dir heute Bescheid geben zu können, dass wir deinen Mitgliedsantrag freigeben konnten und begrüßen dich ganz herzlich im Anni Perka Fanclub.\n\nDeine Mitgliedsnummer: {{membership_number}}\n\nBitte vervollständige auch direkt deine Anmeldung zur Fanclub App — ein Klick, dein Passwort festlegen und du hast Zugang zu allen aktuellen Diskussionen, Umfragen, Gewinnspielen und einer ausführlichen Eventliste von Anni.\n\nHier die Registrierung abschließen:\n{{invite_url}}\n\nUmgehend werden wir dich auch in die WhatsApp-Gruppe aufnehmen.\n\n{{admin_signature_text}}',
  null
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  subject = excluded.subject,
  body_text = excluded.body_text,
  updated_at = now();
