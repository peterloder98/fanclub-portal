-- Radio-Voting: fehlende Anni-Stars nachziehen, Test-Enddaten verlängern

-- Punkte für Teilnahmen, bei denen der Insert wegen ungültiger entity_id fehlschlug
insert into public.points_transactions (user_id, points, reason, entity_type, entity_id)
select p.user_id, 1, 'radio_voting', 'radio_voting_participation', p.id
from public.radio_voting_participations p
where not exists (
  select 1
  from public.points_transactions pt
  where pt.user_id = p.user_id
    and pt.reason = 'radio_voting'
    and pt.entity_id = p.id
);

-- Abgelaufene Test-Votings wieder sichtbar machen (Ende Ende 2026)
update public.radio_voting_campaigns
set
  ends_at = '2026-12-31 23:59:00+01',
  updated_at = now()
where is_active = true
  and ends_at < now() + interval '1 day';

-- Region optional (Feld entfällt in der UI)
alter table public.radio_voting_campaigns
  alter column region set default '';

update public.radio_voting_campaigns
set region = ''
where region is not null and trim(region) <> '';

-- Fehlende Beispiel-Sender nachziehen (falls beim Seed nur teilweise angelegt)
insert into public.radio_voting_campaigns (
  station, region, chart_name, voting_url, ends_at, song_title, instructions, steps, sort_order
)
select v.station, '', v.chart_name, v.voting_url, v.ends_at, v.song_title, v.instructions, v.steps, v.sort_order
from (values
  ('Radio Hamburg', 'TOP 845', 'https://www.radiohamburg.de/charts/top-845/voting', timestamptz '2026-12-31 23:59:00+01', 'Anni Perka — aktueller Titel', 'Stimme für Anni in der TOP 845 ab — je höher der Platz, desto öfter läuft der Song im Programm.', array['Link öffnen und ggf. Cookie-Banner bestätigen.', 'Nach „Anni Perka“ oder dem Songtitel suchen.', 'Song auswählen und Stimme abgeben (oft 1× täglich möglich).', 'Seite offen lassen, bis „Danke für deine Stimme“ erscheint.']::text[], 10),
  ('NDR 2', 'Soundcheck', 'https://www.ndr.de/radio/ndr2/sendungen/soundcheck/voting', timestamptz '2026-12-31 23:59:00+01', 'Anni Perka — Soundcheck-Kandidatin', 'Im NDR-2-Soundcheck entscheidet das Publikum über neue Titel — Anni braucht deine Stimme für Rotation.', array['Auf den Voting-Link tippen (NDR-Seite).', 'Anni Perka in der Kandidatenliste finden.', 'Auf „Abstimmen“ / Herz klicken.', 'Bei Bedarf morgen erneut abstimmen — viele Charts erlauben tägliche Stimmen.']::text[], 20),
  ('Bayern 3', 'Bayern 3 Votes', 'https://www.bayern3.de/bayern3votes', timestamptz '2026-12-31 23:59:00+01', 'Anni Perka — Bayern 3 Votes', 'Bayern 3 Votes ist das Hörer-Voting des Senders — gute Platzierungen bringen mehr Airplay.', array['Voting-Seite öffnen und Anni Perka suchen.', 'Titel markieren und Stimme abgeben.', 'Optional: Link mit Freunden teilen, damit mehr Fans mitmachen.']::text[], 30),
  ('Radio Regenbogen', 'TOP 25', 'https://www.regenbogen.de/charts/top-25/voting', timestamptz '2026-12-31 23:59:00+01', 'Anni Perka — TOP-25-Kandidatin', 'In der Radio-Regenbogen-TOP-25 kannst du Anni nach oben voten — Top-Plätze bedeuten häufigere Plays.', array['Link öffnen → Chart-Voting aufrufen.', 'Song von Anni Perka wählen.', 'Stimme bestätigen — bei Regenbogen oft mehrfach pro Woche möglich.']::text[], 40),
  ('MDR Jump', 'Live-Charts', 'https://www.mdrjump.de/charts/live-charts/voting', timestamptz '2026-12-31 23:59:00+01', 'Anni Perka — Live-Charts', 'MDR Jump Live-Charts: Hörerstimmen bestimmen die Playlist — hilf Anni in die vorderen Ränge.', array['Voting-Link öffnen.', 'Nach Anni Perka filtern oder in der Liste scrollen.', 'Abstimmen und Erfolgsmeldung abwarten.', 'Fanclub-Tipp: Erinnerung im Kalender für tägliches Voting setzen.']::text[], 50)
) as v(station, chart_name, voting_url, ends_at, song_title, instructions, steps, sort_order)
where not exists (
  select 1 from public.radio_voting_campaigns c where c.station = v.station
);
