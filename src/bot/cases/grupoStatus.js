/**
 * DARK BOT v13.2 — Status Completo do Grupo
 *
 * Comando: !statusgp
 * - Mostra TUDO que está activado no grupo
 * - Organizado em secções: Modos, Antis, AURA, RPG, etc.
 * - Usa botões para navegar entre secções
 */

'use strict';

const GroupSettings = require('../../database/models/GroupSettings');
const antiActions = require('../antiActions');
const { sendButtons } = require('../buttonHandler');

module.exports = function registerGrupoStatusCases(registerCase) {

  registerCase(['statusgp', 'estadogrupo', 'gpstatus', 'grupostatus', 'statusgrupo'],
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

      const sub = String(args[0] || '').toLowerCase();

      // Se especificou uma secção, mostra só essa
      if (sub) {
        return showSection(sock, msg, ctx, gs, sub, prefix);
      }

      // Senão, mostra resumo geral
      await showFullStatus(sock, msg, ctx, gs, prefix);
    }
  );
};

/**
 * Mostra o status completo do grupo com botões de navegação
 */
async function showFullStatus(sock, msg, ctx, gs, prefix) {
  const section = String(ctx.args?.[0] || '').toLowerCase();

  // Buscar meta do grupo
  let meta;
  try { meta = await sock.groupMetadata(ctx.remoteJid); } catch {}

  const participantCount = meta?.participants?.length || gs.participantsCount || 0;

  // ═══════════════════════════════════════════════════════════════
  // SECÇÃO 1: INFORMAÇÕES GERAIS
  // ═══════════════════════════════════════════════════════════════
  const prefixo = gs.groupPrefix || '(global)';
  const tema = gs.groupTheme || '(global)';

  let texto = `📊 *STATUS DO GRUPO*\n\n`;
  texto += `👥 *${gs.groupName || 'Grupo'}*\n`;
  texto += `Membros: *${participantCount}*\n`;
  texto += `Prefixo: \`${prefixo}\`\n`;
  texto += `Tema: \`${tema}\`\n\n`;

  // ═══════════════════════════════════════════════════════════════
  // SECÇÃO 2: MODOS
  // ═══════════════════════════════════════════════════════════════
  const modos = [
    { nome: 'Downloads', campo: 'modeDownloads' },
    { nome: 'Stickers', campo: 'modeStickers' },
    { nome: 'IA', campo: 'modeIa' },
    { nome: 'Jogos', campo: 'modeJogos' },
    { nome: 'Economia', campo: 'modeEconomia' },
    { nome: 'Interações', campo: 'modeInteracoes' },
    { nome: 'Texto', campo: 'modeTexto' },
    { nome: 'Search', campo: 'modeSearch' },
    { nome: 'Áudio', campo: 'modeAudio' },
    { nome: 'Logos', campo: 'modeLogos' },
    { nome: 'Zoeira', campo: 'modeZoeira' },
  ];

  const modosActivos = modos.filter(m => gs[m.campo]).map(m => m.nome);
  const modosInactivos = modos.filter(m => !gs[m.campo]).map(m => m.nome);

  texto += `🎮 *MODOS*\n`;
  texto += `Activos (${modosActivos.length}): ${modosActivos.join(', ') || '(nenhum)'}\n`;
  texto += `Inactivos (${modosInactivos.length}): ${modosInactivos.join(', ') || '(nenhum)'}\n\n`;

  // ═══════════════════════════════════════════════════════════════
  // SECÇÃO 3: ANTI-TIPOS (com acções)
  // ═══════════════════════════════════════════════════════════════
  const antis = antiActions.listActions(gs);
  const antisActivos = antis.filter(i => i.active);
  const antisInactivos = antis.filter(i => !i.active);

  texto += `🛡️ *ANTI-TIPOS*\n`;
  texto += `Activos (${antisActivos.length}):\n`;
  antisActivos.forEach(i => {
    const accao = i.custom ? ` (${i.custom})` : '';
    texto += `  • ${i.label}${accao}\n`;
  });
  if (antisActivos.length === 0) texto += `  (nenhum)\n`;
  texto += `Inactivos (${antisInactivos.length}): ${antisInactivos.length}\n\n`;

  // ═══════════════════════════════════════════════════════════════
  // SECÇÃO 4: ANTI-LINK
  // ═══════════════════════════════════════════════════════════════
  texto += `🔗 *ANTI-LINK*\n`;
  texto += `Estado: ${gs.antilink ? '🟢 ON' : '⚪ OFF'}\n`;
  if (gs.antilink) {
    texto += `Modo: ${gs.antilinkMode}\n`;
    texto += `Acção: ${gs.antilinkAction}\n`;
    texto += `Max warns: ${gs.antilinkMaxWarns}\n`;
    texto += `Strict: ${gs.antilinkStrict ? 'Sim' : 'Não'}\n`;
    if (gs.antilinkStats?.deleted > 0) {
      texto += `Stats: ${gs.antilinkStats.deleted} apagadas, ${gs.antilinkStats.kicks} kicks\n`;
    }
  }
  texto += `\n`;

  // ═══════════════════════════════════════════════════════════════
  // SECÇÃO 5: AURA
  // ═══════════════════════════════════════════════════════════════
  texto += `🤖 *AURA*\n`;
  texto += `Modo: ${gs.auraMode}\n`;
  if (gs.auraMode === 'aura') {
    texto += `Invocada por: ${gs.auraInvokedBy || '?'}\n`;
  }
  texto += `\n`;

  // ═══════════════════════════════════════════════════════════════
  // SECÇÃO 6: OUTROS
  // ═══════════════════════════════════════════════════════════════
  texto += `⚙️ *OUTROS*\n`;
  texto += `Welcome: ${gs.welcome ? '🟢' : '⚪'}\n`;
  texto += `Goodbye: ${gs.goodbye ? '🟢' : '⚪'}\n`;
  texto += `Auto-DL: ${gs.autoDl ? '🟢' : '⚪'}\n`;
  texto += `Auto-Visu1: ${gs.autoVisu1 ? '🟢' : '⚪'}\n`;
  texto += `RPG: ${gs.modorpg ? '🟢' : '⚪'}\n`;
  texto += `OnlyAdmins: ${gs.onlyAdmins ? '🟢' : '⚪'}\n`;

  // ═══════════════════════════════════════════════════════════════
  // BOTOES DE NAVEGAÇÃO
  // ═══════════════════════════════════════════════════════════════
  const botoes = [
    { text: '🛡️ Anti-Tipos', id: `${prefix}statusgp antis` },
    { text: '🎮 Modos', id: `${prefix}statusgp modos` },
    { text: '🔗 Anti-Link', id: `${prefix}statusgp antilink` },
    { text: '🤖 AURA', id: `${prefix}statusgp aura` },
    { text: '🛠️ Configurar', id: `${prefix}anticonfig` },
  ];

  await sendButtons(sock, ctx.remoteJid, texto, 'DARK BOT 🕸️', botoes, msg);
}

