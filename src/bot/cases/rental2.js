/**
 * DARK BOT v6.28 — ALUGUEL AVANÇADO + menu18 PV
 * Sistema completo de aluguel com planos, trial, gestão
 */
'use strict';

const config = require('../../config');
const GroupSettings = require('../../database/models/GroupSettings');
const User = require('../../database/models/User');
const botConfigCache = require('../botConfigCache');

async function tReply(sock, msg, ctx, title, lines) {
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid);
  return sock.sendMessage(ctx.remoteJid, { text: RE.renderBlock(t, title, lines, { botName: config.bot.name }) }, { quoted: msg });
}

// ── Planos de aluguel ──
const RENTAL_PLANS = [
  { id: 'trial', nome: '🆓 TRIAL', dias: 3, preco: 'Grátis', emoji: '🆓',
    desc: '3 dias grátis\n500 cmds/dia\nComandos básicos\nSem IA avançada', cmdsDay: 500 },
  { id: 'semanal', nome: '⭐ SEMANAL', dias: 7, preco: 'Contactar dono', emoji: '⭐',
    desc: '7 dias\nComandos ilimitados\nDownloads HD\nIA com memória\nSuporte básico', cmdsDay: -1 },
  { id: 'mensal', nome: '💎 MENSAL', dias: 30, preco: 'Contactar dono', emoji: '💎',
    desc: '30 dias\nTudo do semanal\n+Portal 18+\n+Comandos VIP\n+Badge premium', cmdsDay: -1 },
  { id: 'trimestral', nome: '🏆 TRIMESTRAL', dias: 90, preco: 'Melhor preço', emoji: '🏆',
    desc: '90 dias\nTudo do mensal\n+Prioridade máxima\n+Suporte 24/7\n+Sem limites', cmdsDay: -1 },
  { id: 'anual', nome: '👑 ANUAL', dias: 365, preco: 'VIP Supremo', emoji: '👑',
    desc: '365 dias\nTudo ilimitado\n+Domínio total\n+API privada\n+Suporte dedicado', cmdsDay: -1 },
];

