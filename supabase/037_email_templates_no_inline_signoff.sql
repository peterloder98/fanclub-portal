-- E-Mail-Vorlagen: keine Grußformeln / App-Signaturzeilen am Ende (Signatur wird beim Versand angehängt)
-- Run in Supabase SQL Editor.

update public.email_templates set
  body_text = E'Liebe/r {{first_name}},

dein Antrag als neues Mitglied für den Anni Perka Fanclub ist eingegangen.

Bitte denke an die Überweisung des Mitgliedsbeitrages auf das im Antrag angegebene Konto.

Sobald der Betrag eingegangen ist, schalten wir dich für die Fanclub App als Benutzer frei und fügen dich in die WhatsApp-Gruppe des Fanclubs hinzu.',
  updated_at = now()
where key = 'membership_application_received';

update public.email_templates set
  body_text = E'Hallo {{admin_first_name}},

soeben ({{submitted_at}}) ist ein neuer Mitgliedschaftsantrag von {{applicant_name}} eingegangen.

Bitte klicke hier, um ihn dir anzusehen:
{{application_admin_url}}

Sobald der Beitrag eingegangen ist, schalte das Mitglied als neu frei.',
  updated_at = now()
where key = 'membership_application_admin_notify';

update public.email_templates set
  body_text = E'Hallo {{first_name}},

vielen Dank für deinen Mitgliedschaftsantrag beim Anni-Perka-Fanclub e. V.

Der Mitgliedsbeitrag in Höhe von {{fee_eur}} ist bei uns noch nicht eingegangen. Bitte überweise den Betrag auf das im Antrag genannte Konto.

Erst nach Zahlungseingang schalten wir deinen Zugang zur Fanclub-App frei und nehmen dich – sofern gewünscht – in die WhatsApp-Gruppe als aktives Mitglied auf.

Bei Fragen melde dich gerne bei uns.',
  updated_at = now()
where key = 'membership_payment_reminder';

update public.email_templates set
  body_text = E'Hey {{greeting_name}},

gerne möchte ich dir den digitalen Mitgliedsantrag beim Beitritt in den Anni Perka Fanclub senden.

Mit Klick hier: {{application_link}}
kommst du auf unsere eigene Seite und kannst alle benötigten Daten ausfüllen und den entsprechenden Vorgängen zustimmen, sowie digital unterzeichnen.

Im Anschluss überweise bitte den Mitgliedsbeitrag von {{fee_eur}} auf das im Antrag genannte Konto.

Nach Eingang des Betrages schalten wir dich als Benutzer für unsere Fanclub App frei und fügen dich in die Fanclub Whatsapp Gruppe hinzu.',
  updated_at = now()
where key = 'membership_form_invite';

update public.email_templates set
  body_text = E'Liebe Admins,

das Gewinnspiel {{giveaway_title}} ist beendet und wartet auf die glücklichen Gewinner, bitte klickt hier und lost die Gewinner aus:

{{giveaway_admin_url}}',
  updated_at = now()
where key = 'giveaway_ended_admin_notify';

update public.email_templates set
  body_text = E'Liebe/r {{first_name}},

du hast am Gewinnspiel „{{giveaway_title}}“ beim Anni Perka Fanclub teilgenommen.

Wir dürfen dir mitteilen, dass du folgenden Preis gewonnen hast:

„{{prize_name}}“

Bitte melde dich kurz per E-Mail oder WhatsApp-Nachricht (an einen der Admins), um die weiteren Schritte und wie du deinen Gewinn erhältst zu besprechen.',
  updated_at = now()
where key = 'giveaway_winner_congrats';
