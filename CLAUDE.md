# metodocalice-site — instruções para IA

Site de captura do **Método Cálice** (produto da Ge, dentro do guarda-chuva Serena Mente Feliz):
quiz de diagnóstico ("qual código está rodando em você") + entrega do material gratuito
"O Código Invisível" + as sequências de e-mail. HTML estático + funções serverless na Vercel.
**Sem framework, sem build** — mesmo padrão do `larinterior-site`.

Contexto de produto, copy e decisões vivem no **Vault Zuppas**
(`C:\Users\Yan\Desktop\Yan\Obsidian\Vault Zuppas`), não aqui:
`20 - Projetos/Método Cálice/Quiz Diagnóstico - Estrutura e Copy.md`,
`Método Cálice - Plano de Funil Completo.md`, `Método Cálice - Sequências de E-mail.md`,
`70 - IA/credenciais.md`. A lógica de tipos de step do quiz está na skill
`.claude/skills/quiz-funnel-designer/` do vault.

## Estrutura

```
quiz/index.html          funil completo (hook, 8 perguntas, loading, revelação, captura,
                         resultado) — runtime próprio, sem dependência externa
material/index.html      entrega do material grátis, lê ?r=<slug> pra abrir por arquétipo
api/subscribe.js         grava o lead no Supabase (crítico) e no Brevo (best-effort)
api/cron-nutricao.js     cron diário 12:00 UTC — sequência de nutrição pós-quiz
api/cron-venda.js        cron diário 12:30 UTC — sequência de venda pós-lançamento
api/enviar-lancamento.js disparo único do e-mail de lançamento
api/descadastrar.js      opt-out
lib/*-sequence.js        conteúdo e cadência das 3 sequências
supabase/migrations/     SQL versionado, aplicar à mão no painel
```

Slugs de arquétipo: `aprovador`, `sabotador`, `ausente`, `controlador`.

## Deploy

GitHub `SerenaMenteFeliz/metodocalice-site`, branch **`main`** (atenção: o `larinterior-site` usa
`master`). Push em `main` = redeploy automático. Domínio:
`metodocalice.serenamentefeliz.com` (DNS na Hostgator).

Antes de afirmar que uma correção está no ar: `git log origin/main..HEAD` e deploy `Ready` na
Vercel. Repo local ainda não linkado por `vercel link`.

## Env vars (Vercel, Production + Preview)

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `BREVO_LIST_ID` (=4),
`POSTHOG_API_KEY`. **`CRON_SECRET` está pendente desde 01/08/2026**: sem ela, os dois crons
rodam sem autenticação nenhuma (o código só exige o header quando a variável existe).

Duas armadilhas reais: chave do Supabase revogada em silêncio (04/08, 23 leads perdidos, o front
chama a API em fire-and-forget e mostra sucesso mesmo com 500) e BOM invisível em env var
quebrando `fetch` — ver os conceitos correspondentes no vault.

## Convenção de dados (compartilhada com `larinterior-site` e `serena-app`)

Cada opt-in grava `event_type` / `offer` / `product`. Aqui: `isca` / `quiz-diagnostico` /
`metodo-calice`.

- **`source` é coluna gerada** (concatena as 3). Nunca escrever nela.
- **A coluna de data em `lead_events` é `signed_at`, não `created_at`.** Em `contacts` é
  `created_at`. Query com o nome errado volta vazia, sem erro.
- `quiz_result` guarda o arquétipo. Todo campo coletado precisa de alguém que leia depois: em
  08/08 descobriu-se que 40 leads tinham arquétipo gravado e o app nunca lia nenhum. Ver
  `Conceito - Dado Coletado num Estágio do Funil Morre se Nenhum Estágio Seguinte For Dono Dele`.

## Atribuição por perfil (não regredir)

O quiz roda nas bios da Ge, da Camilla e da Liz ao mesmo tempo, todas apontando pro mesmo produto.
Quem é quem vem de `?utm_content=` (`geovana`, `camilla`, `liz`). Havia um **default hardcoded
`'geovana'`** que atribuía tudo a ela quando a URL vinha sem UTM; foi removido no commit `cec9f52`.
Não reintroduzir default de atribuição: campo vazio é melhor que campo com palpite.

## `?preview=1` e `?preview_step=N`

O painel interno do `zuppas-life` embute o quiz ao vivo num iframe e navega etapa a etapa por esses
parâmetros; o PostHog é suprimido nesse modo. Não remover nem renomear sem ajustar o `zuppas-life`.

## E-mail

As 3 sequências existem em código, mas **a conta Brevo segue bloqueada pra envio transacional**
(revisão manual deles, não é limite de plano). Ou seja: cron rodando com sucesso não prova que
e-mail chegou. Conferir envio de verdade antes de dar qualquer sequência como validada.

## Ao mexer aqui

- Editar HTML direto, sem introduzir build ou framework.
- Cron que responde 200 não prova trabalho feito — conferir contador explícito de enviados, não o
  status agregado (`Conceito - Heartbeat Ok Não Prova Trabalho Feito`).
