// Cron diário (Vercel Cron, ver vercel.json) — sequência de VENDA
// pós-lançamento (lib/venda-sequence.js). Só entra em ação depois que
// api/enviar-lancamento.js já rodou pra um contato: sem lançamento
// registrado, não há o que vender ainda (ver cron-nutricao.js, que cuida
// do aquecimento pré-lançamento e para de mandar pra quem já recebeu o
// lançamento).
//
// Elegibilidade: recebeu o e-mail de lançamento + ainda não tem
// product_access ativo pro metodo_calice (não comprou) + não deu opt-out.
// A tabela product_access é do projeto serena-app, mas vive no MESMO
// projeto Supabase (reaproveitado por todo o guarda-chuva Serena, ver
// Arquitetura - Dados e Tracking no vault) — dá pra consultar direto daqui.
//
// Atenção ao mismatch de nomenclatura já conhecido: lead_events/nutricao
// usam "metodo-calice" (hífen), product_access usa "metodo_calice"
// (underscore) — tratado explicitamente abaixo, não é bug novo.
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BREVO_API_KEY,
// CRON_SECRET (mesmas do cron-nutricao).

import { VENDA_SEQUENCE, firstName } from '../lib/venda-sequence.js';
import { LANCAMENTO_SLUG } from '../lib/lancamento-email.js';

const SENDER = { name: 'Método Cálice', email: 'serenamentefelizoficial@gmail.com' };
const DAY_MS = 24 * 60 * 60 * 1000;
const PRODUCT_ACCESS_SLUG = 'metodo_calice';

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

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    const [lancamentoRows, sentRows, optOutRows, purchasedRows] = await Promise.all([
      sb(url, headers, `nutricao_emails_sent?email_slug=eq.${LANCAMENTO_SLUG}&select=contact_id,sent_at`),
      sb(url, headers, 'nutricao_emails_sent?select=contact_id,email_slug,sent_at&order=sent_at.asc'),
      sb(url, headers, 'nutricao_opt_out?select=contact_id'),
      sb(url, headers, `product_access?product=eq.${PRODUCT_ACCESS_SLUG}&status=eq.active&select=contact_id`),
    ]);

    const optedOut = new Set(optOutRows.map((r) => r.contact_id));
    const purchased = new Set(purchasedRows.map((r) => r.contact_id));

    const vendaSlugs = new Set(VENDA_SEQUENCE.map((s) => s.slug));
    const sentByContact = new Map();
    for (const row of sentRows) {
      if (!sentByContact.has(row.contact_id)) sentByContact.set(row.contact_id, []);
      sentByContact.get(row.contact_id).push(row);
    }

    const eligible = lancamentoRows
      .map((r) => r.contact_id)
      .filter((id) => !optedOut.has(id) && !purchased.has(id));

    if (eligible.length === 0) return res.status(200).json({ processed: 0, sent: [] });

    const contacts = await sb(url, headers, `contacts?id=in.(${eligible.join(',')})&select=id,email,name`);
    const contactById = new Map(contacts.map((c) => [c.id, c]));
    const lancamentoAt = new Map(lancamentoRows.map((r) => [r.contact_id, r.sent_at]));

    const results = { sent: [], skipped: 0, errors: [] };

    for (const contactId of eligible) {
      const contact = contactById.get(contactId);
      if (!contact) continue;

      const allSent = sentByContact.get(contactId) || [];
      const vendaSent = allSent.filter((r) => vendaSlugs.has(r.email_slug));

      const step = VENDA_SEQUENCE[vendaSent.length];
      if (!step) {
        results.skipped++;
        continue; // já recebeu a sequência de venda inteira
      }

      const lastAt = vendaSent.length > 0
        ? new Date(vendaSent[vendaSent.length - 1].sent_at).getTime()
        : new Date(lancamentoAt.get(contactId)).getTime();
      const dueAt = lastAt + step.minGapDays * DAY_MS;
      if (Date.now() < dueAt) {
        results.skipped++;
        continue;
      }

      const ctx = {
        nome: firstName(contact.name),
        unsubscribeUrl: `https://metodocalice.serenamentefeliz.com/api/descadastrar?c=${contactId}`,
      };

      try {
        await sendBrevoEmail(brevoKey, {
          to: { email: contact.email, name: ctx.nome || undefined },
          subject: step.assunto(ctx),
          htmlContent: step.html(ctx),
        });
        await sb(url, headers, 'nutricao_emails_sent', {
          method: 'POST',
          body: { contact_id: contactId, email_slug: step.slug },
        });
        results.sent.push({ contact_id: contactId, slug: step.slug });
      } catch (err) {
        results.errors.push({ contact_id: contactId, slug: step.slug, error: err.message });
      }
    }

    return res.status(200).json({ processed: eligible.length, ...results });
  } catch (err) {
    console.error('cron-venda falhou:', err.message);
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
