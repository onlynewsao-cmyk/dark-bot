/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — DARKRPG Community Commands                   ║
 * ║   Comandos para criar e gerir a comunidade RPG               ║
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
      // Cria todos os grupos
      const results = await community.initCommunity(sock, ctx.senderJid);

      let report = '🚀 *DARKRPG INICIADO!*\n\n';
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      for (const r of results) {
        report += r.ok ? `✅ ${r.name}\n` : `❌ ${r.type}: ${r.error}\n`;
      }
      report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      report += '🎮 *Próximos passos:*\n';
      report += '• Use !darkrpg status para ver os grupos\n';
      report += '• Use !addglb @user para adicionar alguém em todos\n';
      report += '• Use !criaclan <nome> para criar um clã';

      await sock.sendMessage(ctx.remoteJid, { text: report }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return tReply(sock, msg, ctx, '❌ Erro', [e.message]);
    }
  }, true);

  // ═══ STATUS DARKRPG ═══
  registerCase(['darkrpg-status', 'rpgstatus'], async ({ sock, msg, ctx, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🚫 Acesso', ['Só o dono.']);

    let status = '📊 *STATUS DARKRPG*\n\n';
    status += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    for (const [type, def] of Object.entries(community.COMMUNITY_GROUPS)) {
      const jid = community._groupCache.get(type);
      status += jid ? `✅ ${def.name}\n   └ JID: ${jid}\n` : `❌ ${def.name}\n   └ Não criado\n`;
    }

    status += '\n🏰 *Clãs:*\n';
    if (community._clanGroups.size === 0) {
      status += '  Nenhum clã criado ainda.\n';
    } else {
      for (const [name, jid] of community._clanGroups.entries()) {
        status += `  🏰 ${name} → ${jid}\n`;
      }
    }

    status += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    return sock.sendMessage(ctx.remoteJid, { text: status }, { quoted: msg });
  }, true);

  // ═══ ADDGLB — ADICIONAR USUÁRIO A TODOS OS GRUPOS ═══
  registerCase(['addglb', 'addglobal'], async ({ sock, msg, ctx, args, isOwner }) => {
    if (!isOwner) return tReply(sock, msg, ctx, '🚫 Acesso', ['Só o dono.']);

    const mentionJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentionJid) return tReply(sock, msg, ctx, '❌ Uso', ['Marca um usuário: !addglb @user']);

    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const results = await community.addUserToAllGroups(sock, mentionJid);
      let report = `📤 *Adicionando @${mentionJid.split('@')[0]} a todos os grupos:*\n\n`;
      for (const r of results) {
        report += r.ok ? `✅ ${r.group}\n` : `❌ ${r.group}: ${r.error}\n`;
      }
      await sock.sendMessage(ctx.remoteJid, { text: report, mentions: [mentionJid] }, { quoted: msg });
      await sock.sendMessage(ctx.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(ctx.remoteJid, { react: { text: '❌', key: msg.key } });
      return tReply(sock, msg, ctx, '❌ Erro', [e.message]);
    }
  }, true);

  // ═══ CRIAR CLÃ ═══
  registerCase(['criaclan', 'criaclã', 'newclan'], async ({ sock, msg, ctx, args, isOwner }) => {
    const clanName = args.join(' ').trim();
    if (!clanName) return tReply(sock, msg, ctx, '❌ Uso', ['!criaclan <nome do clã>']);

    const p = await rpg.getPlayer(ctx.senderNumber);
    if (p.coins < 5000) return tReply(sock, msg, ctx, '❌ Berries', ['Precisas de 5000 berries para criar um clã.']);

    await sock.sendMessage(ctx.remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      // Cria o grupo do clã
      const result = await community.createClanGroup(sock, clanName, ctx.senderJid);

      if (result.ok) {
        // Deduz berries
        p.coins -= 5000;
        p.guild = clanName;
        p.title = 'Líder do Clã';
        await rpg.savePlayer(p);

        let msg_text = `🏰 *CLÃ CRIADO COM SUCESSO!*\n\n`;
        msg_text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        msg_text += `📛 Nome: *${clanName}*\n`;
        msg_text += `👑 Líder: @${ctx.senderJid.split('@')[0]}\n`;
        msg_text += `🔗 Grupo: ${result.name}\n`;
        msg_text += `💰 Custo: 5000 berries\n`;
        msg_text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        msg_text += `👑 *O líder foi promovido a admin do grupo do clã!*\n`;
        msg_text += `📤 *Use !addclan @user para adicionar membros.*`;

        await sock.sendMessage(ctx.remoteJid, {
          text: msg_text,
          mentions: [ctx.senderJid]
        }, { quoted: msg });
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

  // ═══ ENTRAR NA ARENA ═══
  registerCase(['arena', 'entrar-arena'], async ({ sock, msg, ctx, args, isOwner }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    if (!p.character) return tReply(sock, msg, ctx, '❌ Personagem', ['Use !despertar primeiro.']);

    const arenaJid = community._groupCache.get('arena');
    if (!arenaJid) return tReply(sock, msg, ctx, '❌ Arena', ['A arena não foi criada. Use !darkrpg primeiro.']);

    await sock.sendMessage(ctx.remoteJid, { react: { text: '⚔️', key: msg.key } });

    try {
      // Adiciona o usuário ao grupo da arena
      const result = await community.addUserToGroup(sock, arenaJid, ctx.senderJid);
      if (result.ok) {
        return tReply(sock, msg, ctx, '⚔️ Arena', ['✅ Você entrou na Arena!']);
      } else {
        return tReply(sock, msg, ctx, '❌ Erro', [result.error]);
      }
    } catch (e) {
      return tReply(sock, msg, ctx, '❌ Erro', [e.message]);
    }
  }, true);

  // ═══ ENTRAR NAS DUNGEONS ═══
  registerCase(['dungeon', 'entrar-dungeon'], async ({ sock, msg, ctx, args, isOwner }) => {
    const p = await rpg.getPlayer(ctx.senderNumber);
    if (!p.character) return tReply(sock, msg, ctx, '❌ Personagem', ['Use !despertar primeiro.']);

    const dungeonJid = community._groupCache.get('dungeons');
    if (!dungeonJid) return tReply(sock, msg, ctx, '❌ Dungeon', ['As dungeons não foram criadas. Use !darkrpg primeiro.']);

    await sock.sendMessage(ctx.remoteJid, { react: { text: '🕳️', key: msg.key } });

    try {
      const result = await community.addUserToGroup(sock, dungeonJid, ctx.senderJid);
      if (result.ok) {
        return tReply(sock, msg, ctx, '🕳️ Dungeon', ['✅ Você entrou nas Dungeons!']);
      } else {
        return tReply(sock, msg, ctx, '❌ Erro', [result.error]);
      }
    } catch (e) {
      return tReply(sock, msg, ctx, '❌ Erro', [e.message]);
    }
  }, true);

  // ═══ ENTRAR NA VILLE DE TROCAS ═══
  registerCase(['trocas', 'mercado-grupo'], async ({ sock, msg, ctx, args, isOwner }) => {
    const trocasJid = community._groupCache.get('trocas');
    if (!trocasJid) return tReply(sock, msg, ctx, '❌ Trocas', ['A Ville de Trocas não foi criada.']);

    try {
      const result = await community.addUserToGroup(sock, trocasJid, ctx.senderJid);
      if (result.ok) {
        return tReply(sock, msg, ctx, '🏪 Trocas', ['✅ Você entrou na Ville de Trocas!']);
      } else {
        return tReply(sock, msg, ctx, '❌ Erro', [result.error]);
      }
    } catch (e) {
      return tReply(sock, msg, ctx, '❌ Erro', [e.message]);
    }
  }, true);

  // ═══ MENU DARKRPG ═══
  registerCase(['menu-rpg', 'menurpg', 'rpgmenu'], async ({ sock, msg, ctx, prefix }) => {
    const p = prefix || '!';

    return sock.sendMessage(ctx.remoteJid, {
      text: `━━━ ⚔️ *MENU DARKRPG* ⚔️ ━━━

🏰 *COMUNIDADE:*
• ${p}darkrpg — Iniciar a comunidade
• ${p}darkrpg-status — Ver status dos grupos
• ${p}addglb @user — Adicionar em todos os grupos

🎭 *PERSONAGEM:*
• ${p}despertar — Inicie sua jornada
• ${p}perfil — Veja seus status
• ${p}nome <nome> — Mude seu nome

⚔️ *BATALHA:*
• ${p}arena — Entrar na Arena
• ${p}dungeon — Entrar nas Dungeons
• ${p}lutar — Combate PvE
• ${p}x1 @user — Duelo PvP

🏰 *CLÃS:*
• ${p}criaclan <nome> — Criar um clã
• ${p}guilda — Ver seu clã
• ${p}addclan @user — Adicionar ao clã

🏪 *ECONOMIA:*
• ${p}trocas — Entrar na Ville de Trocas
• ${p}loja — Comprar itens
• ${p}forja — Refinar armas
• ${p}gacha — Invocar cartas

📊 *RANKINGS:*
• ${p}ranking — Leaderboard
• ${p}top — Top jogadores

🎭 *AURA:*
• ${p}aura on — Ativar AURA no grupo
• ${p}auramod batalha — AURA modera batalhas`
    }, { quoted: msg });
  }, true);
};
