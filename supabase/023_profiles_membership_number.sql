-- Mitgliedsnummer (vom Vorstand vergeben) + E-Mail-Vorlage Zahlungserinnerung
-- Run after 022_fix_handle_new_user_role.sql

alter table public.profiles
  add column if not exists membership_number text;

create unique index if not exists profiles_membership_number_unique
  on public.profiles (membership_number)
  where membership_number is not null and membership_number <> '';

insert into public.email_templates (key, name, description, subject, body_text, body_html)
values (
  'membership_payment_reminder',
  'Zahlungserinnerung Mitgliedsbeitrag',
  'Erinnerung an offenen Mitgliedsbeitrag vor Freischaltung der App / WhatsApp.',
  'Zahlungserinnerung Mitgliedsbeitrag Anni Perka Fanclub',
  E'Hallo {{first_name}},\n\nvielen Dank für deinen Mitgliedschaftsantrag beim Anni-Perka-Fanclub e. V.\n\nDer Mitgliedsbeitrag in Höhe von {{fee_eur}} ist bei uns noch nicht eingegangen. Bitte überweise den Betrag auf das im Antrag genannte Konto.\n\nErst nach Zahlungseingang schalten wir deinen Zugang zur Fanclub-App frei und nehmen dich – sofern gewünscht – in die WhatsApp-Gruppe als aktives Mitglied auf.\n\nBei Fragen melde dich gerne bei uns.\n\n{{admin_signature_text}}',
  NULL
)
on conflict (key) do nothing;
