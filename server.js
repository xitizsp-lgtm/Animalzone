const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '8mb' }));
app.use(express.static('public'));
 
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.MODEL || 'claude-sonnet-5-5';
const DAILY_LIMIT = +process.env.DAILY_LIMIT || 20; // requests per visitor (IP) per day
const hits = new Map();
setInterval(() => hits.clear(), 24 * 60 * 60 * 1000);
 
async function askGemini(input, images) {
  const parts = [
    ...images.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d } })),
    { text: input + '\n\nReply with the JSON object only.' },
  ];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': GEMINI_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 2000 },
    }),
  });
  const j = await r.json();
  if (!r.ok) {
    const e = new Error((j.error && j.error.message) || 'Gemini error');
    e.status = r.status === 429 ? 429 : 502;
    throw e;
  }
  const c = j.candidates && j.candidates[0];
  return ((c && c.content && c.content.parts) || []).map(p => p.text || '').join('');
}
 
async function askClaude(input, images) {
  const content = [
    ...images.map(d => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d } })),
    { type: 'text', text: input + '\n\nReply with the JSON object only.' },
  ];
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': CLAUDE_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1200, messages: [{ role: 'user', content }] }),
  });
  const j = await r.json();
  if (!r.ok) {
    const e = new Error((j.error && j.error.message) || 'Claude error');
    e.status = 502;
    throw e;
  }
  return j.content.map(c => c.text || '').join('');
}
 
app.post('/api/sample', async (req, res) => {
  if (!GEMINI_KEY && !CLAUDE_KEY) return res.status(500).json({ error: 'Server has no GEMINI_API_KEY or ANTHROPIC_API_KEY set' });
  const n = (hits.get(req.ip) || 0) + 1;
  hits.set(req.ip, n);
  if (n > DAILY_LIMIT) return res.status(429).json({ error: 'Daily limit reached, try again tomorrow' });
 
  const { input, images = [] } = req.body || {};
  if (typeof input !== 'string' || input.length > 8000 || !Array.isArray(images) || images.length > 2)
    return res.status(400).json({ error: 'Bad request' });
 
  try {
    const text = GEMINI_KEY ? await askGemini(input, images) : await askClaude(input, images);
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw Object.assign(new Error('The AI did not return a result, try again'), { status: 502 });
    res.json(JSON.parse(m[0]));
  } catch (e) {
    console.error(e.message);
    res.status(e.status || 502).json({ error: String(e.message).slice(0, 160) });
  }
});
 
app.listen(process.env.PORT || 3000, () => console.log('BugDex running'));
 