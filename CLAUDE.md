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
quiz/variantes.json      AS TELAS do quiz, uma entrada por variante (v1, v2...): textos,
                         ordem, opções, resultados. Fonte única, lida também pelo zuppas-life
quiz/index.html          só o desenho e o runtime: sorteia a variante e monta as telas do JSON
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

## Variantes do quiz (desde 12/09/2026)

**Editar o quiz é editar `quiz/variantes.json`, não o HTML.** O painel de funis do `zuppas-life`
lê esse mesmo arquivo do site no ar (lista de etapas, nomes, preview), então a edição chega nos
dois sem cópia à mão. Antes disso o painel tinha a ordem das 18 telas copiada numa lista, que
passaria a mentir em silêncio no dia em que uma tela entrasse ou saísse. Regras de edição no topo
do próprio JSON (`_leia_antes`); as que mais mordem:

- **id de tela é identidade na PostHog** (`step_id`). Mudar o texto mantém o id; tela nova ganha
  id novo. Renomear id de tela que já recebeu tráfego deixa os números dela órfãos.
- **`status`/`peso`**: `ativa` recebe tráfego pelo peso; `rascunho` e `encerrada` só abrem por
  `?v=<id>`. O sorteio é local (sem feature flag, pra não atrasar a abertura) e fica guardado em
  `localStorage.quiz_variante`: a mesma pessoa sempre vê a mesma variante.
- Todo evento sai com `quiz_variant` (via `posthog.register`, pega até o `material_viewed`) e o
  `quiz_step_viewed` ganhou `step_id`. O lead grava `lead_events.quiz_variant`.
- Tipo de tela novo (fora de abertura, nome, pergunta, pausa, calculando, revelacao, captura,
  resultado) exige código no `quiz/index.html`. Arquétipo novo exige `VALID_RESULTS` no
  `api/subscribe.js` e o material.

**Migration `0004_add_quiz_variant.sql`**: enquanto não for aplicada, o PostgREST recusa o insert
inteiro com `PGRST204`, e o `subscribe.js` regrava o lead sem a coluna. Não tirar essa volta
antes de a coluna existir: sem ela, todo lead vira 500.

## `?preview=1`, `?preview_step=` e `?v=`

O painel interno do `zuppas-life` embute o quiz ao vivo num iframe e navega etapa a etapa por esses
parâmetros; o PostHog é suprimido com `preview=1`. `preview_step` aceita o id da tela (`captura`,
é o que o painel usa) ou a posição (formato antigo). `v` escolhe a variante. Não remover nem
renomear sem ajustar o `zuppas-life`.

## E-mail

As 3 sequências existem em código, mas **a conta Brevo segue bloqueada pra envio transacional**
(revisão manual deles, não é limite de plano). Ou seja: cron rodando com sucesso não prova que
e-mail chegou. Conferir envio de verdade antes de dar qualquer sequência como validada.

## Ao mexer aqui

- Editar HTML direto, sem introduzir build ou framework.
- Cron que responde 200 não prova trabalho feito — conferir contador explícito de enviados, não o
  status agregado (`Conceito - Heartbeat Ok Não Prova Trabalho Feito`).
