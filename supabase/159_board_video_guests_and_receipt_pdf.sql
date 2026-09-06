-- Extra-Gäste für Vorstands-Videobesprechung (nur Call-Link, kein App-Konto)
-- plus PDF-Belege im club-documents Bucket.

update storage.buckets
set
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'],
  file_size_limit = 10485760
where id = 'club-documents';

insert into public.email_templates (key, name, subject, body_text, description)
values (
  'board_video_meeting_guest_invite',
  'Videobesprechung — Extra-Gast (ohne App)',
  'Einladung: {{meeting_title}} am {{meeting_date}}',
  E'{{salutation}},\n\ndu bist zur Videobesprechung mit dem Vorstand und Anni eingeladen:\n\n{{meeting_title}}\n{{meeting_date}}\n\nRaum ab {{join_opens_time}} Uhr · Video ab {{meeting_time}} Uhr (max. 1 Stunde)\n\nDein persönlicher Link (kein App-Zugang nötig):\n{{meeting_url}}\n\nDu kannst denselben Link mehrfach und auf anderen Geräten öffnen. Ein neuer Versand vom Vorstand ersetzt den alten Link.\n\nBitte den neuesten Link aus der E-Mail nutzen. Wenn der Link nicht funktioniert, den Vorstand um einen neuen bitten.',
  'Persönlicher Gast-Link für Extra-Gäste (z. B. Management) ohne Login. Platzhalter: salutation, first_name, guest_name, meeting_title, meeting_date, meeting_time, join_opens_time, meeting_url.'
)
on conflict (key) do update set
  name = excluded.name,
  subject = excluded.subject,
  body_text = excluded.body_text,
  description = excluded.description,
  updated_at = now();
