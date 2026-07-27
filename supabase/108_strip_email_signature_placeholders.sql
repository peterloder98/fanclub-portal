-- Signatur-Platzhalter aus Vorlagen entfernen (Signatur wird beim Versand automatisch angehängt).

update public.email_templates
set
  body_text = regexp_replace(
    regexp_replace(coalesce(body_text, ''), '\{\{\s*admin_signature_block\s*\}\}', '', 'gi'),
    '\{\{\s*admin_signature_text\s*\}\}',
    '',
    'gi'
  ),
  body_html = case
    when body_html is null then null
    else regexp_replace(
      regexp_replace(body_html, '\{\{\s*admin_signature_block\s*\}\}', '', 'gi'),
      '\{\{\s*admin_signature_text\s*\}\}',
      '',
      'gi'
    )
  end,
  updated_at = now()
where coalesce(body_text, '') ~* 'admin_signature_(text|block)'
   or coalesce(body_html, '') ~* 'admin_signature_(text|block)';

update public.email_templates
set body_text = regexp_replace(body_text, E'\\n+$', '')
where body_text ~ E'\\n+$';
