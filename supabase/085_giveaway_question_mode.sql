-- Gewinnspiel: Teilnahme per einer Frage (Single-Choice, ohne Quiz-Lösung)

do $$
begin
  alter type public.giveaway_entry_mode add value 'question';
exception
  when duplicate_object then null;
end $$;
