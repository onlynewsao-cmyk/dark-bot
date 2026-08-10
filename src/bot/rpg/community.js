/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — DARKRPG Community System                     ║
 * ║   O bot cria e gere TODA a comunidade RPG automaticamente    ║
 * ║                                                               ║
 * ║   Grupos: Arena, Trocas, Dungeons, Clãs, Cavernas,          ║
 * ║           Lazer, Arsenal da Fama                             ║
 * ║                                                               ║
 * ║   O bot é admin em TODOS os grupos e modera tudo.            ║
 * ║   Líderes de clã são admins do grupo do seu clã.             ║
 * ║   O dono supremo tem modo Deus.                              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config = require('../config');
const rpg = require('./rpg/engine');

// ══════════════════════════════════════════════════════════════
// GRUPOS DA COMUNIDADE DARKRPG
// ══════════════════════════════════════════════════════════════
const COMMUNITY_GROUPS = {
  arena: {
    name: '⚔️ Arena DARKRPG',
    desc: 'Batalhas PvP 1x1 e torneios. O bot é o juiz.',
    icon: null,
    rules: 'Duelos com aposta mínima 100 berries. O bot decide o vencedor.',
  },
  trocas: {
    name: '🏪 Ville de Trocas',
    desc: 'Mercado livre de itens, cartas e armas.',
    icon: null,
    rules: 'Preço mínimo 50 berries. Sem scam.',
  },
  dungeons: {
    name: '🕳️ Dungeons DARKRPG',
    desc: 'Portais PvE, bosses, exploração.',
    icon: null,
    rules: 'Use !portal para entrar. Drops automáticos.',
  },
  cavernas: {
    name: '🦇 Cavernas',
    desc: 'Exploração, mineração, pesca, coleta.',
    icon: null,
    rules: 'Recursos respawn a cada 30 minutos.',
  },
  lazer: {
    name: '😂 Lazer & Memes',
    desc: 'Zoeira, memes, diversão.',
    icon: null,
    rules: 'Sem spam. Sem conteúdo 18+.',
  },
  arsenal: {
    name: '⚔️ Arsenal da Fama',
    desc: 'Rankings, conquistas, top jogadores.',
    icon: null,
    rules: 'Rankings atualizados automaticamente.',
  },
};

// ══════════════════════════════════════════════════════════════
// CACHE DE GRUPOS CRIADOS
// ══════════════════════════════════════════════════════════════
const _groupCache = new Map(); // groupName → groupJid
const _clanGroups = new Map(); // clanName → groupJid

// ══════════════════════════════════════════════════════════════
// CRIAR GRUPO DA COMUNIDADE
// ══════════════════════════════════════════════════════════════
async function createCommunityGroup(sock, groupType, participants = []) {
  const groupDef = COMMUNITY_GROUPS[groupType];
  if (!groupDef) throw new Error('Tipo de grupo inválido: ' + groupType);

  try {
    // Cria o grupo
    const group = await sock.groupCreate(groupDef.name, participants);
    const groupJid = group.id;

    // Define descrição
    await sock.groupUpdateDescription(groupJid, groupDef.desc + '\n\n📜 Regras: ' + groupDef.rules);

    // Tenta definir ícone (se existir)
    if (groupDef.icon) {
      try {
        await sock.groupUpdatePicture(groupJid, groupDef.icon);
      } catch {}
    }

    // Cache
    _groupCache.set(groupType, groupJid);

    console.log('[DARKRPG] Grupo criado: ' + groupDef.name + ' → ' + groupJid);
    return { ok: true, jid: groupJid, name: groupDef.name };
  } catch (e) {
    console.error('[DARKRPG] Erro ao criar grupo:', e.message);
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// CRIAR GRUPO DE CLÃ
// ══════════════════════════════════════════════════════════════
async function createClanGroup(sock, clanName, leaderJid, members = []) {
  const groupName = '🏰 Clã ' + clanName;
  const desc = 'Clã ' + clanName + ' — Grupo oficial do clã.\nLíder: @' + leaderJid.split('@')[0];

  try {
    const participants = [leaderJid, ...members];
    const group = await sock.groupCreate(groupName, participants);
    const groupJid = group.id;

    // Define descrição
    await sock.groupUpdateDescription(groupJid, desc);

    // Promove o líder a admin
    await sock.groupParticipantsUpdate(groupJid, [leaderJid], 'promote');

    // Cache
    _clanGroups.set(clanName, groupJid);

    console.log('[DARKRPG] Clã criado: ' + clanName + ' → ' + groupJid);
    return { ok: true, jid: groupJid, name: groupName, leader: leaderJid };
  } catch (e) {
    console.error('[DARKRPG] Erro ao criar clã:', e.message);
    return { ok: false, error: e.message };
  }
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
// ADICIONAR USUÁRIO A TODOS OS GRUPOS (addglb)
// ══════════════════════════════════════════════════════════════
async function addUserToAllGroups(sock, userJid) {
  const results = [];
  for (const [type, jid] of _groupCache.entries()) {
    const r = await addUserToGroup(sock, jid, userJid);
    results.push({ group: type, ...r });
  }
  return results;
}

// ══════════════════════════════════════════════════════════════
// PROMOVER LÍDER DE CLÃ
// ══════════════════════════════════════════════════════════════
async function promoteClanLeader(sock, clanName, leaderJid) {
  const groupJid = _clanGroups.get(clanName);
  if (!groupJid) return { ok: false, error: 'Clã não encontrado' };

  try {
    await sock.groupParticipantsUpdate(groupJid, [leaderJid], 'promote');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// INICIALIZAR COMUNIDADE DARKRPG
// ══════════════════════════════════════════════════════════════
async function initCommunity(sock, ownerJid) {
  const results = [];

  // Cria todos os grupos da comunidade
  for (const [type, def] of Object.entries(COMMUNITY_GROUPS)) {
    const r = await createCommunityGroup(sock, type, [ownerJid]);
    results.push({ type, ...r });
    // Pequena pausa entre criações
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
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
  addUserToAllGroups,
  promoteClanLeader,
  initCommunity,
};
