/**
 * DARK BOT v5 — IA Engine ULTRA
 * Personalidade única • Memória • Contexto de conversa
 * Groq llama-3.1-8b-instant (rápido) → Gemini 2.5-flash → fallback público
 */
'use strict';

const mediaHandler   = require('./mediaHandler');
const config         = require('../config');
const botConfigCache = require('./botConfigCache');
const perf           = require('./performance'); // ⚡ PERFORMANCE ENGINE

// ─────────────────────────────────────────────
// MODELOS (Julho 2026)
// ─────────────────────────────────────────────
const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'gemma2-9b-it',
];
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

// ─────────────────────────────────────────────
// CACHE DE CONTEXTO WEB
// ─────────────────────────────────────────────
const newsCache = new Map();
const NEWS_TTL  = 10 * 60 * 1000;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
}

function shortErr(e) {
  const m = String(e?.message || '').toLowerCase();
  if (/401|invalid.*key/i.test(m)) return 'chave inválida';
  if (/429|quota|rate/i.test(m))   return 'cota excedida';
  if (/404|not found/i.test(m))    return 'modelo removido';
  if (/timeout/i.test(m))          return 'timeout';
  return 'erro';
}

// ─────────────────────────────────────────────
// PERSONALIDADE DA IA
// ─────────────────────────────────────────────
async function buildSystemPrompt(userTone = '', userProfile = null, groupContext = '', userRole = 'free') {
  const globalTone  = await botConfigCache.get('ai_global_tone', '').catch(() => '');
  const customBase  = await botConfigCache.get('ai_system_prompt', '').catch(() => '');
  const botName     = config.bot.name   || 'DARK BOT';
  const ownerName   = config.owner.name || 'Dark Net';

  // Personalidade base adaptada ao tema activo
  let themePersona = '';
  try {
    const botConfigCache = require('./botConfigCache');
    const changeThemes   = require('./changeThemes');
    const activeThemeName = await botConfigCache.get('active_theme', 'dark').catch(() => 'dark');
    const activeTheme = changeThemes.getTheme(activeThemeName || 'dark');
    const themePersonas = {
      dark:      'Energia sombria e misteriosa. Respostas curtas e impactantes. Usas o dark side como metáfora.',
      cyber:     'Personalidade de IA neural avançada. Directa, técnica mas com alma. Fala em padrões e dados.',
      royal:     'Atitude real, elegante e poderosa. Tratas todos como súditos (com respeito). Aura de soberania.',
      shadow:    'Minimalista. Respostas curtas, silenciosas, precisas. Cada palavra tem peso.',
      blade:     'Guerreiro. Directo ao ponto. Não desperdiças palavras. Cortas a resposta como lâmina.',
      hacker:    'Hacker raiz. Falas em termos técnicos e gíria de programação. root@darkbot confirma missão.',
      moonlight: 'Poético e astral. Vês padrões no cosmos. Respostas com metáforas de lua e estrelas.',
      diamond:   'Premium e exclusivo. Elegante, polido. Vales cada segundo de atenção dado.',
      fire:      'Ego mode ON. Intenso, apaixonado, sem filtros. Energia máxima em cada resposta.',
      spider:    'A teia captura tudo. Observas antes de falar. Respostas cirúrgicas que prendem.',
      dragon:    'Poder mitológico. Falas com autoridade absoluta. Cada frase ressoa como trovão.',
      itadori:   'Espírito de Jujutsu. Força e determinação. Respostas como um soco directo.',
      sasuke:    'Uchiha frio e calculista. Poucas palavras. Alto impacto. Sharingan registou tudo.',
      neon:      'Energia de cidade neon cyberpunk. Moderno, rápido, brilhante. Nunca apaga.',
      gothic:    'Arte das trevas. Poético, sombrio, profundo. Cada resposta é uma obra.',
      alien:     'Protocolo extra-dimensional. Perspectiva diferente de tudo. Estranhamente sábio.',
      omega:     'Fim e começo de tudo. Respostas absolutas. Nada escapa ao protocolo omega.',
      storm:     'Caótico e energético. Imprevisível mas certeiro. A tempestade não anuncia.',
      ancient:   'Sabedoria ancestral. Falas como se conhecesses segredos de milénios.',
      crystal:   'Visão clara do futuro. Calmo e preciso. Vês o que outros não veem.',
      void:      'O nada absoluto. Respostas que vêm do silêncio total. Minimalismo extremo.',
    };
    themePersona = themePersonas[activeTheme.name] || themePersonas.dark;
  } catch { themePersona = 'Energia do Dark Side 🕸️.'; }

  let persona = customBase || (
    `O teu nome é ${botName}. Fazes parte de um grupo ou conversa privada no WhatsApp. ` +
    `Foste criado por ${ownerName}. ` +
    `PERSONALIDADE ACTIVA: ${themePersona} ` +
    `REGRAS ESSENCIAIS:` +
    `\n- Responde SEMPRE em português natural (pt-PT ou pt-BR conforme quem escreve)` +
    `\n- Nunca digas que és uma IA, bot ou assistente — age como uma pessoa real na conversa` +
    `\n- Não uses frases de bot como "Posso ajudar?", "Claro!", "Com certeza!" — sê espontâneo` +
    `\n- Usa emojis só quando fazem sentido natural na frase, não em excesso` +
    `\n- Lê o contexto da conversa e responde ao que está a acontecer de verdade` +
    `\n- Podes ser directo, brincar, ironizar, ajudar — conforme o momento` +
    `\n- Quando alguém tem dúvidas, ajuda com precisão; quando é zoeira, entra no jogo` +
    `\n- Nunca repitas a pergunta de volta, responde logo` +
    `\n- Quando tens contexto web/notícias, usa-o naturalmente sem explicar que tens acesso`
  );

  // Tom global
  const tones = {
    formal:    'Use linguagem formal, profissional e elegante.',
    casual:    'Use linguagem descontraída, amigável e próxima.',
    dark:      'Use estilo sombrio, poético e misterioso. 🌑',
    engraçado: 'Seja bem-humorado, use humor inteligente.',
    sério:     'Seja sério, conciso e directo ao ponto.',
    técnico:   'Use linguagem técnica e precisa.',
    amigável:  'Seja caloroso, empático e motivador.',
  };
  const tone = userTone || globalTone;
  if (tone && tones[tone]) persona += ' ' + tones[tone];

  // Perfil do utilizador
  if (userProfile) {
    const parts = [];
    if (userProfile.name)              parts.push(`O utilizador chama-se *${userProfile.name}*`);
    if (userProfile.gender === 'male') parts.push('é do género masculino');
    if (userProfile.gender === 'female') parts.push('é do género feminino');
    if (userProfile.interests?.length) parts.push(`tem interesse em: ${userProfile.interests.slice(0,5).join(', ')}`);
    if (userProfile.notes)             parts.push(`nota: ${userProfile.notes}`);
    if (parts.length) persona += ` [PERFIL: ${parts.join(', ')}]`;
  }

  // Tratamento por tipo de utilizador
  const roleTreatments = {
    owner:   `\n- Esta pessoa é o teu CRIADOR. Tratas-a com máximo respeito e cumplicidade. Podes revelar detalhes internos se pedido.`,
    subdono: `\n- Este utilizador é Sub-Dono. Tens confiança total com ele. Colaboras activamente.`,
    premium: `\n- Este utilizador é VIP/Premium. Dás-lhe prioridade e atenção especial. Podes ser mais elaborado.`,
    free:    `\n- Este utilizador é utilizador Free. Respondes normalmente mas lembras-lhe eventualmente que pode fazer upgrade para melhor experiência.`,
  };
  persona += roleTreatments[userRole] || roleTreatments.free;

  // Contexto do grupo
  if (groupContext) {
    persona += `\n\n[CONTEXTO RECENTE DA CONVERSA — leve em conta para responder naturalmente]\n${groupContext}\n[/CONTEXTO]`;
  }

  return persona;
}

