-- Adiciona a coluna que guarda qual dos 4 arquétipos o quiz calculou pra cada lead.
-- Nullable e opcional: só é preenchida em eventos vindos de quiz (source = 'quiz-diagnostico-metodo-calice').
-- Roda contra o mesmo projeto Supabase "Serena Mente Feliz" já usado por contacts/lead_events.
-- Aplicar direto no Supabase → SQL Editor (é um ALTER TABLE só, não precisa de script runner).

alter table lead_events
  add column if not exists quiz_result text;
