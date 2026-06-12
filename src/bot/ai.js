/**
 * IA robusta — Groq + Gemini + fallback público
 * Dark Net Engine 🕸️
 */
const mediaHandler = require('./mediaHandler');
const config = require('../config');
const botConfigCache = require('./botConfigCache');

async function getSystemPrompt(context = '') {
  if (context) return context;
  const custom = await botConfigCache.get('ai_system_prompt', '').catch(() => '');
  return custom || `Você é ${config.bot.name}, assistente WhatsApp criado por ${config.owner.name}. Responda em português de forma útil, objetiva, respeitosa e com energia Dark Net Engine 🕸️.`;
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
  if (config.ai.groqApiKey) {
    try { return await chatGroq(prompt, context); }
    catch (e) { errors.push('Groq: ' + e.message); console.warn('[IA] Groq falhou:', e.message); }
  }
  if (config.ai.geminiApiKey) {
    try { return await chatGemini(prompt, context); }
    catch (e) { errors.push('Gemini: ' + e.message); console.warn('[IA] Gemini falhou:', e.message); }
  }
  try {
    const r = await mediaHandler.fetchJson(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}&owner=${encodeURIComponent(config.owner.name)}&botname=${encodeURIComponent(config.bot.name)}`);
    if (r?.response) return r.response;
  } catch (e) { errors.push('Pública: ' + e.message); }
  return `🤖 IA temporariamente indisponível. Verifique GROQ_API_KEY/GEMINI_API_KEY no Render.\n${errors.slice(0,2).join('\n')}`;
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
      timeout: 45000,
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf-8');
        try {
          if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode + ': ' + txt.slice(0, 600)));
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