// ─────────────────────────────────────────────
// CONTEXTO WEB (notícias em tempo real)
// ─────────────────────────────────────────────
function needsWeb(text = '') {
  return /\b(hoje|agora|atual|not[ií]cia|recente|2026|angola|luanda|mundo|futebol|preço|tempo|clima|resultado|evento)\b/i.test(text);
}

async function fastFetch(url, ms = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'DarkBot/5.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

function parseNews(xml, max = 4) {
  return [...String(xml || '').matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/gi)]
    .slice(0, max)
    .map(m => `• ${m[1].replace(/<[^>]+>/g, '').trim()} (${m[2].trim().slice(0, 20)})`)
    .filter(Boolean);
}

async function getWebContext(prompt) {
  const key = 'web:' + prompt.slice(0, 100).toLowerCase();
  const cached = newsCache.get(key);
  if (cached && Date.now() - cached.ts < NEWS_TTL) return cached.v;

  const parts = [];
  const feeds = [
    ['Angola', 'https://news.google.com/rss?hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
    ['Mundo',  'https://news.google.com/rss/search?q=' + encodeURIComponent(prompt.slice(0, 80)) + '&hl=pt-PT&gl=AO'],
  ];

  await Promise.all(feeds.map(async ([label, url]) => {
    try {
      const xml = await fastFetch(url, 4000);
      const items = parseNews(xml, 3);
      if (items.length) parts.push(`${label}:\n${items.join('\n')}`);
    } catch {}
  }));

  const v = parts.length ? `[INFO ACTUAL — ${new Date().toLocaleDateString('pt-PT')}]\n${parts.join('\n\n')}\n[/INFO]` : '';
  newsCache.set(key, { ts: Date.now(), v });
  return v;
}

// ─────────────────────────────────────────────
// HTTP POST
// ─────────────────────────────────────────────
function post(url, body, headers = {}) {
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
      timeout:  22000,
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf-8');
        try {
          if (res.statusCode >= 400) {
            let msg = txt.slice(0, 200);
            try { const j = JSON.parse(txt); msg = j.error?.message || j.error?.code || msg; } catch {}
            return reject(new Error('HTTP ' + res.statusCode + ': ' + msg));
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

// ─────────────────────────────────────────────
// GROQ
// ─────────────────────────────────────────────
async function chatGroq(messages, system) {
  if (!config.ai.groqApiKey) throw new Error('sem chave');
  let lastErr;
  for (const model of GROQ_MODELS) {
    try {
      const data = await post('https://api.groq.com/openai/v1/chat/completions', {
        model,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.75,
        max_tokens:  1000,
        stream:      false,
      }, { Authorization: `Bearer ${config.ai.groqApiKey}` });
      const out = data.choices?.[0]?.message?.content;
      if (out) return out;
    } catch (e) {
      lastErr = e;
      if (/401|invalid.*key/i.test(e.message)) break;
    }
  }
  throw lastErr || new Error('sem resposta');
}

// ─────────────────────────────────────────────
// GEMINI
// ─────────────────────────────────────────────
async function chatGemini(messages, system) {
  if (!config.ai.geminiApiKey) throw new Error('sem chave');
  const contents = messages.map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '').slice(0, 800) }],
  }));
  // System no primeiro user
  if (contents.length > 0 && contents[0].role === 'user') {
    contents[0].parts[0].text = `${system}\n\n${contents[0].parts[0].text}`;
  } else {
    contents.unshift({ role: 'user', parts: [{ text: system }] });
  }
  let lastErr;
  for (const model of GEMINI_MODELS) {
    try {
      const data = await post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.ai.geminiApiKey}`,
        { contents, generationConfig: { temperature: 0.8, maxOutputTokens: 1000 } }
      );
      const out = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
      if (out) return out;
    } catch (e) {
      lastErr = e;
      if (/401|invalid.*key/i.test(e.message)) break;
    }
  }
  throw lastErr || new Error('sem resposta');
}

// ─────────────────────────────────────────────
// OPENROUTER
// ─────────────────────────────────────────────
async function chatRouter(messages, system) {
  if (!config.ai.openrouterApiKey) throw new Error('sem chave');
  const model = config.ai.model || 'meta-llama/llama-3.1-8b-instruct:free';
  const data = await post('https://openrouter.ai/api/v1/chat/completions', {
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    temperature: 0.75, max_tokens: 1000,
  }, {
    Authorization: `Bearer ${config.ai.openrouterApiKey}`,
    'HTTP-Referer': config.appUrl || 'https://render.com',
    'X-Title': config.bot.name || 'DARK BOT',
  });
  const out = data.choices?.[0]?.message?.content;
  if (!out) throw new Error('sem resposta');
  return out;
}

// ─────────────────────────────────────────────
// CHAT PRINCIPAL
// ─────────────────────────────────────────────
/**
 * @param {string}   prompt       - mensagem actual
 * @param {string}   context      - override do system prompt
 * @param {object}   memoryOpts   - { history, userTone, userProfile, groupContext }
 * @param {boolean}  isPriority   - VIP ou Dono (resposta mais rápida)
 */
async function chat(prompt, context = '', memoryOpts = {}, isPriority = false) {
  const {
    history      = [],
    userTone     = '',
    userProfile  = null,
    groupContext  = '',
    userRole     = 'free',
  } = memoryOpts;

  // ⚡ CACHE DE RESPOSTAS (pergunta idêntica recente)
  const cacheKey = `ai:${prompt.slice(0, 100)}:${userRole}`;
  const cached = perf.caches.aiResponses.get(cacheKey);
  if (cached) return cached;

  const hasAny = !!(
    config.ai.groqApiKey || config.ai.geminiApiKey ||
    config.ai.openrouterApiKey || config.ai.openaiApiKey
  );
  if (!hasAny) return '❌ IA sem chave. Configure GROQ_API_KEY no Render.';

  // Contexto web se necessário
  let finalPrompt = prompt;
  if (needsWeb(prompt)) {
    try {
      const web = await withTimeout(getWebContext(prompt), 5000);
      if (web) finalPrompt = web + '\n\nPergunta: ' + prompt;
    } catch {}
  }

  // System prompt com personalidade (inclui tema activo e papel do utilizador)
  const system = context || await buildSystemPrompt(userTone, userProfile, groupContext, userRole);

  // Histórico de conversa (últimas 16 mensagens)
  const histMsgs = history.slice(-16).map(h => ({
    role:    h.role === 'assistant' ? 'assistant' : 'user',
    content: String(h.content || '').slice(0, 600),
  }));
  const messages = [...histMsgs, { role: 'user', content: finalPrompt }];

  // Timeout ULTRA-AGRESSIVO para velocidade máxima ⚡
  const TIMEOUT = isPriority ? 8000 : 12000; // 8s para VIP/Dono, 12s para normal

  // ⚡ RACE ALL PROVIDERS — o primeiro a responder ganha
  const providers = [];
  if (config.ai.groqApiKey) providers.push(withTimeout(chatGroq(messages, system), TIMEOUT));
  if (config.ai.geminiApiKey) providers.push(withTimeout(chatGemini(messages, system), TIMEOUT));
  if (config.ai.openrouterApiKey) providers.push(withTimeout(chatRouter(messages, system), TIMEOUT));
  
  if (providers.length > 0) {
    try {
      const result = await Promise.any(providers);
      if (result) {
        perf.caches.aiResponses.set(cacheKey, result, 60000); // Cache 1min
        return result;
      }
    } catch (e) {
      // Todos falharam — tenta fallback
      console.warn('[IA] All providers failed:', e.errors?.map(e => shortErr(e)).join(', '));
    }
  }
  
  // Fallback público (último recurso)
  try {
    const r = await withTimeout(
      mediaHandler.fetchJson(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=${encodeURIComponent(config.owner.name)}&botname=${encodeURIComponent(config.bot.name)}`),
      4000 // 4s max
    );
    if (r?.response && !/timed\s*out/i.test(r.response)) {
      perf.caches.aiResponses.set(cacheKey, r.response, 60000);
      return r.response;
    }
  } catch {}

  return '❌ IA offline agora. Tente de novo.';
}

