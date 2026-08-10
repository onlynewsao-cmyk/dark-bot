/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — DARKRPG Community System v3                  ║
 * ║                                                               ║
 * ║   ADDGLB: adiciona TODOS ao grupo geral (DARK🕸️VILLE)        ║
 * ║   Os outros grupos → entram sozinhos pela comunidade         ║
 * ║   Arsenal da Fama → comunicados automáticos                  ║
 * ║   Updates a cada 4h: boas-vindas, ranks, dinheiro            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config = require('../../config');
const rpg = require('./engine');

// ══════════════════════════════════════════════════════════════
// GRUPOS DA COMUNIDADE DARK🕸️VILLE
// ══════════════════════════════════════════════════════════════
const COMMUNITY_GROUPS = {
  // ── GRUPO GERAL (todos entram aqui pelo addglb) ──
  aldeia: {
    name: 'DARK VILLE - Aldeia Central',
    desc: [
      '╔═══════════════════════════════════════╗',
      '║  🕸️ DARK🕸️VILLE — Aldeia Central       ║',
      '║  O coração da comunidade RPG           ║',
      '╠═══════════════════════════════════════╣',
      '║  🏟️ Arena — Batalhas PvP               ║',
      '║  🕳️ Dungeons — PvE e Bosses            ║',
      '║  🏪 Trocas — Mercado livre             ║',
      '║  🦇 Cavernas — Exploração              ║',
      '║  😂 Lazer — Memes e diversão           ║',
      '║  ⚔️ Arsenal — Rankings e fama           ║',
      '║  🏰 Clãs — Grupos de guildas           ║',
      '╚═══════════════════════════════════════╝',
      '',
      '📜 Use !menu-rpg para ver todos os comandos',
      '⚔️ Use !despertar para começar sua jornada',
    ].join('\n'),
    emoji: '🕸️',
    isClan: false,
    ownerAdm: true,
    isMain: true, // ← GRUPO PRINCIPAL
  },

  // ── ARENA ──
  arena: {
    name: 'Arena das Sombras',
    desc: [
      '╔═══════════════════════════════════════╗',
      '║  🏟️ Arena das Sombras ⚔️               ║',
      '║  Batalhas PvP 1x1 e Torneios           ║',
      '╠═══════════════════════════════════════╣',
      '║  • !x1 @user [aposta] — Duelo         ║',
      '║  • !arena — Torneio automático         ║',
      '║  • O DARK BOT é o juiz supremo         ║',
      '║  • AURA narra as batalhas              ║',
      '╚═══════════════════════════════════════╝',
    ].join('\n'),
    emoji: '🏟️',
    isClan: false,
    ownerAdm: true,
  },

  // ── DUNGEONS ──
  dungeons: {
    name: 'Dungeons Proibidas',
    desc: [
      '╔═══════════════════════════════════════╗',
      '║  🕳️ Dungeons Proibidas 🐉               ║',
      '║  Portais PvE, Bosses, Raids            ║',
      '╠═══════════════════════════════════════╣',
      '║  • !portal entrar — Abrir dungeon      ║',
      '║  • !raid — Boss mundial                ║',
      '║  • !lutar — Combate PvE                ║',
      '║  • Drops automáticos                   ║',
      '╚═══════════════════════════════════════╝',
    ].join('\n'),
    emoji: '🕳️',
    isClan: false,
    ownerAdm: true,
  },

  // ── TROCAS ──
  trocas: {
    name: 'Ville de Trocas',
    desc: [
      '╔═══════════════════════════════════════╗',
      '║  🏪 Ville de Trocas 💰                  ║',
      '║  Mercado livre de itens e cartas        ║',
      '╠═══════════════════════════════════════╣',
      '║  • !mercado — Ver ofertas              ║',
      '║  • !vender <item> — Anunciar           ║',
      '║  • !comprar <id> — Comprar             ║',
      '║  • !loja — Loja do sistema             ║',
      '╚═══════════════════════════════════════╝',
    ].join('\n'),
    emoji: '🏪',
    isClan: false,
    ownerAdm: true,
  },

  // ── CAVERNAS ──
  cavernas: {
    name: 'Cavernas Sombras',
    desc: [
      '╔═══════════════════════════════════════╗',
      '║  🦇 Cavernas Sombrias ⛏️                ║',
      '║  Exploração, mineração, pesca           ║',
      '╠═══════════════════════════════════════╣',
      '║  • !explorar — Explorar biomas         ║',
      '║  • !minerar — Minerar recursos         ║',
      '║  • !pescar — Pescar itens              ║',
      '║  • !colher — Colher plantas            ║',
      '╚═══════════════════════════════════════╝',
    ].join('\n'),
    emoji: '🦇',
    isClan: false,
    ownerAdm: true,
  },

  // ── LAZER ──
  lazer: {
    name: 'Lazer e Memes',
    desc: [
      '╔═══════════════════════════════════════╗',
      '║  😂 Lazer & Memes 🎭                    ║',
      '║  Diversão, zoeira, memes               ║',
      '╠═══════════════════════════════════════╣',
      '║  • Sem spam                            ║',
      '║  • Sem conteúdo 18+                    ║',
      '║  • Respeite os membros                 ║',
      '╚═══════════════════════════════════════╝',
    ].join('\n'),
    emoji: '😂',
    isClan: false,
    ownerAdm: true,
  },

  // ── ARSENAL DA FAMA ──
  arsenal: {
    name: 'Arsenal da Fama',
    desc: [
      '╔═══════════════════════════════════════╗',
      '║  ⚔️ Arsenal da Fama 🏆                  ║',
      '║  Rankings, conquistas, comunicados      ║',
      '╠═══════════════════════════════════════╣',
      '║  • Rankings atualizados a cada 4h      ║',
      '║  • Top nível, kills, berries, clãs     ║',
      '║  • Comunicados oficiais                ║',
      '║  • Conquistas e achievements           ║',
      '╚═══════════════════════════════════════╝',
    ].join('\n'),
    emoji: '⚔️',
    isClan: false,
    ownerAdm: true,
  },
};

