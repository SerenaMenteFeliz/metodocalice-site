// Função serverless (Vercel) — recebe o lead do quiz e:
//   1. GRAVA NO SUPABASE  (sistema de registro — CRÍTICO; se falhar, aborta e avisa)
//      - upsert em "contacts"   (1 linha por e-mail)
//      - insert em "lead_events" (1 linha por opt-in; event_type/offer/product + UTMs + resultado do quiz)
//   2. adiciona ao Brevo  (e-mail; best-effort — se falhar, o lead já está salvo)
//      - grava o atributo customizado RESULTADO_QUIZ, usado pela automação de e-mail
//        pra montar o link de entrega personalizado (.../material?r={{ contact.RESULTADO_QUIZ }})
//
// Mesmo padrão do larinterior-site/api/subscribe.js — só adiciona o campo "result".
//
// Env vars (Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL                — https://<projeto>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   — Supabase → Project Settings → API → service_role
//   BREVO_API_KEY               — (opcional) Brevo → SMTP & API → API Keys (v3)
//   BREVO_LIST_ID               — (opcional) Brevo → Contatos → Listas → id numérico
//   POSTHOG_API_KEY             — (opcional) chave pública do projeto PostHog (mesma
//                                  usada no client, ver assets/posthog-init.js) — sem
//                                  ela, pula silenciosamente (best-effort)
//   POSTHOG_HOST                — (opcional) default https://us.i.posthog.com

const VALID_RESULTS = ['aprovador', 'sabotador', 'ausente', 'controlador'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const { name, email } = body;

  const emailOk =
    typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  const contact = {
    email: email.trim().toLowerCase(),
    name: (name || '').trim() || null,
  };

  const result = VALID_RESULTS.includes(body.result) ? body.result : null;

  const event = {
    event_type: body.event_type || 'isca',
    offer: body.offer || 'quiz-diagnostico',
    product: body.product || 'metodo-calice',
    utm_source: body.utm_source || null,
    utm_medium: body.utm_medium || null,
    utm_campaign: body.utm_campaign || null,
    utm_content: body.utm_content || 'direto',
    quiz_result: result,
  };

  // ---------- 1. SUPABASE (crítico) ----------
  let contactId;
  try {
    contactId = await saveToSupabase(contact, event);
  } catch (err) {
    console.error('Falha ao gravar no Supabase:', err.message);
    return res.status(500).json({ error: 'Não conseguimos salvar agora. Tenta de novo?' });
  }

  // ---------- 2. BREVO (best-effort) ----------
  let brevo = 'skipped';
  try {
    brevo = await addToBrevo(contact, result);
  } catch (err) {
    console.error('Falha no Brevo (lead já salvo no Supabase):', err.message);
    brevo = 'failed';
  }

  // ---------- 3. POSTHOG (best-effort, aguardado — funções serverless não
  // garantem rodar código depois do response ser enviado, então "fire-and-
  // forget" de verdade aqui perderia o evento às vezes; falha não derruba
  // a captura, só não conta pro funil) ----------
  // distinct_id = contactId (contacts.id do Supabase) — mesma convenção de
  // identidade que o serena-app já usa (Track.tsx, captureServer), não
  // e-mail. É o que deixa o perfil da pessoa contínuo do quiz até a compra:
  // sem isso, quiz e app apareceriam como duas pessoas diferentes na PostHog.
  try {
    await capturePostHog('lead_submitted', contactId, event);
  } catch (err) {
    console.error('Falha no PostHog (lead já salvo):', err.message);
  }

  return res.status(200).json({ ok: true, brevo, contact_id: contactId });
}

async function capturePostHog(eventName, distinctId, properties) {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return; // sem chave, roda igual, só não mede (mesmo padrão do serena-app)
  const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
  const resp = await fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      event: eventName,
      distinct_id: distinctId,
      properties,
    }),
  });
  if (!resp.ok) throw new Error(`PostHog capture ${resp.status}`);
}

// --- Supabase: upsert contact + insert lead_event ---
async function saveToSupabase(contact, event) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes');

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  // 1a. Upsert contact — on conflict(email): atualiza name e updated_at
  const upsertResp = await fetch(`${url}/rest/v1/contacts`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ ...contact, updated_at: new Date().toISOString() }),
  });

  if (!upsertResp.ok && upsertResp.status !== 409) {
    const err = await upsertResp.json().catch(() => ({}));
    throw new Error(`contacts upsert ${upsertResp.status}: ${JSON.stringify(err)}`);
  }

  // 1b. Buscar o id do contact (necessário para a FK em lead_events)
  const selectResp = await fetch(
    `${url}/rest/v1/contacts?email=eq.${encodeURIComponent(contact.email)}&select=id`,
    { headers: { ...headers, Prefer: 'return=representation' } }
  );
  const rows = await selectResp.json();
  if (!rows || rows.length === 0) throw new Error('Não encontrou o contact após upsert');
  const contactId = rows[0].id;

  // 1c. Insert lead_event
  const eventResp = await fetch(`${url}/rest/v1/lead_events`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ contact_id: contactId, ...event }),
  });

  if (!eventResp.ok) {
    const err = await eventResp.json().catch(() => ({}));
    throw new Error(`lead_events insert ${eventResp.status}: ${JSON.stringify(err)}`);
  }

  return contactId;
}

// --- Brevo (best-effort) ---
async function addToBrevo(contact, result) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!apiKey || !listId) {
    console.warn('Brevo não configurado — pulando (lead já no Supabase).');
    return 'skipped';
  }

  const attributes = { FIRSTNAME: contact.name };
  if (result) attributes.RESULTADO_QUIZ = result;

  const resp = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      email: contact.email,
      attributes,
      listIds: [listId],
      updateEnabled: true,
    }),
  });

  if (resp.status === 201 || resp.status === 204) return 'ok';
  const data = await resp.json().catch(() => ({}));
  if (data?.code === 'duplicate_parameter') return 'ok';
  throw new Error(`Brevo ${resp.status}: ${JSON.stringify(data)}`);
}
