/**
 * DARK BOT v13.1 — Configuração de Anti-Tipos por Botões Interativos
 *
 * Comando: !anticonfig
 * - Menu principal com lista de todos os antis
 * - Cada anti tem botões: [Ligar] [Desligar] [Acção]
 * - Submenu de acções: [Apagar] [Avisar] [Kick] [Ban] [Mute]
 */

'use strict';

const antiActions = require('../antiActions');
const GroupSettings = require('../../database/models/GroupSettings');
const { sendButtons } = require('../buttonHandler');

module.exports = function registerAntiConfigCases(registerCase) {

  registerCase(['anticonfig', 'configanti2', 'antimenu'],
    async ({ sock, msg, ctx, isOwner, isAdminFn, args, prefix }) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.remoteJid, {
          text: '❌ Este comando só funciona em grupos.'
        }, { quoted: msg });
      }
      if (!isOwner) {
        let adm = false;
        try { adm = await isAdminFn(); } catch {}
        if (!adm) {
          return sock.sendMessage(ctx.remoteJid, {
            text: '🚫 Só o *Dono* ou *Admins* do grupo.'
          }, { quoted: msg });
        }
      }

      const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid });
      if (!gs) {
        return sock.sendMessage(ctx.remoteJid, {
          text: '❌ Grupo não encontrado.'
        }, { quoted: msg });
      }

      const anti = String(args[0] || '').toLowerCase();

      // Se especificou um anti, mostra submenu
      if (anti && antiActions.ALL_ANTIS.includes(anti)) {
        return showAntiSubmenu(sock, msg, ctx, gs, anti, prefix);
      }

      // Senão, mostra menu principal
      await showAntiMenu(sock, msg, ctx, gs, prefix);
    }
  );
};

/**
 * Menu principal — lista todos os antis com botões rápidos
 */
async function showAntiMenu(sock, msg, ctx, gs, prefix) {
  const lista = antiActions.listActions(gs);

  const activos = lista.filter(i => i.active);
  const inactivos = lista.filter(i => !i.active);

  const texto =
    `🛡️ *CONFIGURAÇÃO ANTI-TIPOS*\n\n` +
    `🟢 *ACTIVOS (${activos.length})*\n` +
    (activos.map(i => `• ${i.label} → ${i.effective}`).join('\n') || '(nenhum)') +
    `\n\n⚪ *INACTIVOS (${inactivos.length})*\n` +
    (inactivos.map(i => `• ${i.label}`).join('\n') || '(nenhum)') +
    `\n\n*Para configurar um anti:*\n\`${prefix}anticonfig <anti>\`\n\n*Ex:* \`${prefix}anticonfig antipalavra\``;

  // Botões para os 6 antis mais populares
  const botoes = [
    { text: '🔄 Reset tudo', id: `${prefix}configanti reset` },
  ];

  const populares = ['antipalavra', 'antitoxic', 'antiflood', 'antifigurinha', 'antibtn', 'antistatus'];
  populares.forEach(anti => {
    const item = lista.find(i => i.flag === anti);
    if (item) {
      const estado = item.active ? '🟢' : '⚪';
      botoes.push({ text: `${estado} ${item.label}`, id: `${prefix}anticonfig ${anti}` });
    }
  });

  await sendButtons(sock, ctx.remoteJid, texto, 'DARK BOT 🕸️', botoes.slice(0, 9), msg);
}

/**
 * Submenu de um anti específico — botões para acção
 */
async function showAntiSubmenu(sock, msg, ctx, gs, anti, prefix) {
  const item = antiActions.listActions(gs).find(i => i.flag === anti);
  if (!item) {
    return sock.sendMessage(ctx.remoteJid, {
      text: `❌ Anti desconhecido: *${anti}*`
    }, { quoted: msg });
  }

  const label = item.label;
  const estado = item.active ? '🟢 LIGADO' : '⚪ DESLIGADO';
  const accao = item.effective;

  const texto =
    `🛡️ *${label}*\n\n` +
    `Estado: *${estado}*\n` +
    `Acção: *${accao}*\n\n` +
    `*Escolha uma opção:*`;

  // Botões de acção
  const botoes = [
    { text: item.active ? '🔴 Desligar' : '🟢 Ligar', id: `${prefix}antitoggle ${anti}` },
  ];

  // Botões de acção (só faz sentido se estiver ligado)
  if (item.active) {
    botoes.push(
      { text: '🗑️ Apagar', id: `${prefix}antiacao2 ${anti} apagar` },
      { text: '⚠️ Avisar', id: `${prefix}antiacao2 ${anti} avisar` },
      { text: '🚫 Kick', id: `${prefix}antiacao2 ${anti} kick` },
      { text: '🔒 Ban', id: `${prefix}antiacao2 ${anti} ban` },
      { text: '🔇 Mute', id: `${prefix}antiacao2 ${anti} mute` },
      { text: '↩️ Voltar', id: `${prefix}anticonfig` }
    );
  } else {
    botoes.push({ text: '↩️ Voltar', id: `${prefix}anticonfig` });
  }

  await sendButtons(sock, ctx.remoteJid, texto, `${label} • ${estado}`, botoes.slice(0, 9), msg);
}
