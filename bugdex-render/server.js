// BugDex server: serves the game and forwards identification/market requests to the Claude API.
// Your API key stays here on the server (environment variable), never in the page.
const express = require('express');
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '8mb' }));
app.use(express.static('public'));

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const DAILY_LIMIT = +process.env.DAILY_LIMIT || 40; // requests per visitor (IP) per day
const hits = new Map();
setInterval(() => hits.clear(), 24 * 60 * 60 * 1000);

app.post('/api/sample', async (req, res) => {
  if (!KEY) return res.status(500).json({ error: 'Server has no ANTHROPIC_API_KEY set' });
  const n = (hits.get(req.ip) || 0) + 1;
  hits.set(req.ip, n);
  if (n > DAILY_LIMIT) return res.status(429).json({ error: 'Daily limit reached, try again tomorrow' });

  const { input, images = [] } = req.body || {};
  if (typeof input !== 'string' || input.length > 8000 || !Array.isArray(images) || images.length > 2)
    return res.status(400).json({ error: 'Bad request' });

  const content = [
    ...images.map(d => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d } })),
    { type: 'text', text: input + '\n\nReply with the JSON object only.' },
  ];
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, messages: [{ role: 'user', content }] }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'Upstream error' });
    const text = j.content.map(c => c.text || '').join('');
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON in answer');
    res.json(JSON.parse(m[0]));
  } catch (e) {
    res.status(502).json({ error: 'Could not read the answer, try again' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('BugDex running'));