// ══════════════════════════════════════════════════════════════
// CONVITE PERSONALIZADO RPG
// ══════════════════════════════════════════════════════════════
function generateInviteMessage(userName) {
  const greetings = [
    '⚔️ *' + userName + '!*',
    '🏰 *' + userName + ', a Aldeia te chama!*',
    '🕸️ *' + userName + ', há um portal aberto para ti!*',
  ];

  const bodies = [
    'A comunidade *DARK🕸️VILLE* está ativa e há vagas para aventureiros.\n\nSe quiseres entrar, é só aceitar o convite. Sem pressão — a escolha é tua. 🎮',
    'O mundo do *DARKRPG* expandiu! A *Aldeia Central* está ativa e há espaço para ti.\n\nSe tiveres interesse, o convite está aqui. 🗡️',
    'Novidades na *DARK🕸️VILLE*! A comunidade cresceu e precisamos de mais guerreiros.\n\nAceita quando quiseres. ⚔️',
  ];

  const closings = [
    '🎮 *Use !menu-rpg para ver os comandos*\n⚔️ *Use !despertar para começar*',
    '🏰 *A jornada espera por ti!*\n⚔️ *!despertar* para iniciar',
    '🕸️ *O DARK te aguarda!*\n⚔️ *!despertar* para começar a aventura',
  ];

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  return greeting + '\n\n' + body + '\n\n' + closing;
}

// ══════════════════════════════════════════════════════════════
// CACHE
// ══════════════════════════════════════════════════════════════
const _groupCache = new Map(); // groupType → groupJid
const _clanGroups = new Map(); // clanName → { jid, leaderJid }