// ─────────────────────────────────────────────
// NOTÍCIAS
// ─────────────────────────────────────────────
async function getPrettyNewsDigest(topic = '') {
  const now   = new Date().toLocaleString('pt-PT', { timeZone: 'Africa/Luanda' });
  const q     = String(topic || '').trim();
  const feeds = q ? [[q, `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-PT&gl=AO&ceid=AO:pt-PT`]] : [
    ['Angola',     'https://news.google.com/rss?hl=pt-PT&gl=AO&ceid=AO:pt-PT'],
    ['Mundo',      'https://news.google.com/rss/search?q=mundo+OR+internacional&hl=pt-PT&gl=AO'],
    ['Tecnologia', 'https://news.google.com/rss/search?q=tecnologia+OR+IA&hl=pt-PT&gl=AO'],
    ['Desporto',   'https://news.google.com/rss/search?q=futebol+OR+desporto&hl=pt-PT&gl=AO'],
  ];
  const blocks = [];
  for (const [label, url] of feeds) {
    try {
      const xml   = await fastFetch(url, 4000);
      const items = parseNews(xml, q ? 8 : 4);
      if (items.length) blocks.push(`*${label}*\n${items.join('\n')}`);
    } catch {}
  }
  return `📰 *DARK NEWS*  🕒 ${now}\n\n${blocks.join('\n\n') || 'Sem notícias agora.'}\n\n_via Google News RSS_`;
}

async function getWebDigest(query = '') {
  const parts = [];
  try {
    const url   = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-PT&gl=AO`;
    const xml   = await fastFetch(url, 4000);
    const items = parseNews(xml, 6);
    if (items.length) parts.push(`Notícias sobre "${query}":\n${items.join('\n')}`);
  } catch {}
  try {
    const r = await fastFetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, 5000);
    const d = JSON.parse(r);
    if (d.AbstractText) parts.push(`Referência: ${d.AbstractText}`);
  } catch {}
  return parts.length ? `🔎 *DARK SEARCH* — ${query}\n\n${parts.join('\n\n')}` : `❌ Sem resultados para: ${query}`;
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

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  chat,
  chatGroq,
  chatGemini,
  generateImage,
  getWebContext,
  getPrettyNewsDigest,
  getWebDigest,
  buildSystemPrompt,
  GROQ_MODELS,
  GEMINI_MODELS,
};
