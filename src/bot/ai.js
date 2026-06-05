/**
 * AI v8.0 — Múltiplas fontes gratuitas (sem chave ou chave free)
 * Ordem: 1) Pollinations (texto sem chave)  2) Groq (free key)  3) HuggingFace (free key)
 * 4) BlackBox (sem chave)  5) API pública fallback
 *
 * Pollinations: https://text.pollinations.ai (sem chave, sem rate limit)
 * Groq: https://console.groq.com (chave gratuita, 10 req/min)
 * HuggingFace: https://huggingface.co/settings/tokens (chave gratuita)
 * BlackBox: https://www.blackbox.ai (web scraping)
 */
const mediaHandler = require('./mediaHandler');
const config = require('../config');
const { execSync } = require('child_process');

const SYSTEM_PROMPT = (ctx) =>
  `Você é ${config.bot.name}, um bot WhatsApp inteligente, sarcástico e amigável criado por ${config.owner.name}. ` +
  `Responda em português de Angola/Brasil, seja direto, use emojis, e mantenha respostas curtas (até 3 parágrafos). ` +
  `Se não souber algo, admita com honestidade.`;

// ========== UTILS ==========
function fetchPost(url, body, headers = {}, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http');
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const u = new URL(url);
    const isJson = typeof body !== 'string';
    const req = lib.request({
      hostname: u.hostname, path: u.pathname + u.search,
      port: u.port || (url.startsWith('https') ? 443 : 80),
      method: 'POST',
      headers: {
        'Content-Type': isJson ? 'application/json' : 'text/plain',
        'Content-Length': Buffer.byteLength(data),
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers,
      },
      timeout,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const txt = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode + ': ' + txt.slice(0, 200)));
          if (isJson) resolve(JSON.parse(txt));
          else resolve(txt);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data); req.end();
  });
}

function fetchGet(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http');
    const u = new URL(url);
    const req = lib.get({
      hostname: u.hostname, path: u.pathname + u.search,
      port: u.port || (url.startsWith('https') ? 443 : 80),
      headers: {
        'Accept': 'text/plain, application/json, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const txt = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode));
          resolve(txt);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ========== TEXTO ==========
async function chat(prompt, context = '') {
  const system = context || SYSTEM_PROMPT();

  // 1) POLLINATIONS — sem chave, sem limite, sempre funciona
  try {
    const text = await fetchGet(
      `https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}&model=openai&seed=${Date.now()}`
    );
    if (text && text.length > 5 && !text.includes('error') && !text.includes('Error')) {
      return text.trim().slice(0, 1500);
    }
  } catch (e) { console.warn('[AI] Pollinations:', e.message); }

  // 2) GROQ — extremamente rápido (precisa de GROQ_API_KEY no .env)
  if (process.env.GROQ_API_KEY) {
    try {
      const data = await fetchPost('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }, { Authorization: `Bearer ${process.env.GROQ_API_KEY}` });
      const text = data.choices?.[0]?.message?.content;
      if (text) return text.trim().slice(0, 1500);
    } catch (e) { console.warn('[AI] Groq:', e.message); }
  }

  // 3) HUGGINGFACE — modelos open source (precisa de HF_API_KEY no .env)
  if (process.env.HF_API_KEY) {
    try {
      const data = await fetchPost(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        { inputs: `<s>[INST] ${system}\n\n${prompt} [/INST]` },
        { Authorization: `Bearer ${process.env.HF_API_KEY}` }
      );
      const text = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      if (text) return text.replace(/<s>\[INST\].*?\[\/INST\]/s, '').trim().slice(0, 1500);
    } catch (e) { console.warn('[AI] HuggingFace:', e.message); }
  }

  // 4) BLACKBOX — sem chave (web scraping)
  try {
    const data = await fetchPost('https://www.blackbox.ai/api/chat', {
      messages: [{ id: 'user', role: 'user', content: prompt }],
      id: 'darkbot-' + Date.now(),
      previewToken: null,
      userId: null,
      codeModelMode: true,
      agentMode: {},
      trendingAgentMode: {},
      isMicMode: false,
      isChromeExt: false,
      githubToken: null,
      webSearchMode: true,
      model: 'gpt-4o',
    }, {}, 25000);
    if (typeof data === 'string' && data.length > 5) {
      return data.trim().slice(0, 1500);
    }
  } catch (e) { console.warn('[AI] BlackBox:', e.message); }

  // 5) FALLBACK — API pública simples
  try {
    const r = await mediaHandler.fetchJson(
      `https://api.nexoracle.com/ai/chat?apikey=free_key&prompt=${encodeURIComponent(prompt)}&system=${encodeURIComponent(system)}`
    );
    if (r?.result || r?.response) return (r.result || r.response).slice(0, 1500);
  } catch (e) {}

  return '🤖 *IA temporariamente indisponível.*\n\n' +
    '💡 Para melhorar, adicione uma chave gratuita no .env:\n' +
    '• GROQ_API_KEY (console.groq.com)\n' +
    '• HF_API_KEY (huggingface.co/settings/tokens)\n\n' +
    'Ou tente novamente em alguns segundos.';
}

// ========== IMAGEM ==========
async function generateImage(prompt) {
  // Pollinations — gera imagem em alta qualidade, sem chave, direto
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${Date.now()}`;
    const buf = await mediaHandler.fetchBuffer(url);
    if (buf && buf.length > 1000) return buf;
  } catch (e) { console.warn('[AI] Pollinations image:', e.message); }

  // Fallback: Lexica (busca imagens AI existentes)
  try {
    const r = await mediaHandler.fetchJson(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
    if (r?.images?.length) {
      const img = r.images[0];
      const src = img.src || img.url;
      if (src) return await mediaHandler.fetchBuffer(src.startsWith('http') ? src : 'https://image.lexica.art/full/' + img.id);
    }
  } catch (e) {}

  throw new Error('Geração de imagem falhou. Tente novamente ou descreva de outra forma.');
}

module.exports = { chat, generateImage };