// ══════════════════════════════════════════════════════════════
// CRIAR GRUPO DA COMUNIDADE
// ══════════════════════════════════════════════════════════════
async function createCommunityGroup(sock, groupType, ownerJid) {
  const groupDef = COMMUNITY_GROUPS[groupType];
  if (!groupDef) throw new Error('Tipo de grupo inválido: ' + groupType);

  // Retry logic (max 3 tentativas)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const group = await sock.groupCreate(groupDef.name, [ownerJid]);
      const groupJid = group.id;

      // Define descrição (com delay)
      await new Promise(r => setTimeout(r, 2000));
      try {
        await sock.groupUpdateDescription(groupJid, groupDef.desc);
      } catch {}

      // Promove o owner a admin (com delay)
      if (groupDef.ownerAdm) {
        await new Promise(r => setTimeout(r, 1000));
        try {
          await sock.groupParticipantsUpdate(groupJid, [ownerJid], 'promote');
        } catch {}
      }

      // Cache
      _groupCache.set(groupType, groupJid);

      console.log('[DARKRPG] Grupo criado: ' + groupDef.name + ' → ' + groupJid);
      return { ok: true, jid: groupJid, name: groupDef.name };
    } catch (e) {
      console.error('[DARKRPG] Tentativa ' + attempt + ' falhou para ' + groupDef.name + ': ' + e.message);
      
      // Se rate-overlimit, espera mais
      if (e.message?.includes('rate-overlimit') || e.message?.includes('429')) {
        await new Promise(r => setTimeout(r, 15000)); // espera 15s
      } else if (attempt < 3) {
        await new Promise(r => setTimeout(r, 5000)); // espera 5s
      }
    }
  }
  
  return { ok: false, error: 'Falhou após 3 tentativas' };
}

