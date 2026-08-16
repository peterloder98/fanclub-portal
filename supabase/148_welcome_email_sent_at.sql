-- Willkommens-Mail nach Freigabe: Versanddatum am Profil vermerken
alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;

comment on column public.profiles.welcome_email_sent_at is
  'Zeitpunkt, zu dem die Willkommens-/Zugangs-Mail (membership_approved_welcome) erfolgreich versendet wurde.';

-- Best-effort Backfill aus E-Mail-Protokoll (erste erfolgreiche Willkommens-Mail)
update public.profiles p
set welcome_email_sent_at = src.sent_at
from (
  select distinct on ((context->>'user_id'))
    (context->>'user_id')::uuid as user_id,
    created_at as sent_at
  from public.email_send_log
  where status = 'sent'
    and template_key = 'membership_approved_welcome'
    and context ? 'user_id'
    and (context->>'user_id') ~* '^[0-9a-f-]{36}$'
  order by (context->>'user_id'), created_at asc
) src
where p.id = src.user_id
  and p.welcome_email_sent_at is null;
