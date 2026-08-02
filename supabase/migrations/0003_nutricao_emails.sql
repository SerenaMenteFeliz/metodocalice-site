-- Sequência de e-mail "próximos dias" (nutrição pós-material do Método Cálice).
-- Aplicada via conexão direta ao Postgres (senha em 70 - IA/credenciais.md no
-- Vault Zuppas) — Supabase habilita RLS automaticamente em tabela nova, sem
-- nenhuma policy (ver Conceito - RLS do Supabase Vem Habilitada por Padrão
-- no vault): só o service_role acessa, que é a única coisa que deveria
-- acessar essas duas tabelas mesmo (o cron e o /api/subscribe).

create table if not exists nutricao_emails_sent (
  contact_id uuid not null references contacts(id) on delete cascade,
  email_slug text not null,
  sent_at timestamptz not null default now(),
  primary key (contact_id, email_slug)
);

create table if not exists nutricao_opt_out (
  contact_id uuid primary key references contacts(id) on delete cascade,
  opted_out_at timestamptz not null default now()
);