// ══════════════════════════════════════════════════════════════
// CRIAR GRUPO DE CLÃ (SEM emojis extras, SEM owner como adm)
// ══════════════════════════════════════════════════════════════
async function createClanGroup(sock, clanName, leaderJid, members = []) {
  const groupName = '🏰 Clã ' + clanName;
  const desc = '🏰 Clã ' + clanName + '\n👑 Líder: ' + leaderJid.split('@')[0];

  try {
    const participants = [leaderJid, ...members];
    const group = await sock.groupCreate(groupName, participants);
    const groupJid = group.id;

    await sock.groupUpdateDescription(groupJid, desc);
    await sock.groupParticipantsUpdate(groupJid, [leaderJid], 'promote');

    _clanGroups.set(clanName, { jid: groupJid, leaderJid });

    console.log('[DARKRPG] Clã criado: ' + clanName + ' → ' + groupJid);
    return { ok: true, jid: groupJid, name: groupName, leader: leaderJid };
  } catch (e) {
    console.error('[DARKRPG] Erro ao criar clã:', e.message);
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// ADDGLB — ADICIONA TODOS AO GRUPO GERAL (DARK🕸️VILLE)
// Os outros grupos → entram sozinhos pela comunidade
// ══════════════════════════════════════════════════════════════
async function addAllUsersToMainGroup(sock, ownerJid) {
  const User = require('../../database/models/User');
  const results = { added: [], invited: [], errors: [] };

  // Busca todos os usuários do dashboard
  let users = [];
  try {
    users = await User.find({ active: { $ne: false } }).lean();
  } catch (e) {
    results.errors.push('Erro ao buscar usuários: ' + e.message);
    return results;
  }

  if (!users.length) {
    results.errors.push('Nenhum usuário encontrado no dashboard.');
    return results;
  }

  // Pega o grupo principal (DARK🕸️VILLE)
  const mainGroupJid = _groupCache.get('aldeia');
  if (!mainGroupJid) {
    results.errors.push('Grupo principal não encontrado. Use !darkrpg primeiro.');
    return results;
  }

  // Adiciona TODOS ao grupo principal
  for (const user of users) {
    const userJid = user.whatsappNumber + '@s.whatsapp.net';

    // Pula o owner
    if (userJid === ownerJid) continue;

    try {
      const addResult = await addUserToGroup(sock, mainGroupJid, userJid);
      if (addResult.ok) {
        results.added.push({ user: user.name || user.whatsappNumber });
      } else {
        // Se não conseguir adicionar, envia convite personalizado
        try {
          const inviteMsg = generateInviteMessage(user.name || 'Aventureiro');
          await sock.sendMessage(userJid, { text: inviteMsg });
          results.invited.push({ user: user.name || user.whatsappNumber });
        } catch (e2) {
          results.errors.push((user.name || user.whatsappNumber) + ': ' + e2.message);
        }
      }
    } catch (e) {
      results.errors.push((user.name || user.whatsappNumber) + ': ' + e.message);
    }

    // Pausa para não floodar
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
// ADICIONAR USUÁRIO A GRUPO
// ══════════════════════════════════════════════════════════════
async function addUserToGroup(sock, groupJid, userJid) {
  try {
    await sock.groupParticipantsUpdate(groupJid, [userJid], 'add');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// REMOVER USUÁRIO DE GRUPO
// ══════════════════════════════════════════════════════════════
async function removeUserFromGroup(sock, groupJid, userJid) {
  try {
    await sock.groupParticipantsUpdate(groupJid, [userJid], 'remove');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// PROMOVER LÍDER DE CLÃ
// ══════════════════════════════════════════════════════════════
async function promoteClanLeader(sock, clanName, leaderJid) {
  const clan = _clanGroups.get(clanName);
  if (!clan) return { ok: false, error: 'Clã não encontrado' };

  try {
    await sock.groupParticipantsUpdate(clan.jid, [leaderJid], 'promote');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// INICIALIZAR COMUNIDADE DARK🕸️VILLE
// ══════════════════════════════════════════════════════════════
async function initCommunity(sock, ownerJid) {
  const results = [];

  for (const [type, def] of Object.entries(COMMUNITY_GROUPS)) {
    const r = await createCommunityGroup(sock, type, ownerJid);
    results.push({ type, ...r });
    await new Promise(resolve => setTimeout(resolve, 8000));
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
// COMUNICADOS AUTOMÁTICOS (a cada 4h)
// ══════════════════════════════════════════════════════════════
async function generateDailyReport() {
  const RPGPlayer = require('../../database/models/RPGPlayer');

  let report = '⚔️ *COMUNICADO DARK🕸️VILLE* ⚔️\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Top nível
  try {
    const topLevel = await RPGPlayer.find().sort({ level: -1 }).limit(5).lean();
    if (topLevel.length) {
      report += '🏆 *TOP NÍVEL:*\n';
      const medals = ['🥇', '🥈', '🥉'];
      topLevel.forEach((p, i) => {
        const medal = medals[i] || (i + 1) + '.';
        const rank = rpg.getRank(p.level);
        report += medal + ' ' + rank.emoji + ' *' + p.name + '* — Nv.' + p.level + '\n';
      });
      report += '\n';
    }
  } catch {}

  // Top berries
  try {
    const topBerries = await RPGPlayer.find().sort({ coins: -1 }).limit(5).lean();
    if (topBerries.length) {
      report += '💰 *TOP BERRIES:*\n';
      const medals = ['🥇', '🥈', '🥉'];
      topBerries.forEach((p, i) => {
        const medal = medals[i] || (i + 1) + '.';
        report += medal + ' *' + p.name + '* — ' + (p.coins || 0).toLocaleString() + ' berries\n';
      });
      report += '\n';
    }
  } catch {}

  // Top kills
  try {
    const topKills = await RPGPlayer.find().sort({ kills: -1 }).limit(5).lean();
    if (topKills.length) {
      report += '⚔️ *TOP KILLS:*\n';
      const medals = ['🥇', '🥈', '🥉'];
      topKills.forEach((p, i) => {
        const medal = medals[i] || (i + 1) + '.';
        report += medal + ' *' + p.name + '* — ' + (p.kills || 0) + ' kills\n';
      });
      report += '\n';
    }
  } catch {}

  // Clãs
  report += '🏰 *CLÃS ATIVOS:*\n';
  if (_clanGroups.size === 0) {
    report += '  Nenhum clã criado ainda.\n';
  } else {
    for (const [name, clan] of _clanGroups.entries()) {
      report += '  🏰 *' + name + '* — Líder: @' + clan.leaderJid.split('@')[0] + '\n';
    }
  }

  report += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += '🕸️ *DARK🕸️VILLE — A comunidade cresce!*';

  return report;
}

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════
module.exports = {
  COMMUNITY_GROUPS,
  _groupCache,
  _clanGroups,
  createCommunityGroup,
  createClanGroup,
  addUserToGroup,
  removeUserFromGroup,
  addAllUsersToMainGroup,
  promoteClanLeader,
  initCommunity,
  generateInviteMessage,
  generateDailyReport,
};
