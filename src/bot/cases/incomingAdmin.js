'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT — incomingAdmin (v7.47)                           ║
 * ║   Port nativo: delstts · abrir/fechar programado ·           ║
 * ║   antifoba · autoapresentar                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Diferenças vs snippets originais:
 *  - persistência em GroupSettings (Mongo) em vez de JSON em disco
 *  - execução do abrir/fechar pelo scheduler.js (tick 30s) em vez de
 *    setInterval de 1s; fuso Africa/Luanda (padrão do projeto)
 *  - permissões via isOwner/isAdminFn nativos (sem OWNER_NUMBERS fixo)
 */

function soDigitos(v) {
  return String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function botEhAdmin(sock, groupJid) {
  try {
    const meta = await sock.groupMetadata(groupJid);
    const botNum = soDigitos(sock.user?.id || '');
    const bot = (meta?.participants || []).find(p => {
      const ids = [p.id, p.jid, p.lid, p.phoneNumber, p.pn].filter(Boolean);
      return ids.some(j => soDigitos(j) === botNum);
    });
    return bot?.admin === 'admin' || bot?.admin === 'superadmin';
  } catch { return false; }
}

function parseHora(raw) {
  const t = String(raw || '').trim();
  const mm = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!mm) return null;
  const h = mm[1].padStart(2, '0'), m = mm[2];
  if (Number(h) > 23 || Number(m) > 59) return null;
  return `${h}:${m}`;
}

async function getGS(groupJid) {
  const GroupSettings = require('../../database/models/GroupSettings');
  return GroupSettings.findOne({ groupJid });
}

