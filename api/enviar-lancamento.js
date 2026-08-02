// Disparo de LANÇAMENTO — endpoint de gatilho MANUAL (o Yan chama isso uma
// vez, no dia que decidir abrir o Método Cálice de vez). Diferente de
// cron-nutricao.js, este NÃO está no vercel.json crons — não tem agenda,
// porque a data do lançamento é decisão de negócio, não calendário.
//
// Idempotente: roda de novo sem duplicar envio (cada contato só recebe o
// e-mail "lancamento-oficial" uma vez, controlado pela mesma tabela
// nutricao_emails_sent que a sequência de nutrição já usa).
//
// Efeito colateral importante: depois que alguém recebe este e-mail,
// cron-nutricao.js para de mandar o resto da sequência de aquecimento pra
// essa pessoa (checagem em cron-nutricao.js) — ela passa a ser
// responsabilidade da sequência de venda (cron-venda.js), não mais do
// aquecimento pré-lançamento.
//
// Brevo plano free = 300 e-mails/dia. Com a base de hoje (~20-30 contatos)
// não chega perto, mas o parâmetro ?limit protege se a lista crescer: roda
// em lotes, chama de novo no dia seguinte pro resto.
//
// Protegido pelo mesmo CRON_SECRET do cron-nutricao (Authorization: Bearer
// <CRON_SECRET>) — não é do Vercel Cron, mas evita disparo por qualquer um
// que descubra a URL.

import { LANCAMENTO_SLUG, lancamentoAssunto, lancamentoHtml, firstName } from '../lib/lancamento-email.js';

const SENDER = { name: 'Método Cálice', email: 'serenamentefelizoficial@gmail.com' };
const DEFAULT_LIMIT = 250;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase não configurado' });
  if (!brevoKey) return res.status(500).json({ error: 'Brevo não configurado' });

  const limit = Math.max(1, Math.min(DEFAULT_LIMIT, Number(req.query?.limit) || DEFAULT_LIMIT));
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    const [leads, sentRows, optOutRows] = await Promise.all([
      sb(url, headers, 'lead_events?event_type=eq.isca&offer=eq.quiz-diagnostico&product=eq.metodo-calice&select=contact_id,quiz_result&order=created_at.asc'),
      sb(url, headers, `nutricao_emails_sent?email_slug=eq.${LANCAMENTO_SLUG}&select=contact_id`),
      sb(url, headers, 'nutricao_opt_out?select=contact_id'),
    ]);

    const byContact = new Map();
    for (const row of leads) {
      const cur = byContact.get(row.contact_id);
      if (!cur) byContact.set(row.contact_id, { result: row.quiz_result });
      else if (row.quiz_result) cur.result = row.quiz_result;
    }

    const alreadySent = new Set(sentRows.map((r) => r.contact_id));
    const optedOut = new Set(optOutRows.map((r) => r.contact_id));

    const pending = [...byContact.keys()].filter((id) => !alreadySent.has(id) && !optedOut.has(id));
    if (pending.length === 0) return res.status(200).json({ pending: 0, sent: [], remaining: 0 });

    const batch = pending.slice(0, limit);
    const contacts = await sb(url, headers, `contacts?id=in.(${batch.join(',')})&select=id,email,name`);
    const contactById = new Map(contacts.map((c) => [c.id, c]));

    const results = { sent: [], errors: [] };

    for (const contactId of batch) {
      const contact = contactById.get(contactId);
      if (!contact) continue;
      const ctx = {
        nome: firstName(contact.name),
        result: byContact.get(contactId).result,
        unsubscribeUrl: `https://metodocalice.serenamentefeliz.com/api/descadastrar?c=${contactId}`,
      };
      try {
        await sendBrevoEmail(brevoKey, {
          to: { email: contact.email, name: ctx.nome || undefined },
          subject: lancamentoAssunto(ctx.nome),
          htmlContent: lancamentoHtml(ctx),
        });
        await sb(url, headers, 'nutricao_emails_sent', {
          method: 'POST',
          body: { contact_id: contactId, email_slug: LANCAMENTO_SLUG },
        });
        results.sent.push(contactId);
      } catch (err) {
        results.errors.push({ contact_id: contactId, error: err.message });
      }
    }

    return res.status(200).json({
      pending: pending.length,
      sent: results.sent.length,
      errors: results.errors,
      remaining: pending.length - batch.length,
    });
  } catch (err) {
    console.error('enviar-lancamento falhou:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function sb(baseUrl, headers, path, opts = {}) {
  const resp = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: { ...headers, ...(opts.method === 'POST' ? { Prefer: 'return=minimal' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Supabase ${path} ${resp.status}: ${JSON.stringify(err)}`);
  }
  if (opts.method === 'POST') return null;
  return resp.json();
}

async function sendBrevoEmail(apiKey, { to, subject, htmlContent }) {
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ sender: SENDER, to: [to], subject, htmlContent }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Brevo smtp/email ${resp.status}: ${JSON.stringify(err)}`);
  }
}
