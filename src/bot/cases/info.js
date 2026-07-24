/**
 * DARK BOT v5 — Cases de Informação
 * ping, info, dono, criador, id, aiapis, vip
 */
'use strict';

const config        = require('../../config');
const botConfigCache = require('../botConfigCache');
const changeThemes  = require('../changeThemes');

/**
 * Helper: retorna o tema activo (por grupo ou global)
 * v5.3: usa themeResolver para "camuflagem 100%" por grupo
 */
const themeResolver = require('../themeResolver');
async function getActiveTheme(groupJid = null) {
  try { return await themeResolver.getThemeForContext(groupJid); }
  catch { return changeThemes.getTheme('dark'); }
}

module.exports = function registerInfoCases(registerCase) {

  // ── case 'ping' ────────────────────────────────────────────
  registerCase(['ping', 'speed', 'lat'], async ({ sock, msg, ctx, reply, react }) => {
    const t0   = Date.now();
    const sent = await reply('⏳ Calculando...');
    const lat  = Date.now() - t0;
    const bar  = lat < 200 ? '🟢 Excelente' : lat < 500 ? '🟡 Boa' : '🔴 Alta';
    const ram  = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const t    = await getActiveTheme(ctx.remoteJid);
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
    const t = await getActiveTheme(ctx.remoteJid);
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

  // ── case 'perfil' ──────────────────────────────────────────
  registerCase(['perfil', 'perfiluser', 'rankuser'], async ({ sock, ctx, reply, prefix }) => {
    const t = await getActiveTheme(ctx.remoteJid);
    const f = t.frame;
    const b = t.bullet;
    const W = 26;
    const bar = (txt) => `${f[5]} ${String(txt).slice(0, W).padEnd(W)} ${f[5]}`;

    let cargo = '🆓 FREE';
    let vipTxt = 'INATIVO ❌';
    let cmds = 0;
    let desde = '—';
    let genero = 'não definido';

    try {
      const User = require('../../database/models/User');
      const u = await User.findOne({ whatsappNumber: ctx.senderNumber });
      if (u) {
        const isVip = u.isPremium ? u.isPremium() : (u.role === 'premium');
        cmds  = u.commandsUsed || 0;
        desde = u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—';
        genero = { male: '♂ Masculino', female: '♀ Feminino', other: '⚧ Outro' }[u.gender] || 'não definido';
        if (ctx.isOwner)      { cargo = '👑 DONO SUPREMO'; vipTxt = 'ATIVO ✅'; }
        else if (isVip)       { cargo = '💎 VIP';          vipTxt = u.premiumUntil ? `ATIVO ✅ até ${new Date(u.premiumUntil).toLocaleDateString('pt-BR')}` : 'ATIVO ✅'; }
        else                  { cargo = '🆓 FREE';         vipTxt = 'INATIVO ❌'; }
      }
      if (!ctx.isOwner && cargo === '🆓 FREE') {
        // verifica se é admin do grupo
        try {
          const meta = ctx.groupMeta || (ctx.isGroup ? await sock.groupMetadata(ctx.remoteJid) : null);
          const snum = ctx.senderNumber;
          const isAdm = meta?.participants?.some(p =>
            p.id.split('@')[0].replace(/\D/g, '') === snum && (p.admin === 'admin' || p.admin === 'superadmin'));
          if (isAdm) cargo = '🛡️ ADMIN';
        } catch {}
      }
    } catch {}

    const txt =
      `${f[0]}${f[4].repeat(W + 2)}${f[1]}\n` +
      bar(`${t.icon} ᴘᴇʀғɪʟ ᴅᴇ ᴜsᴜáʀɪᴏ`) + '\n' +
      bar(t.vibe.slice(0, W)) + '\n' +
      `${f[2]}${f[4].repeat(W + 2)}${f[3]}\n\n` +
      `${b} 👤 Nome: *${ctx.pushName || 'Desconhecido'}*\n` +
      `${b} 📱 Número: *+${ctx.senderNumber}*\n` +
      `${b} 🎭 Cargo: *${cargo}*\n` +
      `${b} ⭐ VIP: *${vipTxt}*\n` +
      `${b} ⚧ Género: *${genero}*\n` +
      `${b} 🧮 Comandos: *${cmds}*\n` +
      `${b} 📅 No bot desde: *${desde}*\n` +
      `${b} 📍 Local: ${ctx.isGroup ? `*${ctx.groupName || 'grupo'}*` : '*chat privado*'}\n\n` +
      `> ${t.icon} ${prefix}alterargenero — mudar género\n` +
      `> ${t.icon} ${prefix}vip — tornar-se VIP`;

    return reply(txt);
  });

  // ── case 'donos' ───────────────────────────────────────────
  registerCase(['donos', 'subdonos', 'equipe', 'staff'], async ({ reply }) => {
    const t = await getActiveTheme(ctx.remoteJid);
    const f = t.frame;
    const b = t.bullet;

    const extras = await botConfigCache.get('owner_numbers', []).catch(() => []);
    const extraList = (Array.isArray(extras) ? extras : String(extras || '').split(/[\s,]+/))
      .map(n => String(n).replace(/\D/g, '')).filter(n => n.length >= 8);

    const lines = [
      `${f[0]}${f[4].repeat(28)}${f[1]}`,
      `${f[5]} ${t.icon} ᴅᴏɴᴏs ᴅᴏ ${config.bot.name} ${t.icon}`,
      `${f[2]}${f[4].repeat(28)}${f[3]}`,
      '',
      `${b} 👑 *Dono Supremo:* ${config.owner.name}`,
      `${b}    wa.me/${config.owner.number}`,
    ];
    if (extraList.length) {
      lines.push('');
      extraList.forEach((n, i) => lines.push(`${b} 🛡️ *Sub-Dono ${i + 1}:* +${n}\n${b}    wa.me/${n}`));
    }
    lines.push('', `> ${t.vibe}`);

    return reply(lines.join('\n'));
  });

  // ── case 'aiapis' ──────────────────────────────────────────
  registerCase(['aiapis', 'iaapis', 'checkia'], async ({ prefix, reply }) => {
    const aiMod     = require('../ai');
    const t         = await getActiveTheme(ctx.remoteJid);
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
