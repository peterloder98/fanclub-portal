-- Willkommen nach Freigabe: Mitgliedsnummer + App-Zugang (Setup-Link)
-- Inhalt wird zusätzlich über scripts/send-membership-approved-test-peter.ts upsertet.

update public.email_templates
set
  name = 'Mitgliedschaft freigegeben (an neues Mitglied)',
  description = 'Nach Freigabe digitaler Neuanmeldung: Mitgliedsnummer + App-Zugang (Setup-Link).',
  subject = 'Willkommen im Fanclub — deine Mitgliedsnummer {{membership_number}}',
  updated_at = now()
where key = 'membership_approved_welcome';
