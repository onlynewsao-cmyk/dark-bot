/**
 * DARK BOT — IA Engine v5
 * Groq + Gemini + OpenRouter + OpenAI + fallback público
 *
 * Modelos actualizados Julho 2026:
 *  Groq:   llama-3.1-8b-instant (principal, grátis) · llama-3.3-70b-versatile · meta-llama/llama-4-scout-17b-16e-instruct
 *  Gemini: gemini-2.5-flash (principal) · gemini-2.5-flash-lite · gemini-2.0-flash
 *          ⚠️  gemini-1.5-flash removido Jun 2025 · gemini-2.0-flash retirado Jun 2026
 */

'use strict';

const mediaHandler = require('./mediaHandler');
const config       = require('../config');
const botConfigCache = require('./botConfigCache');

// ─────────────────────────────────────────────
// CACHE DE CONTEXTO WEB
// ─────────────────────────────────────────────
const liveContextCache = new Map();
const LIVE_CACHE_TTL   = 10 * 60 * 1000; // 10 min

// ─────────────────────────────────────────────
// MODELOS ACTUALIZADOS (Julho 2026)
// ─────────────────────────────────────────────
const GROQ_MODELS = [
  'llama-3.1-8b-instant',           // principal — rápido e gratuito
  'llama-3.3-70b-versatile',        // mais capaz
  'meta-llama/llama-4-scout-17b-16e-instruct', // llama 4 preview
  'gemma2-9b-it',                   // fallback Google/Groq
  'llama3-8b-8192',                 // legado, ainda activo
];

