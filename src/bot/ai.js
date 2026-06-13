/**
 * IA robusta — Groq + Gemini + fallback público
 * Dark Net Engine 🕸️
 */
const mediaHandler = require('./mediaHandler');
const config = require('../config');
const botConfigCache = require('./botConfigCache');

function withTimeout(promise, ms, label = 'timeout') {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms))]);
}

function normalizeAiError(err, provider = 'IA') {
  const msg = String(err?.message || err || 'erro').replace(/\s+/g, ' ').trim();
  if (/401|invalid api key|api[_\s-]?key.*invalid/i.test(msg)) return `${provider}: chave inválida/expirada`;
  if (/429|quota|rate.?limit|exceeded/i.test(msg)) return `${provider}: cota/limite excedido`;
  if (/timeout|aborted|ETIMEDOUT/i.test(msg)) return `${provider}: timeout`;
  if (/GROQ_API_KEY|GEMINI_API_KEY/i.test(msg)) return `${provider}: chave não configurada`;
  return `${provider}: ${msg.slice(0, 160)}`;
}

async function getSystemPrompt(context = '') {
  if (context) return context;
  const custom = await botConfigCache.get('ai_system_prompt', '').catch(() => '');
  return custom || `Você é ${config.bot.name}, assistente WhatsApp criado por ${config.owner.name}. Responda em português de forma útil, objetiva, respeitosa e com energia Dark Net Engine 🕸️.`;
}


function needsLiveContext(prompt = '') {
  return /\b(hoje|agora|atual|atuais|not[ií]cia|noticias|últim|ultimo|recente|tempo real|mundo|angola|luanda|2026|pesquisa|web|internet|preço|cotação|resultado|jogo de hoje)\b/i.test(String(prompt));
}

function stripXml(s = '') {
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchTextFast(url, timeoutMs = 5500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 DarkBot/1.0', 'Accept': 'application/rss+xml,application/json,text/plain,*/*' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally { clearTimeout(timer); }
}

async function getGoogleNewsContext(query) {
  const q = encodeURIComponent(String(query || '').slice(0, 120));
  const url = `https://news.google.com/rss/search?q=${q}&hl=pt-PT&gl=AO&ceid=AO:pt-PT`;
  const xml = await fetchTextFast(url, 5500);
  const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/gi)]
    .slice(0, 5)
    .map((m, i) => `${i + 1}. ${stripXml(m[1])} (${stripXml(m[3])})`);
  return items.length ? `Notícias recentes:\n${items.join('\n')}` : '';
}

async function getDuckContext(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const txt = await fetchTextFast(url, 5000);
  const data = JSON.parse(txt);
  const parts = [];
  if (data.AbstractText) parts.push(data.AbstractText);
  if (Array.isArray(data.RelatedTopics)) {
    for (const t of data.RelatedTopics.slice(0, 3)) {
      if (t.Text) parts.push(t.Text);
    }
  }
  return parts.length ? `Referência web:\n${parts.slice(0, 4).join('\n')}` : '';
}

async function buildLiveContext(prompt) {
  if (!needsLiveContext(prompt)) return '';
  const contexts = [];
  try { const n = await getGoogleNewsContext(prompt); if (n) contexts.push(n); } catch {}
  try { const d = await getDuckContext(prompt); if (d) contexts.push(d); } catch {}
  if (!contexts.length) return '';
  return `\n\n[CONTEXTO WEB/NOTÍCIAS ATUAIS — use com cautela e cite como contexto recente]\n${contexts.join('\n\n')}\n[/CONTEXTO WEB]\n`;
}

async function chatGroq(prompt, context = '') {
  if (!config.ai.groqApiKey) throw new Error('GROQ_API_KEY não configurada');
  const system = await getSystemPrompt(context);
  const models = [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'llama3-8b-8192',
  ];
  let lastErr = null;
  for (const model of models) {
    try {
      const data = await fetchPost('https://api.groq.com/openai/v1/chat/completions', {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 700,
      }, { Authorization: `Bearer ${config.ai.groqApiKey}` });
      const out = data.choices?.[0]?.message?.content;
      if (out) return out;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Groq sem resposta');
}

async function chatGemini(prompt, context = '') {
  if (!config.ai.geminiApiKey) throw new Error('GEMINI_API_KEY não configurada');
  const system = await getSystemPrompt(context);
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const data = await fetchPost(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.ai.geminiApiKey}`,
        {
          contents: [{ parts: [{ text: `${system}\n\nUsuário: ${prompt}` }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 800 },
        }
      );
      const out = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
      if (out) return out;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Gemini sem resposta');
}

async function chat(prompt, context = '') {
  const errors = [];
  let finalPrompt = prompt;
  try {
    const live = await withTimeout(buildLiveContext(prompt), 6500, 'live context timeout');
    if (live) finalPrompt = `${live}

Pergunta do usuário: ${prompt}`;
  } catch {}
  if (config.ai.groqApiKey) {
    try { return await withTimeout(chatGroq(finalPrompt, context), 18000, 'Groq timeout'); }
    catch (e) { const ne = normalizeAiError(e, 'Groq'); errors.push(ne); console.warn('[IA] Groq falhou:', ne); }
  }
  if (config.ai.geminiApiKey) {
    try { return await withTimeout(chatGemini(finalPrompt, context), 18000, 'Gemini timeout'); }
    catch (e) { const ne = normalizeAiError(e, 'Gemini'); errors.push(ne); console.warn('[IA] Gemini falhou:', ne); }
  }
  try {
    const r = await withTimeout(mediaHandler.fetchJson(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=${encodeURIComponent(config.owner.name)}&botname=${encodeURIComponent(config.bot.name)}`), 7000, 'fallback timeout');
    if (r?.response && !/timed\s*out/i.test(r.response)) return r.response;
    if (r?.response) throw new Error(r.response);
  } catch (e) { errors.push(normalizeAiError(e, 'Fallback')); }
  return `🤖 IA offline no momento. Ajuste as chaves/cotas no Render.\n${errors.slice(0,3).join('\n')}`;
}

async function generateImage(prompt) {
  const urls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&enhance=true`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`,
  ];
  let lastErr = null;
  for (const url of urls) {
    try {
      const buf = await mediaHandler.fetchBuffer(url);
      if (buf && buf.length > 1000) return buf;
    } catch (e) { lastErr = e; }
  }
  throw new Error('Geração de imagem falhou: ' + (lastErr?.message || 'sem resposta'));
}

function fetchPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http');
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = lib.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      port: u.port || (url.startsWith('https') ? 443 : 80),
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
      timeout: 18000,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf-8');
        try {
          if (res.statusCode >= 400) {
            let clean = txt.slice(0, 300);
            try {
              const j = JSON.parse(txt);
              clean = j.error?.message || j.error?.code || clean;
            } catch {}
            return reject(new Error('HTTP ' + res.statusCode + ': ' + clean));
          }
          resolve(JSON.parse(txt));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data); req.end();
  });
}

module.exports = { chat, chatGroq, chatGemini, generateImage };
