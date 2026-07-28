-- Punkte & Badges: fairer Ausgleich (Merch-Silber wie andere Kategorien)
-- Referral-Freischaltung: 70 Punkte (App-Code in src/lib/points/values.ts)

update public.achievement_definitions
set silver_threshold = 10
where slug = 'merch_legend'
  and silver_threshold is distinct from 10;
