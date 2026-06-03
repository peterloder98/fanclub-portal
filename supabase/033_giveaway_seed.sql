-- Test-Gewinnspiele (nach 031, nur wenn noch keine existieren)
-- Ersetzt Admin-Autor durch ersten Admin-Profil.

do $$
declare
  admin_id uuid;
  g1 uuid;
  g2 uuid;
  q1 uuid;
  q2 uuid;
  q3 uuid;
begin
  select id into admin_id from public.profiles where role = 'admin' order by created_at limit 1;
  if admin_id is null then
    raise notice 'Kein Admin-Profil – Seed übersprungen.';
    return;
  end if;

  if exists (select 1 from public.giveaways limit 1) then
    raise notice 'Gewinnspiele existieren bereits – Seed übersprungen.';
    return;
  end if;

  insert into public.giveaways (author_id, title, description, entry_mode, ends_at, status)
  values (
    admin_id,
    'Test: Fanclub-T-Shirt',
    'Einfach auf „Teilnehmen“ klicken – unter allen Teilnehmern wird ein Shirt verlost.',
    'simple',
    now() + interval '14 days',
    'active'
  )
  returning id into g1;

  insert into public.giveaway_prizes (giveaway_id, name, sort_order)
  values (g1, '1× Anni Perka Fanclub T-Shirt (Größe nach Absprache)', 0);

  insert into public.giveaways (author_id, title, description, entry_mode, ends_at, status)
  values (
    admin_id,
    'Test: Konzerttickets + Meet & Greet',
    'Beantworte alle Quiz-Fragen richtig, um teilnahmeberechtigt zu sein. Pro Preis wird ein Gewinner gezogen.',
    'quiz',
    now() + interval '21 days',
    'active'
  )
  returning id into g2;

  insert into public.giveaway_prizes (giveaway_id, name, sort_order) values
    (g2, '2× Konzertkarten', 0),
    (g2, '1× Meet & Greet', 1);

  insert into public.giveaway_questions (giveaway_id, question_text, sort_order)
  values (g2, 'In welchem Jahr wurde Anni Perka geboren?', 0)
  returning id into q1;
  insert into public.giveaway_question_options (question_id, label, sort_order, is_correct) values
    (q1, '1990', 0, false),
    (q1, '1992', 1, true),
    (q1, '1995', 2, false);

  insert into public.giveaway_questions (giveaway_id, question_text, sort_order)
  values (g2, 'Wie heißt Annis erster offizieller Fanclub-Song-Release (Platzhalter)?', 1)
  returning id into q2;
  insert into public.giveaway_question_options (question_id, label, sort_order, is_correct) values
    (q2, 'Herzschlag', 0, true),
    (q2, 'Sternenregen', 1, false),
    (q2, 'Mitternacht', 2, false);

  insert into public.giveaway_questions (giveaway_id, question_text, sort_order)
  values (g2, 'Was ist das Motto des Fanclubs (Platzhalter)?', 2)
  returning id into q3;
  insert into public.giveaway_question_options (question_id, label, sort_order, is_correct) values
    (q3, 'Gemeinsam laut sein', 0, true),
    (q3, 'Leise aber treu', 1, false),
    (q3, 'Nur online', 2, false);
end $$;