const GEMINI_MODELS = [
  'gemini-2.5-flash',               // principal actual (Julho 2026)
  'gemini-2.5-flash-lite',          // mais rápido / barato
  'gemini-2.0-flash',               // atenção: retirado Jun 2026 — manter como fallback temporário
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

function shortError(err) {
  const m = String(err?.message || err || '').toLowerCase();
  if (/401|invalid.*key|api.*key.*invalid/i.test(m)) return 'chave inválida';
  if (/429|quota|rate.?limit|exceeded/i.test(m))     return 'cota excedida';
  if (/timeout/i.test(m))                            return 'timeout';
  if (/404|not found/i.test(m))                      return 'modelo removido';
  if (/503|unavailable/i.test(m))                    return 'serviço indisponível';
  return 'erro';
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────
async function getSystemPrompt(context = '', userTone = '', userProfile = null) {
  if (context) return context;

  const globalTone = await botConfigCache.get('ai_global_tone', '').catch(() => '');
  const customBase = await botConfigCache.get('ai_system_prompt', '').catch(() => '');
  const botName    = config.bot.name   || 'DARK BOT';
  const ownerName  = config.owner.name || 'Dark Net';

  let base = customBase ||
    `Você é ${botName}, assistente WhatsApp profissional criado por ${ownerName}. ` +
    `Responda SEMPRE em português. Seja útil, directo e com energia Dark Net Engine 🕸️. ` +
    `Quando receber CONTEXTO WEB/NOTÍCIAS, use-o como base factual.`;

  const toneMap = {
    formal:    'Use linguagem formal e elegante.',
    casual:    'Use linguagem descontraída e amigável.',
    engraçado: 'Seja bem-humorado e use emojis.',
    sério:     'Seja sério, conciso e directo.',
    técnico:   'Use linguagem técnica e precisa.',
    amigável:  'Seja caloroso, empático e motivador.',
    dark:      'Use estilo Dark Side Engine — sombrio, poético e poderoso. 🌑',
  };
  const tone = userTone || globalTone;
  if (tone && toneMap[tone]) base += ' ' + toneMap[tone];

  if (userProfile) {
    if (userProfile.name)              base += ` O utilizador chama-se ${userProfile.name}.`;
    if (userProfile.gender)            base += ` Género: ${userProfile.gender}.`;
    if (userProfile.interests?.length) base += ` Interesses: ${userProfile.interests.slice(0, 5).join(', ')}.`;
    if (userProfile.notes)             base += ` Notas: ${userProfile.notes}`;
  }
  return base;
}

// ─────────────────────────────────────────────
// CONTEXTO WEB (notícias Google News)
// ─────────────────────────────────────────────
function needsLiveContext(prompt = '') {
  return /\b(hoje|agora|atual|atuais|not[ií]cia|noticias|últim|ultimo|recente|tempo real|mundo|angola|luanda|2026|pesquisa|web|internet|preço|cotação|resultado|jogo de hoje)\b/i.test(String(prompt));
}

function cleanNewsText(s = '') {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/<!?\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[]+/g, '')
    .replace(/\s+/g, ' ').trim();
}

async function fetchTextFast(url, ms = 5500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 DarkBot/5.0', Accept: 'application/rss+xml,application/json,*/*' },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

function parseNewsItems(xml, max = 5) {
  return [...String(xml || '').matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/gi)]
    .slice(0, max)
    .map(m => `• ${cleanNewsText(m[1])} (${cleanNewsText(m[2]).slice(0, 20)})`)
    .filter(Boolean);
}

async function getTopNewsContext() {
  const cacheKey = 'top-news-global';
  const cached = liveContextCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < LIVE_CACHE_TTL) return cached.value;

  const feeds = [
    ['Angola',     'https://news.google.com/rss?hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
    ['Mundo',      'https://news.google.com/rss/search?q=mundo+OR+internacional&hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
    ['Tecnologia', 'https://news.google.com/rss/search?q=tecnologia+OR+inteligencia+artificial&hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
    ['Desporto',   'https://news.google.com/rss/search?q=futebol+OR+desporto&hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
  ];
  const parts = [];
  await Promise.all(feeds.map(async ([label, url]) => {
    try {
      const xml = await fetchTextFast(url, 4000);
      const items = parseNewsItems(xml, 3);
      if (items.length) parts.push(`${label}:\n${items.join('\n')}`);
    } catch {}
  }));
  const value = parts.length
    ? `[Notícias actuais — ${new Date().toLocaleDateString('pt-PT', { timeZone: 'Africa/Luanda' })}]\n${parts.join('\n\n')}\n[/Notícias]`
    : '';
  liveContextCache.set(cacheKey, { ts: Date.now(), value });
  return value;
}

async function getGoogleNewsContext(query) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(String(query).slice(0, 120))}&hl=pt-PT&gl=AO&ceid=AO:pt-PT`;
    const xml  = await fetchTextFast(url, 4000);
    const items = parseNewsItems(xml, 6);
    return items.length ? `Notícias sobre "${query}":\n${items.join('\n')}` : '';
  } catch { return ''; }
}

async function getDuckContext(query) {
  try {
    const url  = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const txt  = await fetchTextFast(url, 5000);
    const data = JSON.parse(txt);
    const parts = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    (data.RelatedTopics || []).slice(0, 3).forEach(t => { if (t.Text) parts.push(t.Text); });
    return parts.length ? `Referência: ${parts.join(' | ')}` : '';
  } catch { return ''; }
}

async function buildLiveContext(prompt) {
  if (!needsLiveContext(prompt)) return '';
  const cacheKey = 'live:' + String(prompt).toLowerCase().slice(0, 160);
  const cached = liveContextCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < LIVE_CACHE_TTL) return cached.value;

  const parts = [];
  try { const v = await getTopNewsContext();       if (v) parts.push(v); } catch {}
  try { const v = await getGoogleNewsContext(prompt); if (v) parts.push(v); } catch {}
  try { const v = await getDuckContext(prompt);    if (v) parts.push(v); } catch {}

  if (!parts.length) return '';
  const value = `\n\n${parts.join('\n\n')}\n\n`;
  liveContextCache.set(cacheKey, { ts: Date.now(), value });
  return value;
}

// ─────────────────────────────────────────────
// HTTP POST (nativo, sem axios)
// ─────────────────────────────────────────────
function fetchPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib  = url.startsWith('https') ? require('https') : require('http');
    const data = JSON.stringify(body);
    const u    = new URL(url);
    const req  = lib.request({
      hostname: u.hostname,
      path:     u.pathname + u.search,
      port:     u.port || (url.startsWith('https') ? 443 : 80),
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
      timeout:  20000,
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf-8');
        try {
          if (res.statusCode >= 400) {
            let msg = txt.slice(0, 300);
            try { const j = JSON.parse(txt); msg = j.error?.message || j.error?.code || msg; } catch {}
            return reject(new Error('HTTP ' + res.statusCode + ': ' + msg));
          }
          resolve(JSON.parse(txt));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// ─────────────────────────────────────────────
// GROQ — modelos actualizados Julho 2026
// ─────────────────────────────────────────────
async function chatGroq(prompt, context = '', history = [], userTone = '', userProfile = null) {
  if (!config.ai.groqApiKey) throw new Error('sem chave');
  const system = await getSystemPrompt(context, userTone, userProfile);

  const histMsgs = (history || []).slice(-20).map(h => ({
    role:    h.role === 'assistant' ? 'assistant' : 'user',
    content: String(h.content || '').slice(0, 800),
  }));

  let lastErr;
  for (const model of GROQ_MODELS) {
    try {
      const data = await fetchPost(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: system },
            ...histMsgs,
            { role: 'user', content: prompt },
          ],
          temperature:  0.7,
          max_tokens:   900,
          stream:       false,
        },
        { Authorization: `Bearer ${config.ai.groqApiKey}` }
      );
      const out = data.choices?.[0]?.message?.content;
      if (out) return out;
    } catch (e) {
      lastErr = e;
      // Não tenta modelo seguinte se for erro de autenticação
      if (/401|invalid.*key/i.test(e.message)) break;
    }
  }
  throw lastErr || new Error('sem resposta');
}

// ─────────────────────────────────────────────
// GEMINI — modelos actualizados Julho 2026
// ─────────────────────────────────────────────
async function chatGemini(prompt, context = '', history = [], userTone = '', userProfile = null) {
  if (!config.ai.geminiApiKey) throw new Error('sem chave');
  const system = await getSystemPrompt(context, userTone, userProfile);

  // Gemini usa role alternado user/model
  const contents = [];
  for (const h of (history || []).slice(-16)) {
    contents.push({
      role:  h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(h.content || '').slice(0, 800) }],
    });
  }
  // System prompt vai na primeira mensagem do utilizador
  contents.push({ role: 'user', parts: [{ text: `${system}\n\nUtilizador: ${prompt}` }] });

  const genCfg = { temperature: 0.8, maxOutputTokens: 900 };

  let lastErr;
  for (const model of GEMINI_MODELS) {
    try {
      const url  = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.ai.geminiApiKey}`;
      const data = await fetchPost(url, { contents, generationConfig: genCfg });
      const out  = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
      if (out) return out;
    } catch (e) {
      lastErr = e;
      // 401 → não adianta tentar mais modelos
      if (/401|invalid.*key/i.test(e.message)) break;
      // 404 → modelo removido, tenta o próximo
      // 429 → cota, tenta modelo diferente
    }
  }
  throw lastErr || new Error('sem resposta');
}

// ─────────────────────────────────────────────
// OPENROUTER / OPENAI
// ─────────────────────────────────────────────
async function chatOpenAICompatible(prompt, context = '', provider = 'OpenAI') {
  const isRouter = provider === 'OpenRouter';
  const key = isRouter ? config.ai.openrouterApiKey : config.ai.openaiApiKey;
  if (!key) throw new Error('sem chave');
  const system = await getSystemPrompt(context);
  const url    = isRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const model  = config.ai.model || (isRouter ? 'meta-llama/llama-3.1-8b-instruct:free' : 'gpt-4o-mini');
  const data   = await fetchPost(url, {
    model,
    messages:    [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens:  900,
  }, {
    Authorization: `Bearer ${key}`,
    ...(isRouter ? { 'HTTP-Referer': config.appUrl || 'https://render.com', 'X-Title': config.bot.name || 'DARK BOT' } : {}),
  });
  const out = data.choices?.[0]?.message?.content;
  if (!out) throw new Error('sem resposta');
  return out;
}

// ─────────────────────────────────────────────
// CHAT PRINCIPAL — cascata com mensagens curtas
// ─────────────────────────────────────────────
async function chat(prompt, context = '', memoryOpts = {}) {
  const { history = [], userTone = '', userProfile = null } = memoryOpts;

  const hasAny = !!(
    config.ai.groqApiKey || config.ai.geminiApiKey ||
    config.ai.openrouterApiKey || config.ai.openaiApiKey
  );
  if (!hasAny) return '❌ IA sem chave. Configure GROQ_API_KEY no Render.';

  // Contexto web (não bloqueia se demorar)
  let finalPrompt = prompt;
  try {
    const live = await withTimeout(buildLiveContext(prompt), 6000);
    if (live) finalPrompt = live + 'Pergunta: ' + prompt;
  } catch {}

  // 1. Groq
  if (config.ai.groqApiKey) {
    try {
      return await withTimeout(
        chatGroq(finalPrompt, context, history, userTone, userProfile),
        22000
      );
    } catch (e) {
      console.warn('[IA] Groq:', shortError(e));
    }
  }

  // 2. Gemini
  if (config.ai.geminiApiKey) {
    try {
      return await withTimeout(
        chatGemini(finalPrompt, context, history, userTone, userProfile),
        22000
      );
    } catch (e) {
      console.warn('[IA] Gemini:', shortError(e));
    }
  }

  // 3. OpenRouter
  if (config.ai.openrouterApiKey) {
    try {
      return await withTimeout(chatOpenAICompatible(finalPrompt, context, 'OpenRouter'), 22000);
    } catch (e) {
      console.warn('[IA] OpenRouter:', shortError(e));
    }
  }

  // 4. OpenAI
  if (config.ai.openaiApiKey) {
    try {
      return await withTimeout(chatOpenAICompatible(finalPrompt, context, 'OpenAI'), 22000);
    } catch (e) {
      console.warn('[IA] OpenAI:', shortError(e));
    }
  }

  // 5. Fallback público (sem key)
  try {
    const r = await withTimeout(
      mediaHandler.fetchJson(
        `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=${encodeURIComponent(config.owner.name)}&botname=${encodeURIComponent(config.bot.name)}`
      ),
      7000
    );
    if (r?.response && !/timed\s*out/i.test(r.response)) return r.response;
  } catch {}

  // Mensagem de erro CURTA
  return '❌ IA offline agora. Tente de novo.';
}

// ─────────────────────────────────────────────
// NOTÍCIAS E WEB
// ─────────────────────────────────────────────
async function getPrettyNewsDigest(topic = '') {
  const now    = new Date().toLocaleString('pt-PT', { timeZone: 'Africa/Luanda' });
  const q      = String(topic || '').trim();
  const feeds  = q
    ? [[`${q}`, `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-PT&gl=AO&ceid=AO:pt-PT`]]
    : [
        ['Angola',     'https://news.google.com/rss?hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
        ['Mundo',      'https://news.google.com/rss/search?q=mundo+OR+internacional&hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
        ['Tecnologia', 'https://news.google.com/rss/search?q=tecnologia+OR+IA&hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
        ['Economia',   'https://news.google.com/rss/search?q=economia+OR+petroleo&hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
        ['Desporto',   'https://news.google.com/rss/search?q=futebol+OR+desporto&hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
      ];
  const blocks = [];
  for (const [label, url] of feeds) {
    try {
      const xml   = await fetchTextFast(url, 4000);
      const items = parseNewsItems(xml, q ? 8 : 4);
      if (items.length) blocks.push(`*${label}*\n${items.join('\n')}`);
    } catch {}
  }
  return (
    `📰 *DARK NEWS*  🕒 ${now}\n\n` +
    (blocks.join('\n\n') || 'Sem notícias disponíveis agora.') +
    '\n\n_via Google News RSS_'
  );
}

async function getWebDigest(query = '') {
  const parts = [];
  try { const n = await getGoogleNewsContext(query); if (n) parts.push(n); } catch {}
  try { const d = await getDuckContext(query);        if (d) parts.push(d); } catch {}
  return parts.length
    ? `🔎 *DARK SEARCH* — ${query}\n\n${parts.join('\n\n')}`
    : `❌ Sem resultados para: ${query}`;
}

// ─────────────────────────────────────────────
// GERAÇÃO DE IMAGEM
// ─────────────────────────────────────────────
async function generateImage(prompt) {
  const urls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&enhance=true`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`,
  ];
  for (const url of urls) {
    try {
      const buf = await mediaHandler.fetchBuffer(url);
      if (buf && buf.length > 1000) return buf;
    } catch {}
  }
  throw new Error('Geração de imagem falhou.');
}

module.exports = {
  chat,
  chatGroq,
  chatGemini,
  chatOpenAICompatible,
  generateImage,
  buildLiveContext,
  getTopNewsContext,
  getPrettyNewsDigest,
  getWebDigest,
  getSystemPrompt,
  GROQ_MODELS,
  GEMINI_MODELS,
};
