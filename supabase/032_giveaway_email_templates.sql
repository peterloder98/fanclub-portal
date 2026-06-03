-- E-Mail-Vorlagen Gewinnspiele
insert into public.email_templates (key, name, description, subject, body_text, body_html)
values
(
  'giveaway_ended_admin_notify',
  'Gewinnspiel beendet (Admin-Auslosung)',
  'Wird an alle Admins gesendet, wenn ein Gewinnspiel abgelaufen ist.',
  'Das Gewinnspiel {{giveaway_title}} ist beendet, bitte auslosen',
  E'Liebe Admins,

das Gewinnspiel {{giveaway_title}} ist beendet und wartet auf die glücklichen Gewinner, bitte klickt hier und lost die Gewinner aus:

{{giveaway_admin_url}}

Liebe Grüße
Eure Anni Perka Fanclub App',
  NULL
),
(
  'giveaway_winner_congrats',
  'Gewinnspiel: Gewinner-Benachrichtigung',
  'Admin sendet an einen Gewinner nach der Auslosung.',
  'Herzliche Glückwünsche, du hast gewonnen!',
  E'Liebe/r {{first_name}},

du hast am Gewinnspiel „{{giveaway_title}}“ beim Anni Perka Fanclub teilgenommen.

Wir dürfen dir mitteilen, dass du folgenden Preis gewonnen hast:

„{{prize_name}}“

Bitte melde dich kurz per E-Mail oder WhatsApp-Nachricht (an einen der Admins), um die weiteren Schritte und wie du deinen Gewinn erhältst zu besprechen.

{{admin_signature_text}}',
  NULL
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  subject = excluded.subject,
  body_text = excluded.body_text,
  updated_at = now();
