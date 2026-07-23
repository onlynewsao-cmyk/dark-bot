/**
 * DARK BOT v5 — Cases de Informação
 * ping, info, dono, criador, id, aiapis, vip
 */
'use strict';

const config        = require('../../config');
const botConfigCache = require('../botConfigCache');
const changeThemes  = require('../changeThemes');

/**
 * Helper: retorna o tema activo
 */
async function getActiveTheme() {
  try {
    const name = await botConfigCache.get('active_theme', 'dark').catch(() => 'dark');
    return changeThemes.getTheme(name || 'dark');
  } catch { return changeThemes.getTheme('dark'); }
}

module.exports = function registerInfoCases(registerCase) {

  // ── case 'ping' ────────────────────────────────────────────
  registerCase(['ping', 'speed', 'lat'], async ({ sock, msg, ctx, reply, react }) => {
    const t0   = Date.now();
    const sent = await reply('⏳ Calculando...');
    const lat  = Date.now() - t0;
    const bar  = lat < 200 ? '🟢 Excelente' : lat < 500 ? '🟡 Boa' : '🔴 Alta';
    const ram  = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const t    = await getActiveTheme();
    const f    = t.frame;
    const H    = f[4], V = f[5];
    const tl   = f[0], tr = f[1], bl = f[2], br = f[3];
    const W    = 24;
    const bar_ = (txt) => `${V} ${String(txt).slice(0, W).padEnd(W)} ${V}`;
    const sep  = bar_(`${t.sep.repeat(Math.min(4, W))}`);

    const txt =
      `${tl}${H.repeat(W + 2)}${tr}\n` +
      `${bar_(`${t.icon}  PONG! — ${config.bot.name}`)}\n` +
      `${bar_(`${t.vibe.slice(0, W)}`)}\n` +
      sep + '\n' +
      `${bar_(`${t.bullet} Latência: ${lat}ms  ${bar}`)}\n` +
      `${bar_(`${t.bullet} RAM: ${ram} MB`)}\n` +
      `${bar_(`${t.bullet} Bot: ${config.bot.name}`)}\n` +
      `${bar_(`${t.bullet} Tema: ${t.name.toUpperCase()}`)}\n` +
      sep + '\n' +
      `${bl}${H.repeat(W + 2)}${br}`;

    try {
      await sock.sendMessage(ctx.remoteJid, { text: txt, edit: sent.key });
    } catch {
      await reply(txt);
    }
  });

  // ── case 'id' / 'jid' ─────────────────────────────────────
  registerCase(['id', 'jid', 'myid'], async ({ ctx, reply }) => {
    const t = await getActiveTheme();
    const f = t.frame;
    const b = t.bullet;
    return reply(
      `${f[0]}${f[4].repeat(20)}${f[1]}\n` +
      `${f[5]} ${t.icon} *SEUS IDs* ${f[5]}\n` +
      `${f[2]}${f[4].repeat(20)}${f[3]}\n\n` +
      `${b} Número: *+${ctx.senderNumber}*\n` +
      `${b} JID: \`${ctx.senderJid}\`\n` +
      `${b} Chat: \`${ctx.remoteJid}\`\n` +
      (ctx.isGroup ? `${b} Grupo: *${ctx.groupName}*` : `${b} Chat Privado`) +
      `\n\n> ${t.vibe}`
    );
  });

  // ── case 'aiapis' ──────────────────────────────────────────
  registerCase(['aiapis', 'iaapis', 'checkia'], async ({ prefix, reply }) => {
    const aiMod     = require('../ai');
    const t         = await getActiveTheme();
    const hasGroq   = !!config.ai.groqApiKey;
    const hasGemini = !!config.ai.geminiApiKey;
    const hasRouter = !!config.ai.openrouterApiKey;
    const anyAI     = hasGroq || hasGemini || hasRouter;

    return reply([
      `${t.icon} *STATUS DAS IAs — ${config.bot.name}*`,
      ``,
      `${hasGroq   ? '✅' : '🛑'} *Groq*       — ${hasGroq   ? 'OK' : 'Falta GROQ_API_KEY'}`,
      `${hasGemini ? '✅' : '🛑'} *Gemini*     — ${hasGemini ? 'OK' : 'Falta GEMINI_API_KEY'}`,
      `${hasRouter ? '✅' : '⬜'} *OpenRouter* — ${hasRouter ? 'OK' : 'Opcional'}`,
      ``,
      `${t.bullet} *Groq models:* ${(aiMod.GROQ_MODELS || []).slice(0, 2).join(' · ')}`,
      `${t.bullet} *Gemini models:* ${(aiMod.GEMINI_MODELS || []).slice(0, 2).join(' · ')}`,
      ``,
      `✅ Notícias RSS — sem key`,
      `✅ Imagens Pollinations — sem key`,
      ``,
      anyAI ? `🟢 IA ACTIVA — *${prefix}ia* <pergunta>` : `🔴 IA INACTIVA — configura GROQ_API_KEY no Render`,
      ``,
      `> ${t.vibe}`,
    ].join('\n'));
  });
};
