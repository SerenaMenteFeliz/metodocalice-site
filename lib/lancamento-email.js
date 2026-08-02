// E-mail de LANÇAMENTO — disparo único pra base inteira quando o Yan decidir
// abrir o Método Cálice de vez, diferente da sequência de nutrição (drip por
// contato, cadenciada por dia). Este é um broadcast: todo mundo recebe o
// mesmo e-mail no mesmo dia, independente de onde estava na sequência de
// aquecimento. Disparado por api/enviar-lancamento.js, não por cron agendado
// (ver comentário lá — é o Yan quem decide a hora, não uma agenda fixa).
//
// Sem contador de vaga fabricado nem prazo inventado (linha vermelha já
// registrada em "Referência - Quiz Funnels (Pesquisa 2026)" no vault): o
// texto fala em "turma fundadora" como nome do grupo, não como contagem
// regressiva. Se o Yan quiser afirmar um número real de vagas ou uma data
// de fechamento, isso precisa ser um limite de verdade, aplicado no
// checkout — não só uma frase no e-mail.

import { ARCHETYPE_LABEL } from './nutricao-sequence.js';

const ENTRAR_URL = 'https://serena-app-lac.vercel.app/metodo-calice/entrar';
const PRECO_FUNDADORA = 'R$ 37,00';
const PRECO_CHEIO = 'R$ 341,00';

function firstName(name) {
  const first = (name || '').trim().split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function footer(unsubscribeUrl) {
  return `
    <p style="margin-top:32px;font-size:12px;color:#8a8296;line-height:1.5;">
      Você está recebendo esse e-mail porque fez o quiz do Método Cálice.
      Se não quiser mais receber esses e-mails,
      <a href="${unsubscribeUrl}" style="color:#8a8296;">cancele aqui</a>.
    </p>
  `;
}

function wrap(bodyHtml, unsubscribeUrl) {
  return `
    <div style="font-family:Georgia,'Times New Roman',serif;max-width:520px;margin:0 auto;padding:24px;color:#2b1e42;line-height:1.6;font-size:15px;">
      ${bodyHtml}
      ${footer(unsubscribeUrl)}
    </div>
  `;
}

function button(href, label) {
  return `
    <p style="text-align:center;margin:28px 0;">
      <a href="${href}" style="background:#2b1e42;color:#f7efe3;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;display:inline-block;">
        ${label}
      </a>
    </p>
  `;
}

const LANCAMENTO_SLUG = 'lancamento-oficial';

function lancamentoAssunto(nome) {
  return nome ? `${nome}, o Método Cálice está aberto` : 'O Método Cálice está aberto';
}

function lancamentoHtml({ nome, result, unsubscribeUrl }) {
  const label = ARCHETYPE_LABEL[result];
  return wrap(
    `
    <p>Oi${nome ? ', ' + nome : ''}.</p>
    <p>Chegou a hora que eu falei que ia chegar: o Método Cálice está aberto.</p>
    ${label ? `<p>Lá atrás, seu resultado no quiz foi <strong>${label}</strong>, e é exatamente esse padrão que o método trabalha, de raiz.</p>` : ''}
    <p>São 13 capítulos de livro e 10 dias de prática guiada, tudo dentro do app, no seu ritmo, sem prazo de validade depois que você entra.</p>
    <p>Pra quem está aqui desde o começo, com a gente nessa turma fundadora, o valor é ${PRECO_FUNDADORA} (o valor cheio é ${PRECO_CHEIO}). Essa condição não vai se repetir depois que essa turma fechar.</p>
    ${button(ENTRAR_URL, 'Entrar no Método Cálice')}
    <p>Se ficar qualquer dúvida, é só responder este e-mail. Eu leio.</p>
    <p>Geovana &middot; Método Cálice</p>
    `,
    unsubscribeUrl
  );
}

export { LANCAMENTO_SLUG, lancamentoAssunto, lancamentoHtml, firstName };
