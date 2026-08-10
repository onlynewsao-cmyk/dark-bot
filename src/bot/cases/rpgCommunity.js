/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — DARKRPG Community Commands v2                ║
 * ║   Comandos para criar e gerir a comunidade RPG               ║
 * ║   FASE DE TESTES — testar tudo antes de addglb               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config = require('../../config');
const rpg = require('../rpg/engine');
const community = require('../rpg/community');

async function tReply(sock, msg, ctx, title, lines) {
  const RE = require('../renderEngine');
  const t = await RE.getTheme(ctx.remoteJid);
  return sock.sendMessage(ctx.remoteJid, { text: RE.renderBlock(t, title, lines, { botName: config.bot.name }) }, { quoted: msg });
}

module.exports = function registerRPGCommunity(registerCase) {

  // ═══ INICIAR DARKRPG ═══
  registerCase(['darkrpg', 'rpginit', 'iniciar-rpg'], async ({ sock, msg, ctx, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🚫 Acesso', ['Só o dono pode iniciar o DARKRPG.']);

    await sock.sendMessage(ctx.remoteJid, { react: { text: '🚀', key: msg.key } });

    try {
      const results = await community.initCommunity(sock, ctx.senderJid);

      let report = '🕸️ *DARK🕸️VILLE — COMUNIDADE CRIADA!*\n\n';
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      for (const r of results) {
        report += r.ok ? `✅ ${r.name}\n` : `❌ ${r.type}: ${r.error}\n`;
      }
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      report += '👑 *Você é ADM em todos os grupos!*\n';
      report += '🏰 *Clãs são independentes — líderes comandam.*\n\n';
      report += '🎮 *Próximos passos:*\n';
      report += '• !darkrpg-test — Testar tudo\n';
      report += '• !addglb — Adicionar todos os usuários\n';
      report += '• !criaclan <nome> — Criar um clã';

      await sock.sendMessage(ctx.remoteJid, { text: report }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return tReply(sock, msg, ctx, '❌ Erro', [e.message]);
    }
  }, true);

  // ═══ TESTAR DARKRPG ═══
  registerCase(['darkrpg-test', 'rpgtest'], async ({ sock, msg, ctx, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🚫 Acesso', ['Só o dono.']);

    let report = '🧪 *TESTE DARKRPG*\n\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    // Testa grupos
    report += '🏰 *Grupos:*\n';
    for (const [type, def] of Object.entries(community.COMMUNITY_GROUPS)) {
      const jid = community._groupCache.get(type);
      report += jid ? `  ✅ ${def.name}\n` : `  ❌ ${def.name} (não criado)\n`;
    }

    // Testa clãs
    report += '\n🏰 *Clãs:*\n';
    if (community._clanGroups.size === 0) {
      report += '  Nenhum clã criado ainda.\n';
    } else {
      for (const [name, clan] of community._clanGroups.entries()) {
        report += `  ✅ ${name} → ${clan.jid}\n`;
      }
    }

    // Testa banco de dados
    report += '\n📊 *Banco de dados:*\n';
    try {
      const RPGPlayer = require('../database/models/RPGPlayer');
      const count = await RPGPlayer.countDocuments();
      report += `  ✅ ${count} jogadores registrados\n`;
    } catch (e) {
      report += `  ❌ Erro: ${e.message}\n`;
    }

    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '✅ *Tudo pronto para !addglb!*';

    return sock.sendMessage(ctx.remoteJid, { text: report }, { quoted: msg });
  }, true);

  // ═══ STATUS DARKRPG ═══
  registerCase(['darkrpg-status', 'rpgstatus'], async ({ sock, msg, ctx, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🚫 Acesso', ['Só o dono.']);

    let status = '📊 *STATUS DARK🕸️VILLE*\n\n';
    status += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    for (const [type, def] of Object.entries(community.COMMUNITY_GROUPS)) {
      const jid = community._groupCache.get(type);
      status += jid ? `✅ ${def.name}\n   └ ${jid}\n` : `❌ ${def.name}\n   └ Não criado\n`;
    }

    status += '\n🏰 *Clãs:*\n';
    if (community._clanGroups.size === 0) {
      status += '  Nenhum clã criado ainda.\n';
    } else {
      for (const [name, clan] of community._clanGroups.entries()) {
        status += `  🏰 ${name}\n   └ Líder: ${clan.leaderJid.split('@')[0]}\n`;
      }
    }

    status += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    return sock.sendMessage(ctx.remoteJid, { text: status }, { quoted: msg });
  }, true);

  // ═══ ADDGLB — ADICIONAR TODOS OS USERS DO DASHBOARD ═══
  registerCase(['addglb', 'addglobal'], async ({ sock, msg, ctx, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🚫 Acesso', ['Só o dono.']);

    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const results = await community.addAllUsersToGroups(sock, ctx.senderJid);

      let report = '📤 *ADDGLB — DARK🕸️VILLE*\n\n';
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      report += `✅ Adicionados: ${results.added.length}\n`;
      report += `📩 Convites enviados: ${results.invited.length}\n`;
      report += `❌ Erros: ${results.errors.length}\n`;
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

      if (results.added.length > 0) {
        report += '\n✅ *Adicionados:*\n';
        for (const r of results.added.slice(0, 10)) {
          report += `  • ${r.user} → ${r.group}\n`;
        }
        if (results.added.length > 10) report += `  ... +${results.added.length - 10} mais\n`;
      }

      if (results.invited.length > 0) {
        report += '\n📩 *Convites enviados:*\n';
        for (const r of results.invited.slice(0, 10)) {
          report += `  • ${r.user} → ${r.group}\n`;
        }
        if (results.invited.length > 10) report += `  ... +${results.invited.length - 10} mais\n`;
      }

      await sock.sendMessage(ctx.remoteJid, { text: report }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return tReply(sock, msg, ctx, '❌ Erro', [e.message]);
    }
  }, true);

  // ═══ CRIAR CLÃ ═══
  registerCase(['criaclan', 'criaclã', 'newclan'], async ({ sock, msg, ctx, args }) => {
    const clanName = args.join(' ').trim();
    if (!clanName) return tReply(sock, msg, ctx, '❌ Uso', ['!criaclan <nome do clã>']);

    const p = await rpg.getPlayer(ctx.senderNumber);
    if (p.coins < 5000) return tReply(sock, msg, ctx, '❌ Berries', ['Precisas de 5000 berries para criar um clã.']);

    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const result = await community.createClanGroup(sock, clanName, ctx.senderJid);

      if (result.ok) {
        p.coins -= 5000;
        p.guild = clanName;
        p.title = 'Líder do Clã';
        await rpg.savePlayer(p);

        let msg_text = '🏰 *CLÃ CRIADO COM SUCESSO!*\n\n';
        msg_text += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        msg_text += '📛 Nome: *' + clanName + '*\n';
        msg_text += '👑 Líder: @' + ctx.senderJid.split('@')[0] + '\n';
        msg_text += '🔗 Grupo: ' + result.name + '\n';
        msg_text += '💰 Custo: 5000 berries\n';
        msg_text += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        msg_text += '👑 *O líder foi promovido a admin do grupo do clã!*\n';
        msg_text += '📤 *Use !addclan @user para adicionar membros.*';

        await sock.sendMessage(ctx.remoteJid, { text: msg_text, mentions: [ctx.senderJid] }, { quoted: msg });
        await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
      } else {
        await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
        return tReply(sock, msg, ctx, '❌ Erro', [result.error]);
      }
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return tReply(sock, msg, ctx, '❌ Erro', [e.message]);
    }
  }, true);

  // ═══ MENU DARKRPG ═══
  registerCase(['menu-rpg', 'menurpg', 'rpgmenu'], async ({ sock, msg, ctx, prefix }) => {
    const p = prefix || '!';

    return sock.sendMessage(ctx.remoteJid, {
      text: `🕸️━━━━━━━━━━━━━━━━━━━━━━━🕸️
  *DARK🕸️VILLE — MENU RPG*
🕸️━━━━━━━━━━━━━━━━━━━━━━━🕸️

🏰 *COMUNIDADE:*
  ${p}darkrpg — Iniciar comunidade
  ${p}darkrpg-test — Testar tudo
  ${p}darkrpg-status — Ver status
  ${p}addglb — Adicionar todos
  ${p}criaclan <nome> — Criar clã

🎭 *PERSONAGEM:*
  ${p}despertar — Inicie sua jornada
  ${p}perfil — Veja seus status
  ${p}nome <nome> — Mude seu nome
  ${p}racas — Veja as 6 origens

⚔️ *BATALHA:*
  ${p}arena — Entrar na Arena
  ${p}dungeon — Entrar nas Dungeons
  ${p}lutar — Combate PvE
  ${p}x1 @user — Duelo PvP

🃏 *COLEÇÃO:*
  ${p}gacha — Invocar cartas
  ${p}cartas — Ver álbum
  ${p}loja — Comprar itens
  ${p}forja — Refinar armas

🏰 *SOCIAL:*
  ${p}guilda — Ver seu clã
  ${p}raid — Boss mundial
  ${p}mercado — Compra/venda
  ${p}ranking — Leaderboard

🕸️━━━━━━━━━━━━━━━━━━━━━━━🕸️`
    }, { quoted: msg });
  }, true);
};
