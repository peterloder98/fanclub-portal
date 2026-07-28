-- Zahlungserinnerung: neuer Text mit Bankdaten und {{salutation}}

update public.email_templates
set
  subject = 'Erinnerung: Mitgliedsbeitrag Anni Perka Fanclub',
  body_text = $text${{salutation}},

dein aktueller Mitgliedsbeitrag für den Anni Perka Fanclub ist noch nicht vollständig bei uns eingegangen.

Jahresbeitrag: {{fee_eur}}
Bereits gezahlt: {{fee_paid_eur}}
Noch offen: {{fee_open_eur}}

Bitte sei so lieb und überweise den offenen Betrag zeitnah auf das Fanclubkonto:
Empfänger: {{bank_account_holder}}
IBAN: {{bank_iban}}
BIC: {{bank_bic}}
Verwendungszweck: {{bank_reference}}

Bei Fragen melde dich jederzeit gerne bei uns.$text$,
  updated_at = now()
where key = 'membership_payment_reminder';
