-- Punkte & Badges: fairer Ausgleich (Merch-Silber wie andere Kategorien)
-- Referral-Freischaltung: 70 Punkte + Rang „Treue-Fan“ → nur App-Code (src/lib/points/values.ts)
--
-- Voraussetzung für Badge-Update: supabase/070_anni_stars_system.sql (Tabelle achievement_definitions).
-- Ohne 070: dieses Skript überspringt den Update-Block — die App funktioniert trotzdem.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'achievement_definitions'
  ) then
    update public.achievement_definitions
    set silver_threshold = 10
    where slug = 'merch_legend'
      and silver_threshold is distinct from 10;
  end if;
end $$;
