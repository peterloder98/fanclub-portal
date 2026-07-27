-- Geschlechtskorrekte Anrede: Baustein {{salutation}} in personenbezogenen Vorlagen.
-- Renderer ersetzt zudem Legacy „Liebe/r {{first_name}}“ automatisch um.

update public.email_templates
set
  body_text = regexp_replace(
    body_text,
    'Liebe/r\s*\{\{\s*first_name\s*\}\}',
    '{{salutation}}',
    'gi'
  ),
  body_html = case
    when body_html is null then null
    else regexp_replace(
      body_html,
      'Liebe/r\s*\{\{\s*first_name\s*\}\}',
      '{{salutation}}',
      'gi'
    )
  end,
  updated_at = now()
where body_text ~* 'Liebe/r\s*\{\{\s*first_name\s*\}\}'
   or coalesce(body_html, '') ~* 'Liebe/r\s*\{\{\s*first_name\s*\}\}';

-- Zahlungserinnerung / Treffen: Hallo → Baustein (konsistent gegendert)
update public.email_templates
set
  body_text = regexp_replace(
    body_text,
    '^Hallo\s*\{\{\s*first_name\s*\}\},?',
    '{{salutation}},',
    'i'
  ),
  body_html = case
    when body_html is null then null
    else regexp_replace(
      body_html,
      'Hallo\s*\{\{\s*first_name\s*\}\},?',
      '{{salutation}},',
      'gi'
    )
  end,
  updated_at = now()
where key in ('membership_payment_reminder', 'club_meeting_reminder')
  and (
    body_text ~* '^Hallo\s*\{\{\s*first_name\s*\}\}'
    or coalesce(body_html, '') ~* 'Hallo\s*\{\{\s*first_name\s*\}\}'
  );

update public.email_templates
set
  description = coalesce(description || ' ', '') ||
    'Anrede: Baustein {{salutation}}, (Lieber/Liebe/Liebe/r nach Geschlecht).'
where key in (
  'membership_application_received',
  'membership_payment_reminder',
  'giveaway_winner_congrats',
  'membership_approved_welcome',
  'club_meeting_reminder',
  'app_access_setup'
)
and coalesce(description, '') not ilike '%{{salutation}}%';
