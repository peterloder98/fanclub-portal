-- Anni kann während des Lives neue Fragen schließen. Offene Fragen bleiben.

alter table public.live_sessions
  add column if not exists questions_closed_at timestamptz;

comment on column public.live_sessions.questions_closed_at is
  'Gesetzt: keine neuen Fragen im laufenden Live. Offene Fragen bleiben. Null: wieder erlaubt.';
