-- Reorganização técnica (20/07): fecha a dívida de nomenclatura mista pt/en
-- no schema e a inconsistência do campo `source` (não seguia o formato
-- {etapa}-{oferta}-{produto} do resto do sistema).
--
-- 1. contacts.nome -> contacts.name (só nomenclatura, sem mudança de tipo/uso)
-- 2. lead_events.source deixa de ser escrito à mão e vira 3 colunas reais
--    (event_type/offer/product) + uma coluna gerada (source) só de leitura,
--    concatenando as 3 -- nunca mais grava direto em source. O quiz passa a
--    usar event_type='isca' (lead magnet, entrega imediata -- diferente de
--    'lista-espera', usado pelo Lar Interior, onde a pessoa aguarda algo que
--    ainda não existe). Tabela tinha 0 linhas no momento da migration -- sem
--    necessidade de backfill de dado real.
--
-- Aplicado via script pg ad-hoc direto no Postgres do Supabase (senha em
-- credenciais.md do vault) -- ver [[SOP - Captura de Leads (Brevo + Vercel)]].
-- Mesma alteração de schema também documentada em larinterior-site e
-- serena-app (schema é compartilhado entre os 3 repos).

alter table contacts
  rename column nome to name;

alter table lead_events
  drop column source;

alter table lead_events
  add column event_type text not null;

alter table lead_events
  add column offer text not null;

alter table lead_events
  add column product text not null;

alter table lead_events
  add column source text generated always as (event_type || '-' || offer || '-' || product) stored;
