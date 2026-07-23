/**
 * DARK BOT v5 — Cases de Informação
 * ping, info, dono, criador, id, aiapis, vip
 */
'use strict';

const config = require('../../config');

module.exports = function registerInfoCases(registerCase) {

  // case 'ping'
  registerCase(['ping', 'speed', 'lat'], async ({ sock, msg, ctx, reply, react }) => {
    const t0   = Date.now();
    const sent = await reply('🏓 Calculando...');
    const lat  = Date.now() - t0;
    const bar  = lat < 200 ? '🟢 Excelente' : lat < 500 ? '🟡 Boa' : '🔴 Alta';
    const ram  = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    const txt =
      `╭━━━〔 🏓 PONG! 〕━━━╮\n` +
      `┃ ⚡ Latência: *${lat}ms* ${bar}\n` +
      `┃ 💾 RAM: *${ram} MB*\n` +
      `┃ 🤖 Bot: *${config.bot.name}*\n` +
      `┃ 🔑 Prefixo: *${config.bot.prefix}*\n` +
      `╰━━━━━━━━━━━━━━━━━━━╯`;

    try {
      await sock.sendMessage(ctx.remoteJid, { text: txt, edit: sent.key });
    } catch {
      await reply(txt);
    }
  });

  // case 'id' / 'jid'
  registerCase(['id', 'jid', 'myid'], async ({ ctx, reply }) => {
    return reply(
      `🆔 *SEUS IDs*\n\n` +
      `👤 Número: *+${ctx.senderNumber}*\n` +
      `📱 JID: \`${ctx.senderJid}\`\n` +
      `💬 Chat: \`${ctx.remoteJid}\`\n` +
      (ctx.isGroup ? `👥 Grupo: *${ctx.groupName}*` : '📱 Chat Privado')
    );
  });

  // case 'aiapis'
  registerCase(['aiapis', 'iaapis', 'checkia'], async ({ prefix, reply }) => {
    const aiMod = require('../ai');
    const hasGroq   = !!config.ai.groqApiKey;
    const hasGemini = !!config.ai.geminiApiKey;
    const hasRouter = !!config.ai.openrouterApiKey;
    const anyAI     = hasGroq || hasGemini || hasRouter;

    return reply([
      `🧠 *STATUS DAS IAs — ${config.bot.name}*`,
      ``,
      `${hasGroq   ? '✅' : '🛑'} *Groq*       — ${hasGroq   ? 'OK' : 'Falta GROQ_API_KEY'}`,
      `${hasGemini ? '✅' : '🛑'} *Gemini*     — ${hasGemini ? 'OK' : 'Falta GEMINI_API_KEY'}`,
      `${hasRouter ? '✅' : '⬜'} *OpenRouter* — ${hasRouter ? 'OK' : 'Opcional'}`,
      ``,
      `📋 *Modelos Groq:* ${(aiMod.GROQ_MODELS || []).slice(0, 2).join(' · ')}`,
      `📋 *Modelos Gemini:* ${(aiMod.GEMINI_MODELS || []).slice(0, 2).join(' · ')}`,
      ``,
      `✅ Notícias RSS — sem key`,
      `✅ Imagens Pollinations — sem key`,
      ``,
      anyAI ? `🟢 IA ACTIVA — *${prefix}ia* <pergunta>` : `🔴 IA INACTIVA — configura GROQ_API_KEY no Render`,
    ].join('\n'));
  });
};