/**
 * Mostra uma secção específica
 */
async function showSection(sock, msg, ctx, gs, section, prefix) {
  let texto = '';
  const botoes = [{ text: '↩️ Voltar', id: `${prefix}statusgp` }];

  switch (section) {
    case 'antis': {
      texto = `🛡️ *ANTI-TIPOS*\n\n`;
      const lista = antiActions.listActions(gs);
      const activos = lista.filter(i => i.active);
      const inactivos = lista.filter(i => !i.active);

      texto += `🟢 *ACTIVOS (${activos.length})*\n`;
      activos.forEach(i => {
        const accao = i.custom ? ` → ${i.custom}` : '';
        texto += `• ${i.label}${accao}\n`;
      });
      if (activos.length === 0) texto += `(nenhum)\n`;

      texto += `\n⚪ *INACTIVOS (${inactivos.length})*\n`;
      inactivos.forEach(i => {
        texto += `• ${i.label}\n`;
      });

      texto += `\n*Max warns:* ${gs.antitiposMaxWarns}\n`;
      texto += `*Notificar:* ${gs.antitiposNotify ? 'Sim' : 'Não'}\n`;

      botoes.unshift({ text: '🛠️ Configurar', id: `${prefix}anticonfig` });
      break;
    }

    case 'modos': {
      texto = `🎮 *MODOS*\n\n`;
      const modos = [
        { nome: 'Downloads', campo: 'modeDownloads', emoji: '📥' },
        { nome: 'Stickers', campo: 'modeStickers', emoji: '🎨' },
        { nome: 'IA', campo: 'modeIa', emoji: '🤖' },
        { nome: 'Jogos', campo: 'modeJogos', emoji: '🎮' },
        { nome: 'Economia', campo: 'modeEconomia', emoji: '💰' },
        { nome: 'Interações', campo: 'modeInteracoes', emoji: '💬' },
        { nome: 'Texto', campo: 'modeTexto', emoji: '📝' },
        { nome: 'Search', campo: 'modeSearch', emoji: '🔍' },
        { nome: 'Áudio', campo: 'modeAudio', emoji: '🎵' },
        { nome: 'Logos', campo: 'modeLogos', emoji: '🎨' },
        { nome: 'Zoeira', campo: 'modeZoeira', emoji: '😂' },
      ];

      modos.forEach(m => {
        const estado = gs[m.campo] ? '🟢' : '⚪';
        texto += `${estado} ${m.emoji} ${m.nome}\n`;
      });

      const activos = modos.filter(m => gs[m.campo]).length;
      const inactivos = modos.filter(m => !gs[m.campo]).length;
      texto += `\nActivos: ${activos} | Inactivos: ${inactivos}\n`;
      break;
    }

    case 'antilink': {
      texto = `🔗 *ANTI-LINK*\n\n`;
      texto += `Estado: ${gs.antilink ? '🟢 ON' : '⚪ OFF'}\n\n`;

      if (gs.antilink) {
        texto += `*Configurações:*\n`;
        texto += `Modo: ${gs.antilinkMode}\n`;
        texto += `Acção: ${gs.antilinkAction}\n`;
        texto += `Max warns: ${gs.antilinkMaxWarns}\n`;
        texto += `Strict: ${gs.antilinkStrict ? 'Sim' : 'Não'}\n`;
        texto += `VIP imune: ${gs.antilinkVipImmune ? 'Sim' : 'Não'}\n`;
        texto += `Apagar msg: ${gs.antilinkDeleteMsg ? 'Sim' : 'Não'}\n`;
        texto += `Notificar: ${gs.antilinkNotify ? 'Sim' : 'Não'}\n`;

        if (gs.antilinkStats?.deleted > 0) {
          texto += `\n*Estatísticas:*\n`;
          texto += `Apagadas: ${gs.antilinkStats.deleted}\n`;
          texto += `Warns: ${gs.antilinkStats.warns}\n`;
          texto += `Kicks: ${gs.antilinkStats.kicks}\n`;
        }

        if (gs.antilinkWhitelist?.length > 0) {
          texto += `\n*Whitelist:*\n`;
          gs.antilinkWhitelist.forEach(w => {
            texto += `• ${w}\n`;
          });
        }
      } else {
        texto += `Anti-link está desligado.\n`;
        texto += `Use \`${prefix}antilink on\` para activar.\n`;
      }

      botoes.unshift({ text: '⚙️ Configurar', id: `${prefix}antilink` });
      break;
    }

    case 'aura': {
      texto = `🤖 *AURA*\n\n`;
      texto += `Modo: ${gs.auraMode}\n\n`;

      if (gs.auraMode === 'assistant') {
        texto += `AURA está em modo *Assistente* (neutro, profissional).\n`;
        texto += `Funciona como Meta AI — responde perguntas e ajuda.\n`;
      } else if (gs.auraMode === 'aura') {
        texto += `AURA está em modo *Original* (personalidade activa).\n`;
        texto += `Invocada por: ${gs.auraInvokedBy || '?'}\n`;
        if (gs.auraInvokedAt) {
          texto += `Desde: ${new Date(gs.auraInvokedAt).toLocaleDateString('pt-PT')}\n`;
        }
      } else if (gs.auraMode === 'sleep') {
        texto += `AURA está *dormindo*.\n`;
        texto += `Use \`${prefix}aura awake\` para acordar.\n`;
      }

      botoes.unshift({ text: '⚙️ Configurar', id: `${prefix}auraset` });
      break;
    }

    default: {
      texto = `❌ Secção desconhecida: *${section}*\n\n*Secções:*\n• antis\n• modos\n• antilink\n• aura`;
    }
  }

  await sendButtons(sock, ctx.remoteJid, texto, 'DARK BOT 🕸️', botoes, msg);
}
