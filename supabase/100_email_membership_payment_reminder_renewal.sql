-- Zahlungserinnerung: auch für Jahresbeitrag bestehender Mitglieder

insert into public.email_templates (key, name, subject, body_text, body_html, description)
values (
  'membership_payment_reminder',
  'Zahlungserinnerung Mitgliedsbeitrag',
  'Erinnerung: Mitgliedsbeitrag Anni Perka Fanclub ({{membership_period}})',
  $text$Hallo {{first_name}},

für die Beitragsperiode {{membership_period}} ist dein Mitgliedsbeitrag noch nicht vollständig bei uns eingegangen.

Jahresbeitrag: {{fee_eur}}
Bereits gezahlt: {{fee_paid_eur}}
Noch offen: {{fee_open_eur}}

Bitte überweise den offenen Betrag zeitnah auf das Club-Konto (wie im Antrag bzw. in den Club-Infos angegeben).

Bei Fragen melde dich gerne bei uns.$text$,
  null,
  'Erinnerung bei offenem Jahresbeitrag (Neuantrag oder Folgejahr)'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  body_html = excluded.body_html,
  description = excluded.description;
