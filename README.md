# quiz-metodo-calice

Quiz de diagnóstico ("qual código está rodando em você") — canal de captura pro
Método Cálice, link na bio da Ge. Mesmo padrão de infra do `larinterior-site`:
HTML estático + função serverless na Vercel, sem framework.

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

## Antes do primeiro deploy

1. **Rodar a migration** `supabase/migrations/0001_add_quiz_result.sql` no projeto
   Supabase "Serena Mente Feliz" (SQL Editor) — adiciona `lead_events.quiz_result`.
2. **Criar o atributo customizado `RESULTADO_QUIZ`** no Brevo (Contatos → Atributos)
   — tipo texto. Usado pela futura automação de e-mail pra montar o link
   `.../material?r={{ contact.RESULTADO_QUIZ }}`.
3. **Env vars na Vercel** (mesmas do `larinterior-site`, mesmo projeto Supabase):
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `BREVO_LIST_ID`
   — ver [[credenciais]] no vault. Decidir se usa a mesma lista do Lar Interior ou
   uma lista nova no Brevo pra este funil.

## Deploy

Segue o SOP - Deploy na Vercel (GitHub) do vault: `git init` → repo no GitHub →
import na Vercel → env vars → domínio (`quiz.serenamentefeliz.com`, a criar) →
Deployment Protection desativada. Ainda não inicializado — feito sob demanda do Yan.

## Pendências conhecidas

- Automação Brevo dos "próximos dias" sobre o Método Cálice (o material termina
  com esse gancho) — ainda não existe.
- Variante de hook por canal (Ge vs. lives da Camilla) — adiada, este lançamento
  cobre só o canal da Ge. Ver seção "Personalização por canal" na nota de estrutura.
- Design visual — combinado que fica pra depois da estrutura validada. CSS atual
  é só um placeholder neutro (paleta lilás/roxo, sem compromisso com identidade final).
