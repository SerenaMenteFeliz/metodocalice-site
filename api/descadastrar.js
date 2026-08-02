// Cancelamento da sequência de nutrição (link no rodapé de cada e-mail, ver
// lib/nutricao-sequence.js). Só marca opt-out da sequência de e-mail, não
// mexe no cadastro do quiz nem no acesso ao material/app.

export default async function handler(req, res) {
  const contactId = req.query.c;
  if (!contactId || typeof contactId !== 'string') {
    return res.status(400).send('Link inválido.');
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).send('Erro interno.');

  try {
    await fetch(`${url}/rest/v1/nutricao_opt_out`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ contact_id: contactId }),
    });
  } catch (err) {
    console.error('descadastrar falhou:', err.message);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`
    <!doctype html>
    <html lang="pt-BR">
      <head><meta charset="utf-8" /><title>Cancelado</title></head>
      <body style="font-family:Georgia,serif;max-width:480px;margin:80px auto;padding:0 20px;color:#2b1e42;text-align:center;">
        <p>Pronto. Você não vai mais receber os e-mails da sequência do Método Cálice.</p>
        <p>O acesso ao material e ao app continua igual.</p>
      </body>
    </html>
  `);
}
