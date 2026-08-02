// Sequência de e-mail "próximos dias" do Método Cálice — o gancho que o
// material sempre prometeu ("nos próximos dias você vai receber mais sobre
// isso") mas nunca foi construído. Cadência baseada em pesquisa 2026 de
// nutrição pós-lead-magnet (Day 0 -> 1 -> 3 -> 5 -> 7 -> 10, gaps entre
// mensagens, não dias corridos desde o quiz) — ver "Método Cálice - Plano de
// Funil Completo" no vault. `minGapDays` é o intervalo mínimo desde o
// e-mail anterior da sequência (o primeiro não tem gate, sai assim que o
// cron rodar pra esse contato).
//
// Sem urgência fabricada, sem contador de vaga, sem dado inventado — linha
// vermelha já registrada em "Referência - Quiz Funnels (Pesquisa 2026)".

const ARCHETYPE_LABEL = {
  aprovador: 'O Aprovador',
  sabotador: 'O Sabotador',
  ausente: 'O Ausente',
  controlador: 'O Controlador',
};

function firstName(name) {
  const first = (name || '').trim().split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function materialUrl(result) {
  const base = 'https://metodocalice.serenamentefeliz.com/material';
  return result ? `${base}?r=${result}` : base;
}

const ENTRAR_URL = 'https://serena-app-lac.vercel.app/metodo-calice/entrar';

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

// Aprofundamento do padrão por arquétipo (dia1) — extensão nova, escrita pra
// esta sequência, mas ancorada na mesma voz e nos mesmos mecanismos que o
// resultado do quiz já descreve (quiz/index.html, RESULTS), sem contradizer
// nem inventar característica nova sobre a pessoa.
const DIA1_POR_ARQUETIPO = {
  aprovador: {
    assunto: (nome) => `${nome ? nome + ', p' : 'P'}or que agradar virou seu piloto automático`,
    corpo: [
      'Tem uma pergunta que costuma incomodar quem carrega o Código do Aprovador: quando foi a última vez que você escolheu alguma coisa só porque você queria, sem checar antes o que os outros iam achar?',
      'Não é vaidade perguntar isso. É que esse código foi instalado bem cedo, numa época em que agradar era, de verdade, a forma mais segura de garantir amor ou cuidado. O problema é que o cérebro não avisa quando essa estratégia deixa de ser necessária. Ele só continua rodando.',
      'No livro completo eu mostro onde exatamente esse código costuma ser instalado, e por que ele é tão difícil de perceber por dentro (você não sente que está agradando, você sente que está "sendo gentil", "sendo fácil", "sendo boa pessoa").',
    ],
  },
  sabotador: {
    assunto: (nome) => `${nome ? nome + ', p' : 'P'}or que você trava bem na hora H`,
    corpo: [
      'Repara num padrão: você não trava no começo. Você trava perto do fim. Quando falta pouco. Quando já dava pra sentir o gosto de ter chegado lá.',
      'Isso não é coincidência, e não é falta de força de vontade (por mais que pareça exatamente isso por dentro). É um arquivo específico do Código do Sabotador: uma parte sua aprendeu, em algum momento, que chegar longe demais custa caro. E ela age antes de você perceber que está agindo.',
      'No livro eu mostro onde esse arquivo costuma ser gravado, e por que o "sabotador" não é uma falha de caráter, é uma estratégia de proteção que ficou desatualizada.',
    ],
  },
  ausente: {
    assunto: (nome) => `${nome ? nome + ', p' : 'P'}or que você some de si mesma sem perceber`,
    corpo: [
      'Uma pergunta simples costuma travar quem carrega o Código do Ausente: o que você quer, de verdade, agora? Não o que precisa ser feito. Não o que os outros esperam. O que você quer.',
      'Se a resposta demorou, não é porque você não sabe quem você é. É porque, em algum ponto, ficou mais seguro estar presente em tudo e ausente de si do que o contrário.',
      'No livro eu mostro como essa desconexão se forma, devagar, sem nenhum evento dramático, e por que ela não é quem você é. É o que te ensinaram a ser pra sobreviver.',
    ],
  },
  controlador: {
    assunto: (nome) => `${nome ? nome + ', p' : 'P'}or que soltar parece perigoso pra você`,
    corpo: [
      'Você já reparou que "relaxar" nunca é simples pra você? Sempre tem uma parte da sua cabeça calculando o próximo passo, prevendo o que pode dar errado, organizando pra que nada escape.',
      'Isso não é ser "controladora por natureza". É o Código do Controlador rodando: em algum momento você aprendeu que seguro é sinônimo de "eu sustentando tudo sozinha". E desde então, soltar virou sinônimo de risco.',
      'No livro eu mostro onde esse código nasceu, e o que acontece, de verdade, quando você experimenta soltar um pouco.',
    ],
  },
};

const GENERIC_ARQUETIPO = {
  assunto: () => 'Por que esse padrão não é sobre força de vontade',
  corpo: [
    'O resultado do seu quiz apontou um padrão específico, e vale voltar nele: ele não nasceu de fraqueza. Nasceu de uma estratégia que, em algum momento da sua vida, foi a mais inteligente disponível.',
    'O problema é que o cérebro não atualiza essas estratégias sozinho só porque a vida mudou. Ele continua rodando o mesmo código, mesmo quando ele já não serve mais.',
    'No livro completo eu mostro como esse código se forma, e como começar a reescrevê-lo.',
  ],
};

const SEQUENCE = [
  {
    slug: 'dia0-entrega',
    minGapDays: 0,
    assunto: ({ nome }) => (nome ? `${nome}, seu material está aqui` : 'Seu material está aqui'),
    html: ({ nome, result, unsubscribeUrl }) => {
      const label = ARCHETYPE_LABEL[result];
      return wrap(
        `
        <p>Oi${nome ? ', ' + nome : ''}.</p>
        <p>${label ? `Seu resultado no quiz foi <strong>${label}</strong>.` : 'Você fez o quiz do Método Cálice.'}</p>
        <p>Aqui está de novo o link do material completo, "O Código Invisível", caso queira reler ou continuar de onde parou:</p>
        ${button(materialUrl(result), 'Ler o material')}
        <p>Nos próximos dias eu vou te mandar mais alguns e-mails aprofundando esse padrão. Sem pressa e sem cobrança, só o que pode ajudar de verdade.</p>
        <p>Geovana &middot; Método Cálice</p>
        `,
        unsubscribeUrl
      );
    },
  },
  {
    slug: 'dia1-padrao',
    minGapDays: 1,
    assunto: ({ nome, result }) => (DIA1_POR_ARQUETIPO[result] || GENERIC_ARQUETIPO).assunto(nome),
    html: ({ nome, result, unsubscribeUrl }) => {
      const conteudo = DIA1_POR_ARQUETIPO[result] || GENERIC_ARQUETIPO;
      return wrap(
        `
        <p>Oi${nome ? ', ' + nome : ''}.</p>
        ${conteudo.corpo.map((p) => `<p>${p}</p>`).join('')}
        <p>Geovana &middot; Método Cálice</p>
        `,
        unsubscribeUrl
      );
    },
  },
  {
    slug: 'dia3-nao-e-culpa',
    minGapDays: 2,
    assunto: () => 'Isso não é falta de força de vontade',
    html: ({ nome, unsubscribeUrl }) => wrap(
      `
      <p>Oi${nome ? ', ' + nome : ''}.</p>
      <p>Uma coisa que eu preciso deixar clara, porque é a que mais trava as pessoas: reconhecer um padrão não é o mesmo que ter culpa por ele.</p>
      <p>Os códigos que a gente carrega (o de agradar, o de travar antes de chegar lá, o de sumir de si mesma, o de controlar tudo pra se sentir segura) foram instalados numa época em que eles funcionavam. Eram, de fato, a estratégia mais inteligente disponível naquele momento.</p>
      <p>O que muda as coisas não é força de vontade. É reprogramação: entender onde o código foi instalado, e criar, com prática real e repetida, um caminho novo pro cérebro seguir.</p>
      <p>É exatamente isso que o Método Cálice faz, com estrutura, não só com insight.</p>
      <p>Geovana &middot; Método Cálice</p>
      `,
      unsubscribeUrl
    ),
  },
  {
    slug: 'dia5-caminho',
    minGapDays: 2,
    assunto: () => 'O caminho que existe pra sair desse padrão',
    html: ({ nome, unsubscribeUrl }) => wrap(
      `
      <p>Oi${nome ? ', ' + nome : ''}.</p>
      <p>Entender o padrão é o primeiro passo. O segundo é ter um caminho de verdade pra reescrever ele, e é isso que é o Método Cálice.</p>
      <p>Ele tem duas partes:</p>
      <p><strong>O Livro</strong>, com 13 capítulos que explicam, em profundidade, como esses códigos se formam e como a reprogramação mental funciona de verdade (nada de fórmula mágica).</p>
      <p><strong>Os 10 Dias de Prática Guiada</strong>, um dia de cada vez, misturando leitura, exercício e reflexão, pra sair da teoria e criar o caminho novo na prática.</p>
      <p>Tudo isso vive dentro do app da Serena Mente Feliz, no seu próprio ritmo, sem prazo de validade.</p>
      <p>Geovana &middot; Método Cálice</p>
      `,
      unsubscribeUrl
    ),
  },
  {
    // Reescrito em 01/08: antes convidava a entrar de graça e já citava
    // preço/fundadora — mas o Método Cálice ainda não foi lançado pro
    // público (decisão do Yan). Enquanto isso não muda, nenhum e-mail
    // desta sequência pode empurrar entrada/compra — só aquecer e avisar
    // que vem por aí. O convite de verdade é o e-mail de lançamento
    // (ver lancamento-email.js), disparado à parte quando o Yan decidir abrir.
    slug: 'dia7-em-breve',
    minGapDays: 2,
    assunto: () => 'Ainda não abri as portas, mas quero te avisar quando abrir',
    html: ({ nome, unsubscribeUrl }) => wrap(
      `
      <p>Oi${nome ? ', ' + nome : ''}.</p>
      <p>Nesses e-mails eu venho te mostrando esse padrão de perto porque ele é real, e reconhecer ele já é o primeiro passo.</p>
      <p>O passo seguinte é o Método Cálice: o livro completo (13 capítulos) e os 10 dias de prática guiada que reescrevem esse código na prática, não só na cabeça.</p>
      <p>Ele ainda não está aberto pro público. Estou terminando os últimos detalhes antes de abrir de vez, e quando abrir, você vai ser uma das primeiras pessoas a saber, porque já está aqui comigo desde o quiz.</p>
      <p>Por enquanto, não tem nada pra você fazer. Só continuar de olho na caixa de entrada.</p>
      <p>Geovana &middot; Método Cálice</p>
      `,
      unsubscribeUrl
    ),
  },
  {
    slug: 'dia10-fique-de-olho',
    minGapDays: 3,
    assunto: () => 'Por enquanto é só isso, mas fica de olho',
    html: ({ nome, result, unsubscribeUrl }) => wrap(
      `
      <p>Oi${nome ? ', ' + nome : ''}.</p>
      <p>Esse é o último e-mail dessa sequência inicial. Não vou fingir que existe alguma urgência que não existe: o Método Cálice ainda está sendo preparado, sem data cravada.</p>
      <p>Quando abrir, eu volto a te escrever, dessa vez com o convite de verdade.</p>
      <p>Até lá, se quiser reler o material ou revisitar seu resultado, o link continua aqui:</p>
      ${button(materialUrl(result), 'Reler o material')}
      <p>Geovana &middot; Método Cálice</p>
      `,
      unsubscribeUrl
    ),
  },
];

export { SEQUENCE, ARCHETYPE_LABEL, firstName, materialUrl, ENTRAR_URL };
