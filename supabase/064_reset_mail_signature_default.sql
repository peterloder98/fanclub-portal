-- Standard-E-Mail-Signatur wieder auf allgemeine Fanclub-Signatur setzen
-- (keine persönliche Admin-Unterschrift als System-Default).

insert into public.app_settings (key, value)
values ('default_mail_signature_id', 'club-default')
on conflict (key) do update set
  value = 'club-default',
  updated_at = now();
