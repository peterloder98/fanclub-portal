-- Einladung zum digitalen Mitgliedsantrag (Admin versendet Link per E-Mail)
-- Run in Supabase SQL Editor.

insert into public.email_templates (key, name, description, subject, body_text, body_html)
values (
  'membership_form_invite',
  'Einladung Antragsformular (Link per E-Mail)',
  'Admin sendet den Link zum digitalen Mitgliedsantrag an eine Person.',
  'Digitaler Mitgliedsantrag Anni Perka Fanclub',
  E'Hey {{greeting_name}},

gerne möchte ich dir den digitalen Mitgliedsantrag beim Beitritt in den Anni Perka Fanclub senden.

Mit Klick hier: {{application_link}}
kommst du auf unsere eigene Seite und kannst alle benötigten Daten ausfüllen und den entsprechenden Vorgängen zustimmen, sowie digital unterzeichnen.

Im Anschluss überweise bitte den Mitgliedsbeitrag von {{fee_eur}} auf das im Antrag genannte Konto.

Nach Eingang des Betrages schalten wir dich als Benutzer für unsere Fanclub App frei und fügen dich in die Fanclub Whatsapp Gruppe hinzu.

Wir freuen uns sehr über dein Interesse und hoffen dich bald als neues Mitglied begrüßen zu dürfen.

{{admin_signature_text}}',
  NULL
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  subject = excluded.subject,
  body_text = excluded.body_text,
  updated_at = now();
