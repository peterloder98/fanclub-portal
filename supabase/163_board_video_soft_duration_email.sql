-- Soft planned duration for board video: email copy no longer implies a hard max.
UPDATE email_templates
SET
  body_text = replace(body_text, '(max. 1 Stunde)', '(geplant ca. 1 Stunde, endet nicht automatisch)'),
  body_html = replace(body_html, '(max. 1 Stunde)', '(geplant ca. 1 Stunde, endet nicht automatisch)')
WHERE key IN (
  'board_video_meeting_invite',
  'board_video_meeting_reminder',
  'board_video_meeting_anni_invite',
  'board_video_meeting_guest_invite'
)
AND (
  coalesce(body_text, '') LIKE '%(max. 1 Stunde)%'
  OR coalesce(body_html, '') LIKE '%(max. 1 Stunde)%'
);
