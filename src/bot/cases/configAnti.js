/**
 * DARK BOT v13.0 — Configuração de Acções Anti-Tipos
 *
 * Comandos:
 *   !configanti                  — listar todas as acções
 *   !configanti antipalavra kick — configurar acção para um anti
 *   !configanti reset            — repor acções para omissão
 *
 * Acções: apagar | avisar | kick | ban | mute
 */

'use strict';

const antiActions = require('../antiActions');
const GroupSettings = require('../../database/models/GroupSettings');

module.exports = function registerConfigAntiCases(registerCase) {

  registerCase(['configanti', 'setanti', 'antiacao', 'antiaccao', 'acaoanti', 'accaanti'],
    async ({ sock, msg, ctx, args, isOwner, reply, prefix, isAdminFn }) => {
      if (!ctx.isGroup) return reply('❌ Este comando só funciona em grupos.');
      if (!isOwner) {
        let adm = false; try { adm = await isAdminFn(); } catch {}
        if (!adm) return reply('🚫 Só o *Dono* ou *Admins* do grupo.');
      }

      const sub = String(args[0] || '').toLowerCase();
      const accao = String(args[1] || '').toLowerCase();

      // ── LISTAR ──
      if (!sub || sub === 'lista' || sub === 'listar') {
        const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid }).lean().catch(() => null);
        const lista = antiActions.listActions(gs);

        const linhas = lista.map(item => {
          const estado = item.active ? '🟢' : '⚪';
          const custom = item.custom ? ` *(${item.custom})*` : '';
          return `${estado} ${item.label}${custom} → _${item.effective}_`;
        });

        const text =
          `🛡️ *CONFIG ANTI-TIPOS*\n\n` +
          `*Acções:*\n` +
          `• apagar — só remove a mensagem\n` +
          `• avisar — remove + aviso + warns\n` +
          `• kick — remove + kick imediato\n` +
          `• ban — remove + kick + blacklist\n` +
          `• mute — remove + silencia\n\n` +
          `${linhas.join('\n')}\n\n` +
          `*Uso:* \`${prefix}configanti <anti> <accao>\`\n` +
          `Ex: \`${prefix}configanti antipalavra kick\`\n\n` +
          `*Reset:* \`${prefix}configanti reset\``;
        return reply(text);
      }

      // ── RESET ──
      if (sub === 'reset' || sub === 'padrao' || sub === 'padrão') {
        await GroupSettings.updateOne(
          { groupJid: ctx.remoteJid },
          { $unset: { antitiposAccoes: 1 } }
        );
        return reply('✅ Acções de todos os antis repostas para omissão (*avisar*).');
      }

      // ── CONFIGURAR UM ANTI ──
      if (!antiActions.ALL_ANTIS.includes(sub)) {
        return reply(
          `❌ Anti desconhecido: *${sub}*\n\n` +
          `*Antis disponíveis:*\n${antiActions.ALL_ANTIS.map(a => `• \`${a}\``).join('\n')}\n\n` +
          `*Uso:* \`${prefix}configanti <anti> <accao>\``
        );
      }

      if (!antiActions.VALID_ACTIONS.has(accao)) {
        return reply(
          `❌ Acção inválida: *${accao}*\n\n` +
          `*Acções válidas:*\n${[...antiActions.VALID_ACTIONS].map(a => `• \`${a}\``).join('\n')}`
        );
      }

      // Aplicar
      const gs = await GroupSettings.findOne({ groupJid: ctx.remoteJid });
      if (!gs) return reply('❌ Grupo não encontrado.');

      const result = antiActions.setAction(gs, sub, accao);
      if (!result.ok) return reply(`❌ ${result.error}`);

      // Activar o anti se ainda não estiver
      if (!gs[sub]) gs[sub] = true;
      await gs.save();

      return reply(
        `✅ *${result.label}* configurado!\n\n` +
        `Anti: \`${sub}\`\n` +
        `Acção: *${accao}*\n` +
        `Estado: ${gs[sub] ? '🟢 ON' : '🔴 OFF'}`
      );
    }
  );
};
