-- Variante do quiz em que o lead foi capturado (12/09/2026).
-- O quiz passou a ter variantes (quiz/variantes.json: v1, v2...) e o painel do
-- zuppas-life separa origem e arquétipo dos leads por variante. Sem esta coluna
-- essa separação não existe: a PostHog sabe a variante de cada visita, mas o
-- lead de verdade mora aqui.
--
-- Nullable de propósito: todo lead anterior a esta data é do V1 e fica NULL, e o
-- painel lê NULL como v1. Não fazer backfill: NULL diz "antes de existir
-- variante", que é verdade; 'v1' escrito à mão seria palpite com cara de dado.
--
-- Aplicar direto no Supabase → SQL Editor (é um ALTER TABLE só).
-- Até rodar, o api/subscribe.js grava o lead sem a coluna e segue (ver o
-- comentário do PGRST204 lá).

alter table lead_events
  add column if not exists quiz_variant text;
