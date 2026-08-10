/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — DARKRPG Community System v4                  ║
 * ║   Cria COMUNIDADE do WhatsApp + grupos dentro dela            ║
 * ║                                                               ║
 * ║   1. Cria a comunidade DARK🕸️VILLE                           ║
 * ║   2. Cria grupos DENTRO da comunidade                        ║
 * ║   3. Owner é ADM em todos (menos clãs)                       ║
 * ║   4. addglb busca users do dashboard + convite               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config = require('../../config');
const rpg = require('./engine');

// ══════════════════════════════════════════════════════════════
// GRUPOS DA COMUNIDADE DARK🕸️VILLE
// ══════════════════════════════════════════════════════════════
const COMMUNITY_GROUPS = {
  arena: {
    name: 'Arena das Sombras',
    desc: 'Batalhas PvP 1x1 e Torneios. O bot é o juiz.',
    emoji: '🏟️',
    isClan: false,
    ownerAdm: true,
  },
  dungeons: {
    name: 'Dungeons Proibidas',
    desc: 'Portais PvE, Bosses, Raids.',
    emoji: '🕳️',
    isClan: false,
    ownerAdm: true,
  },
  trocas: {
    name: 'Ville de Trocas',
    desc: 'Mercado livre de itens, cartas e armas.',
    emoji: '🏪',
    isClan: false,
    ownerAdm: true,
  },
  cavernas: {
    name: 'Cavernas Sombras',
    desc: 'Exploração, mineração, pesca, coleta.',
    emoji: '🦇',
    isClan: false,
    ownerAdm: true,
  },
  lazer: {
    name: 'Lazer e Memes',
    desc: 'Diversão, zoeira, memes.',
    emoji: '😂',
    isClan: false,
    ownerAdm: true,
  },
  arsenal: {
    name: 'Arsenal da Fama',
    desc: 'Rankings, conquistas, comunicados.',
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
const _communityJid = null; // JID da comunidade
const _groupCache = new Map(); // groupType → groupJid
const _clanGroups = new Map(); // clanName → { jid, leaderJid }

// ══════════════════════════════════════════════════════════════
// CRIAR COMUNIDADE DO WHATSAPP
// ══════════════════════════════════════════════════════════════
async function createWhatsAppCommunity(sock, ownerJid) {
  try {
    console.log('[DARKRPG] Criando comunidade DARK🕸️VILLE...');
    
    // Cria a comunidade
    const community = await sock.communityCreate(
      'DARK🕸️VILLE',
      'Comunidade oficial DARKRPG — Batalhas, Rankings, Eventos, Clãs'
    );
    
    if (community && community.id) {
      console.log('[DARKRPG] Comunidade criada: ' + community.id);
      return { ok: true, jid: community.id, name: 'DARK🕸️VILLE' };
    }
    
    return { ok: false, error: 'Não foi possível criar a comunidade' };
  } catch (e) {
    console.error('[DARKRPG] Erro ao criar comunidade:', e.message);
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// CRIAR GRUPO DENTRO DA COMUNIDADE
// ══════════════════════════════════════════════════════════════
async function createGroupInCommunity(sock, groupType, ownerJid, communityJid) {
  const groupDef = COMMUNITY_GROUPS[groupType];
  if (!groupDef) throw new Error('Tipo de grupo inválido: ' + groupType);

  // Retry logic
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let group;
      
      if (communityJid) {
        // Cria grupo DENTRO da comunidade
        console.log('[DARKRPG] Criando grupo dentro da comunidade: ' + groupDef.name);
        group = await sock.communityCreateGroup(groupDef.name, [ownerJid], communityJid);
      } else {
        // Cria grupo normal (fallback)
        console.log('[DARKRPG] Criando grupo normal: ' + groupDef.name);
        group = await sock.groupCreate(groupDef.name, [ownerJid]);
      }
      
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
      
      if (e.message?.includes('rate-overlimit') || e.message?.includes('429')) {
        await new Promise(r => setTimeout(r, 15000));
      } else if (attempt < 3) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  
  return { ok: false, error: 'Falhou após 3 tentativas' };
}

// ══════════════════════════════════════════════════════════════
// CRIAR GRUPO DE CLÃ (SEM emojis extras, SEM owner como adm)
// ══════════════════════════════════════════════════════════════
async function createClanGroup(sock, clanName, leaderJid, members = []) {
  const groupName = 'Clã ' + clanName;
  const desc = 'Clã ' + clanName + '\nLíder: ' + leaderJid.split('@')[0];

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
// ADDGLB — ADICIONA TODOS AO GRUPO GERAL
// ══════════════════════════════════════════════════════════════
async function addAllUsersToMainGroup(sock, ownerJid) {
  const User = require('../../database/models/User');
  const results = { added: [], invited: [], errors: [] };

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

  const mainGroupJid = _groupCache.get('aldeia');
  if (!mainGroupJid) {
    results.errors.push('Grupo principal não encontrado. Use !darkrpg primeiro.');
    return results;
  }

  for (const user of users) {
    const userJid = user.whatsappNumber + '@s.whatsapp.net';
    if (userJid === ownerJid) continue;

    try {
      const addResult = await addUserToGroup(sock, mainGroupJid, userJid);
      if (addResult.ok) {
        results.added.push({ user: user.name || user.whatsappNumber });
      } else {
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

  // 1. Cria a comunidade
  const communityResult = await createWhatsAppCommunity(sock, ownerJid);
  results.push({ type: 'community', ...communityResult });

  const communityJid = communityResult.ok ? communityResult.jid : null;

  // 2. Cria os grupos dentro da comunidade
  for (const [type, def] of Object.entries(COMMUNITY_GROUPS)) {
    const r = await createGroupInCommunity(sock, type, ownerJid, communityJid);
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
  createWhatsAppCommunity,
  createGroupInCommunity,
  createClanGroup,
  addUserToGroup,
  removeUserFromGroup,
  addAllUsersToMainGroup,
  promoteClanLeader,
  initCommunity,
  generateInviteMessage,
  generateDailyReport,
};
