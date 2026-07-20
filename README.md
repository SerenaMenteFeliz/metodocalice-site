# metodocalice-site

Site de captura do Método Cálice (renomeado de `quiz-metodo-calice` em 20/07 —
1 repo por produto, artefatos de funil como paths; slug sem hífen, igual
`larinterior-site`). Quiz de diagnóstico ("qual
código está rodando em você") — canal de captura pro Método Cálice, link na
bio da Ge. Mesmo padrão de infra do `larinterior-site`: HTML estático + função
serverless na Vercel, sem framework.

Estrutura completa e decisões de produto: ver `Quiz Diagnóstico - Estrutura e Copy`
no Vault Zuppas (`20 - Projetos/Método Cálice/`). Lógica/tipos de step: ver
`.claude/skills/quiz-funnel-designer/` no Vault Zuppas.

## Estrutura

```
quiz/index.html      → funil completo (hook, 8 perguntas, loading, revelação,
                        captura, resultado) — runtime próprio, sem dependência externa
material/index.html  → entrega do material gratuito "O Código Invisível",
                        lê ?r=<slug> pra mostrar a abertura personalizada por arquétipo
api/subscribe.js      → grava o lead no Supabase (contacts + lead_events) e no Brevo
supabase/migrations/  → 0001_add_quiz_result.sql (rodar antes do primeiro deploy)
```

Slugs de resultado: `aprovador`, `sabotador`, `ausente`, `controlador`.

## Estado (20/07/2026)

- Migration `0001_add_quiz_result.sql` **aplicada**.
- Atributo `RESULTADO_QUIZ` **criado no Brevo**, lista própria (id 4).
- Env vars **setadas na Vercel** (Production + Preview).
- Deployment Protection **desativada**.
- Domínio: **`metodocalice.serenamentefeliz.com`** (renomeado de `quiz.` em 20/07 —
  ver `Arquitetura - Dados e Tracking.md` no vault pro padrão: 1 subdomínio por
  produto, artefatos de funil como paths dentro dele). Aguardando só o registro
  DNS `A metodocalice 76.76.21.21` no Registro.br (ação do Yan).
- **GitHub conectado** (`SerenaMenteFeliz/metodocalice-site`, público — Hobby plan exige)
  e ligado à Vercel via `vercel git connect`. Push em `main` = redeploy automático
  em produção, testado e confirmado.

## Pendências conhecidas

- Automação Brevo dos "próximos dias" sobre o Método Cálice (o material termina
  com esse gancho) — ainda não existe.
- Variante de hook por canal (Ge vs. lives da Camilla) — adiada, este lançamento
  cobre só o canal da Ge. Ver seção "Personalização por canal" na nota de estrutura.
- Design visual — combinado que fica pra depois da estrutura validada. CSS atual
  é só um placeholder neutro (paleta lilás/roxo, sem compromisso com identidade final).
