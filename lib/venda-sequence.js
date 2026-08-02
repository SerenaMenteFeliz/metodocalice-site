// Sequência de VENDA pós-lançamento — diferente da nutrição (aquecimento,
// sem oferta) e do e-mail de lançamento (o anúncio em si). Esta dispara
// SÓ pra quem já recebeu o e-mail de lançamento (lancamento-email.js) e
// ainda não comprou, cadenciada a partir da data do lançamento de cada
// contato (ver api/cron-venda.js).
//
// Sem contador de vaga fabricado. Se um dia existir um teto real de vagas
// da turma fundadora com aplicação de verdade no checkout, dá pra citar
// esse número aqui como fato — até lá, a pressão vem do conteúdo (a
// condição não vai durar pra sempre), não de um número inventado. Ver a
// linha vermelha registrada em "Referência - Quiz Funnels (Pesquisa 2026)"
// no vault: contador de vaga fabricado é o tipo de coisa que quebra
// confiança assim que percebida.

import { firstName } from './nutricao-sequence.js';

const ENTRAR_URL = 'https://serena-app-lac.vercel.app/metodo-calice/entrar';
const PRECO_FUNDADORA = 'R$ 37,00';

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

const VENDA_SEQUENCE = [
  {
    slug: 'venda1-objecao',
    minGapDays: 1,
    assunto: () => 'Se a primeira reação foi "depois eu vejo"',
    html: ({ nome, unsubscribeUrl }) => wrap(
      `
      <p>Oi${nome ? ', ' + nome : ''}.</p>
      <p>Se quando eu avisei que abriu, a primeira reação foi "depois eu vejo com calma": normal, e eu queria só nomear o que geralmente está por trás disso.</p>
      <p>Não é preguiça, e não é falta de interesse. É o próprio padrão que o quiz identificou em você agindo de novo, agora na decisão de começar. Adiar decisão que envolve mudança real é exatamente o mecanismo que o Método Cálice existe pra destravar.</p>
      <p>Não precisa decidir com pressa. Só não deixa esse padrão decidir por você sem perceber.</p>
      ${button(ENTRAR_URL, 'Ver o Método Cálice')}
      <p>Geovana &middot; Método Cálice</p>
      `,
      unsubscribeUrl
    ),
  },
  {
    slug: 'venda2-por-dentro',
    minGapDays: 2,
    assunto: () => 'O que tem por dentro do Método Cálice',
    html: ({ nome, unsubscribeUrl }) => wrap(
      `
      <p>Oi${nome ? ', ' + nome : ''}.</p>
      <p>Pra ficar concreto, sem enrolação, é isto que você recebe:</p>
      <p><strong>O Livro</strong>, com 13 capítulos que explicam como esses códigos se formam e como a reprogramação mental funciona de verdade.</p>
      <p><strong>Os 10 Dias de Prática Guiada</strong>, um dia de cada vez, misturando leitura, exercício e reflexão, pra sair da teoria e criar o caminho novo na prática.</p>
      <p>Tudo isso vive dentro do app da Serena Mente Feliz, no seu próprio ritmo, sem prazo de validade depois que você entra.</p>
      ${button(ENTRAR_URL, 'Entrar no Método Cálice')}
      <p>Geovana &middot; Método Cálice</p>
      `,
      unsubscribeUrl
    ),
  },
  {
    slug: 'venda3-fechamento',
    minGapDays: 2,
    assunto: () => `A condição de ${PRECO_FUNDADORA} da turma fundadora`,
    html: ({ nome, unsubscribeUrl }) => wrap(
      `
      <p>Oi${nome ? ', ' + nome : ''}.</p>
      <p>Esse é o último e-mail dessa sequência, então vou ser direta: a condição da turma fundadora (${PRECO_FUNDADORA}) é pra esse grupo inicial, e não vai se repetir depois que essa turma fechar.</p>
      <p>Não vou te dar um número fabricado de "vagas restantes" só pra criar pressa. A pressa aqui é real de um jeito diferente: quanto mais cedo você começa, mais cedo esse código para de rodar.</p>
      ${button(ENTRAR_URL, 'Entrar no Método Cálice')}
      <p>Se ficou alguma dúvida, é só responder este e-mail.</p>
      <p>Geovana &middot; Método Cálice</p>
      `,
      unsubscribeUrl
    ),
  },
];

export { VENDA_SEQUENCE, firstName };