async function setGS(groupJid, patch) {
  const GroupSettings = require('../../database/models/GroupSettings');
  return GroupSettings.findOneAndUpdate(
    { groupJid },
    { $set: patch },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = function registerIncomingAdmin(registerCase) {

  // ═══ delstts — apagar status (só com quote; sem lib externa) ═══
  registerCase(['delstts', 'delstatus', 'rmstts'], async ({ m, sock, msg, ctx, isOwner, isAdminFn }) => {
    if (!ctx.isGroup) return m.reply('❌ Este comando só funciona em grupos.');
    let admin = false;
    try { admin = isOwner || await isAdminFn(); } catch {}
    if (!admin) return m.reply('🚫 Apenas *admins do grupo* ou o *dono do bot* podem apagar status.');
    const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctxInfo?.stanzaId) {
      return m.reply('⚠️ Responde ao status que queres apagar e manda de novo.');
    }
    const autor = ctxInfo.participant || m.sender;
    const botNum = soDigitos(sock.user?.id || '');
    const key = {
      remoteJid: ctx.remoteJid,
      id: ctxInfo.stanzaId,
      fromMe: soDigitos(autor) === botNum,
      participant: autor,
    };
    try {
      await sock.sendMessage(ctx.remoteJid, { delete: key });
      await m.react('🗑️');
      return m.reply('🗑️ Status apagado.');
    } catch (e) {
      console.error('[delstts]', e.message?.slice(0, 80));
      return m.reply('❌ Falha ao apagar. Para apagar status de terceiros o bot precisa ser *admin do grupo*.');
    }
  });

  // ═══ abrir/fechar programado ═══
  async function agendar(kind, { m, sock, ctx, args, prefix, command, isOwner, isAdminFn }) {
    if (!ctx.isGroup) return m.reply('❌ Este comando só funciona em grupos.');
    let admin = false;
    try { admin = isOwner || await isAdminFn(); } catch {}
    if (!admin) return m.reply('🚫 Precisas ser *administrador*.');
    if (!await botEhAdmin(sock, ctx.remoteJid)) return m.reply('❌ Eu preciso ser *administrador* do grupo.');
    const hora = parseHora(args[0]);
    if (!hora) return m.reply(`*Formato inválido, usa HH:MM* ❌\nExemplo: ${prefix}${command} ${kind === 'abertura' ? '06:00' : '23:00'}`);
    await setGS(ctx.remoteJid, kind === 'abertura' ? { aberturaHora: hora } : { fechamentoHora: hora });
    await m.react('⏰');
    return m.reply(kind === 'abertura'
      ? `*🔓 O grupo vai ABRIR às ${hora}* (Luanda, todos os dias)`
      : `*🔒 O grupo vai FECHAR às ${hora}* (Luanda, todos os dias)`);
  }

  registerCase(['abrirgp', 'abertura'], async (c) => agendar('abertura', c));
  registerCase(['fechargp', 'fechamento'], async (c) => agendar('fechamento', c));

  registerCase(['horariosgp', 'verhorarios'], async ({ m, ctx }) => {
    if (!ctx.isGroup) return m.reply('❌ Este comando só funciona em grupos.');
    const gs = await getGS(ctx.remoteJid).catch(() => null);
    const ab = gs?.aberturaHora || '—';
    const fe = gs?.fechamentoHora || '—';
    return m.reply(`⏰ *HORÁRIOS DO GRUPO* (Luanda)\n\n🔓 Abertura: *${ab}*\n🔒 Fechamento: *${fe}*`);
  });

  registerCase(['limparhorarios'], async ({ m, ctx, isOwner, isAdminFn }) => {
    if (!ctx.isGroup) return m.reply('❌ Este comando só funciona em grupos.');
    let admin = false;
    try { admin = isOwner || await isAdminFn(); } catch {}
    if (!admin) return m.reply('🚫 Precisas ser *administrador*.');
    await setGS(ctx.remoteJid, { aberturaHora: '', fechamentoHora: '' });
    await m.react('✅');
    return m.reply('🗑️ Horários de abrir/fechar *removidos*.');
  });

  // ═══ antifoba — toggle + gestão da blacklist de DDIs ═══
  registerCase(['antifoba', 'antifobados', 'anticarente'], async ({ m, sock, ctx, args, prefix, command, isOwner, isAdminFn }) => {
    if (!ctx.isGroup) return m.reply('❌ Este comando só funciona em grupos.');
    let admin = false;
    try { admin = isOwner || await isAdminFn(); } catch {}
    if (!admin) return m.reply('🚫 Apenas *administradores* podem usar este comando.');
    const acao = String(args[0] || '').toLowerCase();
    const gs = await getGS(ctx.remoteJid).catch(() => null);
    const ativo = gs?.antifoba === true;
    // sem argumento → alterna (padrão v7.29: clicável sem "Uso:")
    if (!acao || ['on', 'ativar', 'ligar', '1'].includes(acao)) {
      const ligar = !acao ? !ativo : true;
      if (ligar && !await botEhAdmin(sock, ctx.remoteJid)) {
        return m.reply('❌ Preciso ser *administrador* do grupo (a punição é ban).');
      }
      await setGS(ctx.remoteJid, { antifoba: ligar });
      await m.react(ligar ? '✅' : '🚫');
      return m.reply(ligar
        ? `🟢 *ANTI-FOBADOS ATIVADO*\n\nDivulgação oculta = apaga + bane.\nDDIs na blacklist: ${(gs?.fobaBlacklist?.length ? gs.fobaBlacklist.join(', ') : '63')}`
        : '🔴 *ANTI-FOBADOS DESATIVADO*');
    }
    if (['off', 'desativar', 'desligar', '0'].includes(acao)) {
      await setGS(ctx.remoteJid, { antifoba: false });
      await m.react('🚫');
      return m.reply('🔴 *ANTI-FOBADOS DESATIVADO*');
    }
    const lista = gs?.fobaBlacklist?.length ? gs.fobaBlacklist.join(', ') : '63 (padrão)';
    return m.reply(
      `🛡️ *ANTI-FOBADOS*\n\nEstado: ${ativo ? '🟢 ATIVADO' : '🔴 DESATIVADO'}\n` +
      `DDIs bloqueados: ${lista}\n\nUso: ${prefix}${command} on|off\n${prefix}fobadd 63 55 • ${prefix}fobdel 55 • ${prefix}fobalista`
    );
  });

  registerCase(['fobadd'], async ({ m, ctx, args, isOwner, isAdminFn }) => {
    if (!ctx.isGroup) return m.reply('❌ Este comando só funciona em grupos.');
    let admin = false;
    try { admin = isOwner || await isAdminFn(); } catch {}
    if (!admin) return m.reply('🚫 Apenas *administradores*.');
    const ddis = args.map(a => String(a).replace(/\D/g, '')).filter(d => d.length >= 1 && d.length <= 4);
    if (!ddis.length) return m.reply('❌ Diz o DDI. Exemplo: .fobadd 63 55');
    const gs = await getGS(ctx.remoteJid).catch(() => null);
    const atual = new Set([...(gs?.fobaBlacklist?.length ? gs.fobaBlacklist : ['63']), ...ddis]);
    await setGS(ctx.remoteJid, { fobaBlacklist: [...atual] });
    return m.reply(`✅ DDIs bloqueados: *${[...atual].join(', ')}*`);
  });

  registerCase(['fobdel'], async ({ m, ctx, args, isOwner, isAdminFn }) => {
    if (!ctx.isGroup) return m.reply('❌ Este comando só funciona em grupos.');
    let admin = false;
    try { admin = isOwner || await isAdminFn(); } catch {}
    if (!admin) return m.reply('🚫 Apenas *administradores*.');
    const ddis = new Set(args.map(a => String(a).replace(/\D/g, '')).filter(Boolean));
    if (!ddis.size) return m.reply('❌ Diz o DDI. Exemplo: .fobdel 63');
    const gs = await getGS(ctx.remoteJid).catch(() => null);
    const atual = (gs?.fobaBlacklist?.length ? gs.fobaBlacklist : ['63']).filter(d => !ddis.has(String(d)));
    await setGS(ctx.remoteJid, { fobaBlacklist: atual });
    return m.reply(`✅ DDIs bloqueados: *${atual.length ? atual.join(', ') : 'nenhum'}*`);
  });

  registerCase(['fobalista'], async ({ m, ctx }) => {
    if (!ctx.isGroup) return m.reply('❌ Este comando só funciona em grupos.');
    const gs = await getGS(ctx.remoteJid).catch(() => null);
    const lista = gs?.fobaBlacklist?.length ? gs.fobaBlacklist : ['63 (padrão)'];
    return m.reply(`🛡️ *DDIs NA BLACKLIST*\n\n${lista.map(d => `• +${d}`).join('\n')}\n\nAnti-fobados: ${gs?.antifoba ? '🟢 ATIVADO' : '🔴 DESATIVADO'}`);
  });

  // ═══ autoapresentar — toggle ═══
  registerCase(['autoapresentar', 'autoapresentacao', 'apresentacao'], async ({ m, sock, ctx, args, prefix, command, isOwner, isAdminFn }) => {
    if (!ctx.isGroup) return m.reply('❌ Este comando só funciona em grupos.');
    let admin = false;
    try { admin = isOwner || await isAdminFn(); } catch {}
    if (!admin) return m.reply('🚫 Apenas *administradores* podem usar este comando.');
    const acao = String(args[0] || '').toLowerCase();
    const gs = await getGS(ctx.remoteJid).catch(() => null);
    const ativo = gs?.autoapresentar === true;
    if (!acao || ['on', 'ativar', 'ligar', '1'].includes(acao)) {
      const ligar = !acao ? !ativo : true;
      if (ligar && !await botEhAdmin(sock, ctx.remoteJid)) {
        return m.reply('❌ Preciso ser *administrador* do grupo.\n*Motivo:* a remoção automática exige permissão de admin.');
      }
      await setGS(ctx.remoteJid, { autoapresentar: ligar });
      if (!ligar) {
        try { require('../autoApresentar').cancelarPendenciasDoGrupo(ctx.remoteJid); } catch {}
      }
      await m.react(ligar ? '✅' : '🚫');
      const autoAP = require('../autoApresentar');
      return m.reply(ligar
        ? `🟢 *AUTO-APRESENTAÇÃO ATIVADA*\n\n⏰ Prazo: ${autoAP.PRAZO_MINUTOS} minutos\n🔔 Alertas: a cada 1 minuto\n🚫 Punição: remoção automática`
        : '🔴 *AUTO-APRESENTAÇÃO DESATIVADA*');
    }
    if (['off', 'desativar', 'desligar', '0'].includes(acao)) {
      await setGS(ctx.remoteJid, { autoapresentar: false });
      try { require('../autoApresentar').cancelarPendenciasDoGrupo(ctx.remoteJid); } catch {}
      await m.react('🚫');
      return m.reply('🔴 *AUTO-APRESENTAÇÃO DESATIVADA*');
    }
    const autoAP = require('../autoApresentar');
    return m.reply(
      `⏰ *AUTO-APRESENTAÇÃO*\n\nEstado: ${ativo ? '🟢 ATIVADA' : '🔴 DESATIVADA'}\n` +
      `Prazo: ${autoAP.PRAZO_MINUTOS} minutos • Alertas: 1/min\n\nUso: ${prefix}${command} on|off`
    );
  });
};

module.exports._parseHora = parseHora;
