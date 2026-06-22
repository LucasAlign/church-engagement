// Vercel serverless function — the server-side seam for Karen's model calls.
// The browser POSTs { model, system, messages } here; this function adds the
// OpenAI key (kept server-side, never shipped to the client) and returns
// { model, text }. Set OPENAI_API_KEY in Vercel → Settings → Environment
// Variables (NOT prefixed with VITE_, so it stays server-only).

const ALLOWED_MODELS = new Set(['gpt-4o-mini', 'gpt-4o']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not set on the server.' });
  }

  // Vercel parses JSON bodies automatically; guard anyway.
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { model, system, messages } = body;

  if (!ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: `Unsupported model: ${model}` });
  }
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  const chatMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages,
  ];

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature: 0.5,
        max_tokens: 700,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: `OpenAI error (${r.status})`, detail: detail.slice(0, 500) });
    }

    const data = await r.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ model, text });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach OpenAI', detail: String(err).slice(0, 300) });
  }
}
