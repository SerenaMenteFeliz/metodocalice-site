// Cron diário (Vercel Cron, ver vercel.json) que despacha a sequência de
// e-mail "próximos dias" (lib/nutricao-sequence.js) pra quem completou o
// quiz. Cada contato avança 1 e-mail por vez, respeitando o gap mínimo
// desde o e-mail anterior (nunca manda mais de 1 por execução por contato,
// mesmo que o gap acumulado permita mais de um) — ver "Método Cálice -
// Plano de Funil Completo" no vault pro racional da cadência.
//
// Protegido por CRON_SECRET (Vercel injeta "Authorization: Bearer
// <CRON_SECRET>" sozinho nas execuções agendadas quando a env var existe no
// projeto — mesmo header serve pra disparo manual de teste).
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BREVO_API_KEY,
// CRON_SECRET.

import { SEQUENCE, firstName } from '../lib/nutricao-sequence.js';
import { LANCAMENTO_SLUG } from '../lib/lancamento-email.js';

const SENDER = { name: 'Método Cálice', email: 'serenamentefelizoficial@gmail.com' };
const DAY_MS = 24 * 60 * 60 * 1000;

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
    const [leads, sentRows, optOutRows] = await Promise.all([
      sb(url, headers, 'lead_events?event_type=eq.isca&offer=eq.quiz-diagnostico&product=eq.metodo-calice&select=contact_id,created_at,quiz_result&order=created_at.asc'),
      sb(url, headers, 'nutricao_emails_sent?select=contact_id,email_slug,sent_at&order=sent_at.asc'),
      sb(url, headers, 'nutricao_opt_out?select=contact_id'),
    ]);

    // 1 linha por contato: created_at mais antigo (entrada no funil) e
    // quiz_result mais recente não nulo (caso a pessoa tenha refeito o quiz).
    const byContact = new Map();
    for (const row of leads) {
      const cur = byContact.get(row.contact_id);
      if (!cur) {
        byContact.set(row.contact_id, { firstSeenAt: row.created_at, result: row.quiz_result });
      } else if (row.quiz_result) {
        cur.result = row.quiz_result;
      }
    }

    const optedOut = new Set(optOutRows.map((r) => r.contact_id));

    const sentByContact = new Map();
    for (const row of sentRows) {
      if (!sentByContact.has(row.contact_id)) sentByContact.set(row.contact_id, []);
      sentByContact.get(row.contact_id).push(row);
    }

    const contactIds = [...byContact.keys()].filter((id) => !optedOut.has(id));
    if (contactIds.length === 0) return res.status(200).json({ processed: 0, sent: [] });

    const contacts = await sb(
      url,
      headers,
      `contacts?id=in.(${contactIds.join(',')})&select=id,email,name`
    );
    const contactById = new Map(contacts.map((c) => [c.id, c]));

    const results = { sent: [], skipped: 0, errors: [] };

    for (const contactId of contactIds) {
      const contact = contactById.get(contactId);
      if (!contact) continue;

      const already = sentByContact.get(contactId) || [];

      // Já recebeu o e-mail de lançamento (api/enviar-lancamento.js): a
      // fase de aquecimento pré-lançamento acabou pra essa pessoa, ela
      // passa a ser responsabilidade de cron-venda.js — continuar mandando
      // "ainda não abrimos" depois do lançamento seria contradizer o
      // próprio e-mail que já foi enviado.
      if (already.some((r) => r.email_slug === LANCAMENTO_SLUG)) {
        results.skipped++;
        continue;
      }

      const step = SEQUENCE[already.length];
      if (!step) {
        results.skipped++;
        continue; // já recebeu a sequência inteira
      }

      if (already.length > 0) {
        const lastSentAt = new Date(already[already.length - 1].sent_at).getTime();
        const dueAt = lastSentAt + step.minGapDays * DAY_MS;
        if (Date.now() < dueAt) {
          results.skipped++;
          continue;
        }
      }

      const ctx = {
        nome: firstName(contact.name),
        result: byContact.get(contactId).result,
        unsubscribeUrl: `https://metodocalice.serenamentefeliz.com/api/descadastrar?c=${contactId}`,
        contactId,
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

    return res.status(200).json({ processed: contactIds.length, ...results });
  } catch (err) {
    console.error('cron-nutricao falhou:', err.message);
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
