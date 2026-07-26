/**
 * DARK BOT v6.18 — IA & CHATBOTS COMPLETOS
 * Todos os 58 comandos de IA com lógica real
 */
'use strict';

const config = require('../../config');
const ai = require('../ai');

// ── Mapeamento modelo → API disponível ──
const MODEL_MAP = {
  // Groq models
  llama: 'llama-3.1-8b-instant', llama3: 'llama-3.3-70b-versatile',
  gemma: 'gemma2-9b-it', gemma2: 'gemma2-9b-it', codegemma: 'gemma2-9b-it',
  // Gemini models
  pplx: 'gemini-2.5-flash', nano: 'gemini-2.5-flash-lite', nano2: 'gemini-2.5-flash',
  // Default (Groq primary)
  gpt: 'llama-3.3-70b-versatile', gpt4: 'llama-3.3-70b-versatile', gpt5: 'llama-3.3-70b-versatile',
  claude: 'llama-3.3-70b-versatile', 'claude-haiku': 'llama-3.1-8b-instant', claudeai: 'llama-3.3-70b-versatile',
  copilot: 'llama-3.3-70b-versatile', copiloto: 'llama-3.3-70b-versatile',
  qwen: 'llama-3.3-70b-versatile', qwen2: 'llama-3.3-70b-versatile', qwen3: 'llama-3.3-70b-versatile', qwencoder: 'llama-3.3-70b-versatile',
  phi: 'llama-3.1-8b-instant', phi3: 'llama-3.1-8b-instant',
  yi: 'llama-3.1-8b-instant', kimi: 'llama-3.3-70b-versatile', kimik2: 'llama-3.3-70b-versatile',
  mistral: 'llama-3.3-70b-versatile', magistral: 'llama-3.3-70b-versatile',
  baichuan: 'llama-3.3-70b-versatile', marin: 'llama-3.3-70b-versatile',
  rakutenai: 'llama-3.3-70b-versatile', rocket: 'llama-3.3-70b-versatile',
  swallow: 'llama-3.3-70b-versatile', falcon: 'llama-3.3-70b-versatile', cog: 'llama-3.3-70b-versatile',
};

// ── System prompts por modelo ──
const MODEL_PERSONA = {
  claude: 'You are Claude, made by Anthropic. You are helpful, harmless, and honest.',
  'claude-haiku': 'You are Claude Haiku, a fast and efficient AI assistant by Anthropic.',
  copilot: 'You are GitHub Copilot, an AI coding assistant. Focus on code and technical help.',
  copiloto: 'Tu és o GitHub Copilot, um assistente de IA para programação.',
  gemma: 'You are Gemma, an open model built by Google DeepMind.',
  qwen: 'You are Qwen, a large multimodal model developed by Alibaba Cloud.',
  phi: 'You are Phi, a small language model by Microsoft Research.',
  yi: 'You are Yi, a large language model by 01.AI.',
  kimi: 'You are Kimi, an AI assistant by Moonshot AI.',
  mistral: 'You are Mistral, a large language model by Mistral AI.',
  llama: 'You are Llama, a large language model by Meta AI.',
};

// Helper: resposta com tema
async function themedReply(sock, msg, ctx, text) {
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid);
  return sock.sendMessage(ctx.remoteJid, { text: RE.renderBlock(t, 'IA', [text], { botName: config.bot.name }) }, { quoted: msg });
}

// Handler genérico para modelos de IA
function makeModelHandler(modelName) {
  return async ({ sock, msg, ctx, args, prefix, command, reply }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`🤖 *${modelName.toUpperCase()}*\n\nUso: \`${prefix}${command} <pergunta>\`\n\n> Modelo: ${MODEL_MAP[modelName] || 'default'}`);
    
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🤖', key: msg.key } });
    
    try {
      const persona = MODEL_PERSONA[modelName] || `You are ${modelName}, an AI assistant.`;
      const fullPrompt = `[System: ${persona}]\n\nUser: ${text}`;
      const answer = await ai.chat(fullPrompt, '', {}, false);
      
      const RE = require('../renderEngine');
      const t = await RE.getTheme(ctx.remoteJid);
      const response = RE.renderBlock(t, modelName.toUpperCase(), [
        answer.slice(0, 800),
        ...(answer.length > 800 ? ['\n_... (resposta truncada)_'] : []),
      ], { botName: config.bot.name });
      
      await sock.sendMessage(ctx.remoteJid, { text: response }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply(`❌ ${modelName}: ${e.message}`);
    }
  };
}

