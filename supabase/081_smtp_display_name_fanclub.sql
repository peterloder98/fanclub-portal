-- Absendername in E-Mails: „Anni Perka Fanclub“ statt „Anni Perka“
update public.smtp_accounts
set display_name = 'Anni Perka Fanclub'
where display_name is null
   or trim(display_name) = ''
   or lower(trim(display_name)) in ('anni perka', 'anni-perka-fanclub e. v.', 'anni-perka-fanclub');
