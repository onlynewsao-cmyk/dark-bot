'use strict';
/**
 * DARK BOT — Free Fire (v8.3) 🔥
 * Comandos com a API viva freefireapis.lat (verificada ao vivo):
 *  • ffinfo / ff / freefire / ffplayer <UID> [região]
 *     Cartão completo do guerreiro: nick, nível, ranks BR/CS, likes,
 *     badges, prime, elite pass, pet, signature, credit score, datas.
 *  • ffregioes — regiões suportadas (BR por omissão)
 *
 * Sem chave, sem conta — a API trata do resto (com mensagem clara quando
 * a região não tem token: "tenta outra região").
 */
const config = require('../../config');

const FF_API = 'https://freefireapis.lat';

const REGIOES = {
  br: 'Brasil 🇧🇷', sac: 'América do Sul 🌎', us: 'EUA 🇺🇸', na: 'América do Norte 🇺🇸',
  ind: 'Índia 🇮🇳', bd: 'Bangladesh 🇧🇩', id: 'Indonésia 🇮🇩', me: 'Médio Oriente 🌍',
  vn: 'Vietname 🇻🇳', th: 'Tailândia 🇹🇭', cis: 'CEI 🌍', ru: 'Rússia 🇷🇺',
  pk: 'Paquistão 🇵🇰', sg: 'Singapura 🇸🇬', eu: 'Europa 🇪🇺', tw: 'Taiwan 🇹🇼',
};

async function errReply(sock, msg, ctx, text) {
  try {
    const RE = require('../renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);
    return sock.sendMessage(ctx.remoteJid, { text: RE.renderBlock(t, 'ERRO', ['❌ ' + text], { botName: config.bot.name }) }, { quoted: msg });
  } catch {
    return sock.sendMessage(ctx.remoteJid, { text: '❌ ' + text }, { quoted: msg });
  }
}

function _bar(at, mx, cells = 10) {
  const a = Math.max(0, Number(String(at).replace(/\D/g, '')) || 0);
  const m = Math.max(1, Number(String(mx).replace(/\D/g, '')) || 0);
  const full = Math.round(Math.min(1, a / m) * cells);
  return '▰'.repeat(full) + '▱'.repeat(cells - full);
}

/** cartão textual do jogador */
function cartaoFF(j, uid, region) {
  const b = j?.result?.basicInfo || {};
  const petW = j?.result?.petInfo;
  const soc = j?.result?.socialInfo;
  const cred = j?.result?.creditScoreInfo;
  const xp = b.xpInfo || null;
  if (!b || (!b.nickname && !b.level)) return null;

  const L = [];
  L.push('🔥━━━━━━━━━━━━━━━━━━━━━━━🔥');
  L.push('   *FREE FIRE* — CARTÃO DO GUERREIRO');
  L.push('🔥━━━━━━━━━━━━━━━━━━━━━━━🔥');
  L.push('');
  L.push(`👤 *${b.nickname || '—'}* (${b.releaseVersion || 'OB?'})`);
  L.push(`🆔 ${b.accountId || uid} · 🌍 ${REGIOES[String(region).toLowerCase()] || region.toUpperCase()}`);
  L.push(`⭐ Nível *${b.level || 1}*${xp?.rate ? ` ${_bar(xp.currentInLevel, xp.totalInLevel)} ${xp.rate}%` : ''}`);
  if (b.primeLevel) L.push(`💎 Prime ${b.primeLevel} · 🏅 temporada ${b.seasonId || '?'}`);
  if (b.rank) L.push(`🏆 BR: *${b.rank}* (${b.rankingPoints ?? 0} pts)`);
  if (b.csRank) L.push(`🎯 CS: *${b.csRank}* (${b.csRankingPoints ?? 0} pts)`);
  if (b.maxRank || b.csMaxRank) L.push(`📈 Máx: ${b.maxRank || '—'} / ${b.csMaxRank || '—'}`);
  if (b.hippoRank) L.push(`🦛 LW: ${b.hippoRank} (${b.hippoRankingPoints ?? 0} pts)`);
  L.push(`❤️ ${b.liked ?? '0'} likes · 🎖️ ${b.badgeCnt ?? '0'} badges`);
  if (b.hasElitePass === true) L.push('🔥 *Elite Pass activo*');
  if (petW?.name) L.push(`🐾 pet: *${petW.name}* nv${petW.level ?? '?'}`);
  if (soc?.signature && String(soc.signature).trim()) {
    L.push('🖋️ _"' + String(soc.signature).replace(/\n/g, ' · ').slice(0, 90) + '"_');
  }
  if (cred?.creditScore != null) L.push(`💯 credit score: ${cred.creditScore}/100`);
  if (b.lastLoginAt) L.push(`🕒 visto: ${b.lastLoginAt}`);
  if (b.createAt) L.push(`🎂 conta desde: ${b.createAt}`);
  L.push('🔥━━━━━━━━━━━━━━━━━━━━━━━🔥');
  return L.join('\n');
}

module.exports = function (registerCase) {
  registerCase(['ff', 'freefire', 'ffplayer', 'fflog', 'nickff'], async ({ sock, msg, m, ctx, args, prefix }) => {
    const uid = String(args[0] || '').replace(/\D/g, '');
    let region = String(args[1] || 'br').toLowerCase();
    if (!uid || uid.length < 5) {
      return sock.sendMessage(ctx.remoteJid, { text:
        '🔥 *FREE FIRE — INFO DO JOGADOR*\n\n' +
        `Uso: \`${prefix}ffinfo <UID> [região]\`\n` +
        `Ex.: \`${prefix}ffinfo 228159683 br\`\n\n` +
        `🌍 Regiões: \`${prefix}ffregioes\`\n` +
        '💡 O UID está no canto do perfil dentro do jogo.',
      }, { quoted: msg });
    }
    if (!REGIOES[region]) region = 'br';
    sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});
    try {
      const mediaH = require('../mediaHandler');
      const j = await mediaH.fetchJson(
        `${FF_API}/info-player?uid=${uid}&region=${region.toUpperCase()}`,
        25000,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (!j?.success) {
        const motivo = j?.message || j?.error || 'sem dados';
        if (/TOKEN_UNAVAILABLE/i.test(String(j?.error))) {
          sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }).catch(() => {});
          return errReply(sock, msg, ctx,
            `A região *${region.toUpperCase()}* está momentaneamente sem token.\nTenta outra região com \`${prefix}ffinfo ${uid} <região>\` (BR costuma estar sempre de pé).`);
        }
        throw new Error(motivo);
      }
      const card = cartaoFF(j, uid, region);
      if (!card) throw new Error('o guerreiro veio sem ficha — UID correcto?');
      await sock.sendMessage(ctx.remoteJid, { text: card }, { quoted: msg });
      sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
    } catch (e) {
      sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } }).catch(() => {});
      return errReply(sock, msg, ctx, 'FF: ' + e.message);
    }
  });

  registerCase(['ffregioes', 'ffservers'], async ({ sock, msg, ctx, prefix }) => {
    const linhas = Object.entries(REGIOES).map(([k, v]) => `  ${k.toUpperCase()} — ${v}`);
    return sock.sendMessage(ctx.remoteJid, { text:
      '🌍 *FREE FIRE — REGIÕES SUPORTADAS*\n\n' + linhas.join('\n') +
      `\n\n💡 \`${prefix}ffinfo <UID> br\` (BR é a região por omissão)`,
    }, { quoted: msg });
  });
};