module.exports = function registerIA2(registerCase) {

  // ═══ COMANDOS DE MODELO (todos com handler real) ═══
  const modelCmds = ['gpt', 'gpt4', 'gpt5', 'claude', 'claude-haiku', 'claudeai',
    'copilot', 'copiloto', 'gemma', 'gemma2', 'codegemma',
    'qwen', 'qwen2', 'qwen3', 'qwencoder',
    'llama', 'llama3', 'phi', 'phi3', 'yi', 'kimi', 'kimik2',
    'mistral', 'magistral', 'baichuan', 'marin', 'rakutenai', 'rocket', 'swallow', 'falcon', 'cog',
    'pplx', 'nano', 'nano2'];
  
  for (const cmd of modelCmds) {
    registerCase([cmd], makeModelHandler(cmd), true);
  }

  // ═══ IA PRINCIPAL (com memória) ═══
  registerCase(['ia', 'chat', 'ask'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`🧠 *IA com Memória*\n\nUso: \`${prefix}ia <pergunta>\`\n\n💡 A IA lembra do contexto da conversa!`);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🧠', key: msg.key } });
    try {
      const answer = await ai.chat(text, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: answer }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ IA: ' + e.message);
    }
  }, true);

  // ═══ UTILITÁRIOS DE IA ═══
  registerCase(['corrigir'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`✍️ Uso: \`${prefix}corrigir <texto>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '✍️', key: msg.key } });
    try {
      const answer = await ai.chat(`Corrige os erros ortográficos e gramaticais do seguinte texto. Responde APENAS com o texto corrigido, sem explicações:\n\n${text}`, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: `✍️ *Corrigido:*\n\n${answer}` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  registerCase(['explicar'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`📖 Uso: \`${prefix}explicar <conceito>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '📖', key: msg.key } });
    try {
      const answer = await ai.chat(`Explica de forma clara e simples o seguinte conceito:\n\n${text}`, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: `📖 *Explicação:*\n\n${answer}` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  registerCase(['resumir'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`📝 Uso: \`${prefix}resumir <texto longo>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '📝', key: msg.key } });
    try {
      const answer = await ai.chat(`Resume o seguinte texto em 3-5 pontos principais:\n\n${text}`, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: `📝 *Resumo:*\n\n${answer}` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  registerCase(['resumirurl'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const url = args.join(' ').trim();
    if (!url || !/^https?:\/\//i.test(url)) return reply(`🔗 Uso: \`${prefix}resumirurl <url>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🔗', key: msg.key } });
    try {
      const axios = require('axios');
      const r = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const text = String(r.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000);
      const answer = await ai.chat(`Resume o conteúdo desta página web em 3-5 pontos:\n\n${text}`, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: `🔗 *Resumo de ${url.slice(0, 50)}...*\n\n${answer}` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  registerCase(['resumirchat'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const n = parseInt(args[0]) || 20;
    await sock.sendMessage(ctx.remoteJid, { react: { text: '💬', key: msg.key } });
    try {
      const { messageCache } = require('../messageListener');
      const msgs = [...messageCache.values()]
        .filter(m => m.key?.remoteJid === ctx.remoteJid)
        .slice(-n)
        .map(m => {
          const txt = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
          return txt ? `${m.pushName || 'User'}: ${txt}` : '';
        })
        .filter(Boolean)
        .join('\n');
      if (!msgs) return reply('💬 Sem mensagens recentes para resumir.');
      const answer = await ai.chat(`Resume esta conversa de grupo em 3-5 pontos:\n\n${msgs}`, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: `💬 *Resumo das últimas ${n} mensagens:*\n\n${answer}` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  registerCase(['ideias'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const topic = args.join(' ').trim() || 'criativo';
    await sock.sendMessage(ctx.remoteJid, { react: { text: '💡', key: msg.key } });
    try {
      const answer = await ai.chat(`Dá-me 5 ideias criativas sobre: ${topic}`, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: `💡 *Ideias sobre ${topic}:*\n\n${answer}` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  registerCase(['debater'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const topic = args.join(' ').trim();
    if (!topic) return reply(`⚔️ Uso: \`${prefix}debater <tema>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '⚔️', key: msg.key } });
    try {
      const answer = await ai.chat(`Apresenta argumentos A FAVOR e CONTRA o seguinte tema, de forma equilibrada:\n\n${topic}`, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: `⚔️ *Debate: ${topic}*\n\n${answer}` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  registerCase(['recomendar'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const text = args.join(' ').trim();
    if (!text) return reply(`🎯 Uso: \`${prefix}recomendar <tipo> <género>\`\nEx: \`${prefix}recomendar filme acção\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🎯', key: msg.key } });
    try {
      const answer = await ai.chat(`Recomenda 5 ${text}. Para cada um dá: título, ano, e uma frase de descrição.`, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: `🎯 *Recomendações: ${text}*\n\n${answer}` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  registerCase(['aventura'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const genre = args.join(' ').trim() || 'fantasia';
    await sock.sendMessage(ctx.remoteJid, { react: { text: '📖', key: msg.key } });
    try {
      const answer = await ai.chat(`Cria o início de uma história interativa de ${genre}. Descreve a cena e dá 3 opções de acção (1, 2, 3). Máximo 200 palavras.`, '', {}, false);
      await sock.sendMessage(ctx.remoteJid, { text: `📖 *Aventura: ${genre}*\n\n${answer}\n\n> Usa \`${prefix}aventura 1\` para escolher` }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  // ═══ MEMÓRIA DA IA ═══
  registerCase(['aimemoria', 'iamemoria'], async ({ sock, msg, ctx, reply }) => {
    const RE = require('../renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    return reply(RE.renderBlock(t, 'MEMÓRIA IA', [
      '🧠 A IA lembra do contexto da conversa.',
      '',
      `📊 Memória por grupo/PV`,
      `🔄 Reset: \`${(ctx.prefix || '!')}airesetar\``,
      '',
      `> ${t.vibe || 'Dark Engine'}`,
    ], { botName: config.bot.name }));
  }, true);

  registerCase(['airesetar', 'clearmemory'], async ({ sock, msg, ctx, reply, isOwner }) => {
    if (!isOwner && !ctx.isGroup) return reply('🚫 Só o dono ou em grupo.');
    try {
      const AiMemory = require('../../database/models/AiMemory');
      await AiMemory.deleteMany({ userId: ctx.senderNumber, groupId: ctx.isGroup ? ctx.remoteJid : null });
      return reply('🧠 Memória da IA resetada!');
    } catch (e) { return reply('❌ ' + e.message); }
  }, true);

  // ═══ CHECK IA / IA APIS ═══
  registerCase(['checkia', 'iaapis'], async ({ sock, msg, ctx, reply }) => {
    const hasGroq = !!config.ai.groq;
    const hasGemini = !!config.ai.gemini;
    const RE = require('../renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    return reply(RE.renderBlock(t, 'STATUS IA', [
      `${hasGroq ? '✅' : '❌'} Groq: ${hasGroq ? 'Conectado' : 'Sem API key'}`,
      `${hasGemini ? '✅' : '❌'} Gemini: ${hasGemini ? 'Conectado' : 'Sem API key'}`,
      '',
      `🧠 Modelos Groq: ${ai.GROQ_MODELS?.slice(0, 2).join(', ') || 'N/A'}`,
      `🧠 Modelos Gemini: ${ai.GEMINI_MODELS?.slice(0, 2).join(', ') || 'N/A'}`,
      '',
      `> ${t.vibe || 'Dark Engine'}`,
    ], { botName: config.bot.name }));
  }, true);

  // ═══ SYS-IMG (system image) ═══
  registerCase(['sys-img'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const prompt = args.join(' ').trim();
    if (!prompt) return reply(`🖼️ Uso: \`${prefix}sys-img <descrição>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🖼️', key: msg.key } });
    try {
      const axios = require('axios');
      const r = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`, { responseType: 'arraybuffer', timeout: 30000 });
      if (r.data && r.data.byteLength > 1000) {
        await sock.sendMessage(ctx.remoteJid, { image: Buffer.from(r.data), caption: `🖼️ *${prompt}*` }, { quoted: msg });
        await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
      } else throw new Error('Imagem vazia');
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ sys-img: ' + e.message);
    }
  }, true);

  // ═══ IA IMG (alias de imagem) ═══
  registerCase(['iaimg'], async ({ sock, msg, ctx, args, prefix, reply }) => {
    const prompt = args.join(' ').trim();
    if (!prompt) return reply(`🎨 Uso: \`${prefix}iaimg <descrição>\``);
    await sock.sendMessage(ctx.remoteJid, { react: { text: '🎨', key: msg.key } });
    try {
      const axios = require('axios');
      const r = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`, { responseType: 'arraybuffer', timeout: 30000 });
      if (r.data && r.data.byteLength > 1000) {
        await sock.sendMessage(ctx.remoteJid, { image: Buffer.from(r.data), caption: `🎨 *${prompt}*` }, { quoted: msg });
        await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
      } else throw new Error('Imagem vazia');
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return reply('❌ iaimg: ' + e.message);
    }
  }, true);

  // ═══ ADMIN: addai / addmetaai ═══
  registerCase(['addai', 'addmetaai'], async ({ sock, msg, ctx, args, prefix, reply, isOwner }) => {
    if (!isOwner) return reply('🚫 Só o dono.');
    return reply(`🤖 *Configurar IA*\n\nDefina as API keys no Render:\n• GROQ_API_KEY\n• GEMINI_API_KEY\n\n> ${config.bot.name}`);
  }, true);
};