module.exports = function registerRental2(registerCase) {

  // ═══ ALUGAR COM CARROSSEL DE PLANOS ═══
  registerCase(['alugar', 'hospedar', 'rent'], async ({ sock, msg, ctx, args, isOwner, config: cfg }) => {
    const localConfig = cfg || config;
    const p = localConfig.bot.prefix;
    const ownerNum = String(localConfig.owner.number || '').replace(/\D/g, '');

    // Se tem argumento numérico → activar directamente (dono/subdono/VIP)
    const dias = parseInt(args[0]);
    if (dias >= 1 && dias <= 3650) {
      const u = await User.findOne({ whatsappNumber: ctx.senderNumber }).catch(() => null);
      const isVip = u && u.isPremium && u.isPremium();
      const extraOwners = await botConfigCache.get('owner_numbers', []).catch(() => []);
      const ownerNums = [localConfig.owner.number, ...(Array.isArray(extraOwners) ? extraOwners : [])].map(n => String(n).replace(/\D/g, ''));
      const isSubDono = isOwner || ownerNums.includes(ctx.senderNumber);

      if (!isSubDono && !isVip) {
        return tReply(sock, msg, ctx, '🏠 ALUGUEL', [
          '❌ Só Dono, SubDonos ou VIP podem alugar.',
          '',
          `📲 Contacta: wa.me/${ownerNum}`,
          `> Usa !vip para ver planos`,
        ]);
      }

      if (!ctx.isGroup) return tReply(sock, msg, ctx, '🏠 ALUGUEL', [`❌ Usa num grupo ou: ${p}alugar <jid> <dias>`]);

      // Verificar limite VIP
      if (!isSubDono && isVip) {
        const limit = u.vipGroupLimit || 3;
        const added = u.vipGroupsAdded || 0;
        if (added >= limit) return tReply(sock, msg, ctx, '🏠 ALUGUEL', [`❌ Limite VIP: ${added}/${limit} grupos`]);
        await User.findOneAndUpdate({ whatsappNumber: ctx.senderNumber }, { $inc: { vipGroupsAdded: 1 } }).catch(() => {});
      }

      const until = new Date(Date.now() + dias * 86400000);
      await GroupSettings.findOneAndUpdate(
        { groupJid: ctx.remoteJid },
        { isHosted: true, hostedUntil: until, trialExpiresAt: new Date(0), rentedBy: ctx.senderNumber, rentedAt: new Date(), groupName: ctx.groupName || '' },
        { upsert: true, new: true }
      );

      return tReply(sock, msg, ctx, '✅ ALUGUEL ACTIVADO', [
        `📋 Grupo: *${ctx.groupName || ctx.remoteJid}*`,
        `⏰ Duração: *${dias} dias*`,
        `📅 Expira: *${until.toLocaleDateString('pt-PT')}*`,
        `👤 Por: *${ctx.pushName}*`,
        '',
        '🚀 Comandos *ILIMITADOS* activados!',
      ]);
    }

    // Sem argumento → mostrar carrossel de planos
    const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@systemzero/baileys');
    const RE = require('../renderEngine');
    const t = await RE.getTheme(ctx.remoteJid);

    // Verificar estado actual do grupo
    let currentStatus = '🆓 Sem aluguel activo';
    if (ctx.isGroup) {
      const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }).lean().catch(() => null);
      if (gs?.isHosted && gs.hostedUntil && new Date(gs.hostedUntil) > new Date()) {
        const daysLeft = Math.ceil((new Date(gs.hostedUntil) - Date.now()) / 86400000);
        currentStatus = `🟢 Activo — ${daysLeft} dias restantes`;
      } else if (gs?.trialExpiresAt && new Date(gs.trialExpiresAt) > new Date()) {
        const daysLeft = Math.ceil((new Date(gs.trialExpiresAt) - Date.now()) / 86400000);
        currentStatus = `🆓 Trial — ${daysLeft} dias restantes`;
      }
    }

    // Construir carrossel de planos
    try {
      const cards = RENTAL_PLANS.map(plan => ({
        header: { hasMediaAttachment: false, title: `${plan.emoji} ${plan.nome}` },
        body: { text: `${plan.desc}\n\n💰 ${plan.preco}\n⏰ ${plan.dias} dias` },
        footer: { text: `${t.icon || '🕸️'} ${localConfig.bot.name}` },
        nativeFlowMessage: {
          buttons: [
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: `📲 ${plan.nome}`, id: `${p}alugar ${plan.dias}` }) },
            { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '📞 Falar Dono', url: `https://wa.me/${ownerNum}`, merchant_url: `https://wa.me/${ownerNum}` }) },
          ],
        },
      }));

      const msgContent = {
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          header: proto.Message.InteractiveMessage.Header.fromObject({ hasMediaAttachment: false, title: '🏠 PLANOS DE ALUGUEL' }),
          body: proto.Message.InteractiveMessage.Body.fromObject({
            text: `🏠 *ALUGUEL DE GRUPO*\n\n📋 Estado: ${currentStatus}\n\nEscolhe um plano abaixo 👇`,
          }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `${t.icon || '🕸️'} ${localConfig.bot.name}` }),
          carouselMessage: { cards },
        }),
      };

      const m = generateWAMessageFromContent(ctx.remoteJid, msgContent, { userJid: sock.user?.id, quoted: msg });
      await sock.relayMessage(ctx.remoteJid, m.message, {
        messageId: m.key.id,
        additionalNodes: [{ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] }],
      });
    } catch (e) {
      // Fallback texto
      const lines = RENTAL_PLANS.map(pl => [
        `${pl.emoji} *${pl.nome}* — ${pl.dias} dias`,
        `${pl.desc.split('\n')[0]}`,
        `> ${p}alugar ${pl.dias} para activar`,
      ].join('\n')).join('\n\n');
      return tReply(sock, msg, ctx, '🏠 PLANOS DE ALUGUEL', [
        `📋 Estado: ${currentStatus}`,
        '',
        lines,
        '',
        `📲 Dúvidas: wa.me/${ownerNum}`,
      ].flat());
    }
  }, true);

  // ═══ TRIAL GRÁTIS ═══
  registerCase(['trial', 'teste', 'experimentar'], async ({ sock, msg, ctx, config: cfg }) => {
    if (!ctx.isGroup) return tReply(sock, msg, ctx, '🆓 TRIAL', ['❌ Só em grupos']);
    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }).lean().catch(() => null);
    if (gs?.isHosted && gs.hostedUntil && new Date(gs.hostedUntil) > new Date()) {
      return tReply(sock, msg, ctx, '🆓 TRIAL', ['✅ Já tens aluguel activo!']);
    }
    if (gs?.trialExpiresAt && new Date(gs.trialExpiresAt) > new Date()) {
      const daysLeft = Math.ceil((new Date(gs.trialExpiresAt) - Date.now()) / 86400000);
      return tReply(sock, msg, ctx, '🆓 TRIAL', [`🆓 Trial activo — ${daysLeft} dias restantes`]);
    }
    // Activar trial de 3 dias
    const trialEnd = new Date(Date.now() + 3 * 86400000);
    await GroupSettings.findOneAndUpdate(
      { groupJid: ctx.remoteJid },
      { trialExpiresAt: trialEnd, isHosted: false, groupName: ctx.groupName || '' },
      { upsert: true, new: true }
    );
    return tReply(sock, msg, ctx, '🆓 TRIAL ACTIVADO', [
      `🆓 *3 dias grátis* activados!`,
      `📅 Expira: ${trialEnd.toLocaleDateString('pt-PT')}`,
      `📋 500 cmds/dia`,
      '',
      `> Usa !alugar para planos completos`,
    ]);
  }, true);

  // ═══ STATUS ALUGUEL ═══
  registerCase(['statusalugar', 'rentstatus', 'meualuguel'], async ({ sock, msg, ctx }) => {
    if (!ctx.isGroup) return tReply(sock, msg, ctx, '🏠 STATUS', ['❌ Só em grupos']);
    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }).lean().catch(() => null);
    if (!gs) return tReply(sock, msg, ctx, '🏠 STATUS', ['❌ Sem configuração. Usa !trial ou !alugar']);

    const hosted = gs.isHosted && (!gs.hostedUntil || new Date(gs.hostedUntil) > new Date());
    const trial = gs.trialExpiresAt && new Date(gs.trialExpiresAt) > new Date();
    const expires = gs.hostedUntil ? new Date(gs.hostedUntil).toLocaleDateString('pt-PT') : '—';
    const trialExp = gs.trialExpiresAt ? new Date(gs.trialExpiresAt).toLocaleDateString('pt-PT') : '—';
    const cmdsUsed = gs.commandsUsedToday || 0;

    return tReply(sock, msg, ctx, '🏠 STATUS ALUGUEL', [
      hosted ? '🟢 *ALUGUEL ACTIVO*' : trial ? '🆓 *TRIAL ACTIVO*' : '🔴 *INACTIVO*',
      '',
      hosted ? `📅 Expira: ${expires}` : '',
      trial ? `📅 Trial expira: ${trialExp}` : '',
      `👤 Activado por: ${gs.rentedBy || '—'}`,
      `📊 Comandos hoje: ${cmdsUsed}${hosted ? ' (ilimitado)' : ` / 500`}`,
      '',
      hosted ? '🚀 Todos os comandos ILIMITADOS' : trial ? '⚡ 500 cmds/dia' : '📲 Usa !trial ou !alugar',
    ].filter(Boolean));
  }, true);

  // ═══ CANCELAR ALUGUEL ═══
  registerCase(['cancelaraluguel', 'cancelrent', 'desalugar'], async ({ sock, msg, ctx, isOwner, config: cfg }) => {
    if (!ctx.isGroup) return tReply(sock, msg, ctx, '🚫 CANCELAR', ['❌ Só em grupos']);
    const localConfig = cfg || config;
    const extraOwners = await botConfigCache.get('owner_numbers', []).catch(() => []);
    const ownerNums = [localConfig.owner.number, ...(Array.isArray(extraOwners) ? extraOwners : [])].map(n => String(n).replace(/\D/g, ''));
    const isSubDono = isOwner || ownerNums.includes(ctx.senderNumber);

    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }).lean().catch(() => null);
    if (!gs?.isHosted) return tReply(sock, msg, ctx, '🚫 CANCELAR', ['❌ Sem aluguel activo']);
    if (!isSubDono && gs.rentedBy !== ctx.senderNumber) {
      return tReply(sock, msg, ctx, '🚫 CANCELAR', ['❌ Só quem alugou ou o dono pode cancelar']);
    }

    await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { isHosted: false, hostedUntil: new Date(0) }, { upsert: true });
    return tReply(sock, msg, ctx, '🚫 ALUGUEL CANCELADO', [
      `🚫 Aluguel cancelado para *${ctx.groupName || ctx.remoteJid}*`,
      `> Usa !alugar para reactivar`,
    ]);
  }, true);

  // ═══ ESTENDER ALUGUEL ═══
  registerCase(['estender', 'renew', 'renovar'], async ({ sock, msg, ctx, args, isOwner, config: cfg }) => {
    if (!ctx.isGroup) return tReply(sock, msg, ctx, '🔄 ESTENDER', ['❌ Só em grupos']);
    const dias = parseInt(args[0]);
    if (!dias || dias < 1) return tReply(sock, msg, ctx, '🔄 ESTENDER', ['Uso: !estender <dias>']);

    const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }).lean().catch(() => null);
    if (!gs?.isHosted || !gs.hostedUntil) return tReply(sock, msg, ctx, '🔄 ESTENDER', ['❌ Sem aluguel activo para estender']);

    const currentEnd = new Date(gs.hostedUntil);
    const base = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(base.getTime() + dias * 86400000);

    await GroupSettings.findOneAndUpdate({ groupJid: ctx.remoteJid }, { hostedUntil: newEnd }, { upsert: true });
    return tReply(sock, msg, ctx, '🔄 ALUGUEL ESTENDIDO', [
      `➕ +${dias} dias adicionados`,
      `📅 Nova data: *${newEnd.toLocaleDateString('pt-PT')}*`,
    ]);
  }, true);

  // ═══ LISTAR GRUPOS ALUGADOS (dono) ═══
  registerCase(['listrents', 'meusgrupos', 'gruposalugados'], async ({ sock, msg, ctx, isOwner, config: cfg }) => {
    const localConfig = cfg || config;
    const extraOwners = await botConfigCache.get('owner_numbers', []).catch(() => []);
    const ownerNums = [localConfig.owner.number, ...(Array.isArray(extraOwners) ? extraOwners : [])].map(n => String(n).replace(/\D/g, ''));
    const isSubDono = isOwner || ownerNums.includes(ctx.senderNumber);
    if (!isSubDono) return tReply(sock, msg, ctx, '📋 GRUPOS', ['❌ Só dono/subdono']);

    const filter = isOwner ? { isHosted: true } : { isHosted: true, rentedBy: ctx.senderNumber };
    const groups = await GroupSettings.find(filter).lean().catch(() => []);
    const active = groups.filter(g => !g.hostedUntil || new Date(g.hostedUntil) > new Date());

    if (!active.length) return tReply(sock, msg, ctx, '📋 GRUPOS ALUGADOS', ['📋 Nenhum grupo activo']);

    const lines = active.map((g, i) => {
      const daysLeft = g.hostedUntil ? Math.ceil((new Date(g.hostedUntil) - Date.now()) / 86400000) : '∞';
      return `${i + 1}. *${g.groupName || g.groupJid}* — ${daysLeft}d — por ${g.rentedBy || '?'}`;
    });
    return tReply(sock, msg, ctx, `📋 GRUPOS ALUGADOS (${active.length})`, lines);
  }, true);
};
