/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — DARKRPG Community System v5 FINAL           ║
 * ║   Cria COMUNIDADE do WhatsApp + grupos dentro dela            ║
 * ║   Usa API oficial do Baileys: communityCreate, communityCreateGroup ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config = require('../../config');
const rpg = require('./engine');

// ══════════════════════════════════════════════════════════════
// GRUPOS DA COMUNIDADE
// ══════════════════════════════════════════════════════════════
const COMMUNITY_GROUPS = {
  arena: {
    name: 'Arena das Sombras',
    desc: 'Batalhas PvP 1x1 e Torneios. O bot e o juiz.',
    emoji: '⚔️',
    ownerAdm: true,
  },
  dungeons: {
    name: 'Dungeons Proibidas',
    desc: 'Portais PvE, Bosses, Raids.',
    emoji: '🐉',
    ownerAdm: true,
  },
  trocas: {
    name: 'Ville de Trocas',
    desc: 'Mercado livre de itens, cartas e armas.',
    emoji: '💰',
    ownerAdm: true,
  },
  cavernas: {
    name: 'Cavernas Sombras',
    desc: 'Exploracao, mineracao, pesca, coleta.',
    emoji: '⛏️',
    ownerAdm: true,
  },
  lazer: {
    name: 'Lazer e Memes',
    desc: 'Diversao, zoeira, memes.',
    emoji: '😂',
    ownerAdm: true,
  },
  arsenal: {
    name: 'Arsenal da Fama',
    desc: 'Rankings, conquistas, comunicados.',
    emoji: '🏆',
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
  ];
  const bodies = [
    'A comunidade *DARK VILLE* esta ativa e ha vagas para aventureiros.\n\nSe quiseres entrar, e so aceitar o convite. Sem pressao — a escolha e tua.',
  ];
  const closings = [
    '🎮 *Use !menu-rpg para ver os comandos*\n⚔️ *Use !despertar para comecar*',
  ];

  const g = greetings[Math.floor(Math.random() * greetings.length)];
  const b = bodies[Math.floor(Math.random() * bodies.length)];
  const c = closings[Math.floor(Math.random() * closings.length)];
  return g + '\n\n' + b + '\n\n' + c;
}

// ══════════════════════════════════════════════════════════════
// CACHE
// ══════════════════════════════════════════════════════════════
let _communityJid = null;
const _groupCache = new Map();
const _clanGroups = new Map();

// ══════════════════════════════════════════════════════════════
// 1. CRIAR COMUNIDADE DO WHATSAPP
// ══════════════════════════════════════════════════════════════
async function createWhatsAppCommunity(sock, ownerJid) {
  try {
    console.log('[DARKRPG] Criando comunidade DARK VILLE...');
    
    // Usa a API oficial do Baileys
    const community = await sock.communityCreate(
      'DARK VILLE',
      'Comunidade oficial DARK RPG — Batalhas, Rankings, Eventos, Clas'
    );
    
    if (community && community.id) {
      _communityJid = community.id;
      console.log('[DARKRPG] Comunidade criada: ' + community.id);
      return { ok: true, jid: community.id, name: 'DARK VILLE' };
    }
    
    return { ok: false, error: 'Nao foi possivel criar a comunidade' };
  } catch (e) {
    console.error('[DARKRPG] Erro ao criar comunidade:', e.message);
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// 2. CRIAR GRUPO DENTRO DA COMUNIDADE
// ══════════════════════════════════════════════════════════════
async function createGroupInCommunity(sock, groupType, ownerJid, communityJid) {
  const groupDef = COMMUNITY_GROUPS[groupType];
  if (!groupDef) return { ok: false, error: 'Tipo invalido: ' + groupType };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let group;

      if (communityJid) {
        // Cria grupo DENTRO da comunidade
        console.log('[DARKRPG] Criando grupo na comunidade: ' + groupDef.name);
        group = await sock.communityCreateGroup(groupDef.name, [ownerJid], communityJid);
      } else {
        // Fallback: grupo normal
        console.log('[DARKRPG] Criando grupo normal: ' + groupDef.name);
        group = await sock.groupCreate(groupDef.name, [ownerJid]);
      }

      const groupJid = group.id;

      // Descricao
      await new Promise(r => setTimeout(r, 2000));
      try { await sock.groupUpdateDescription(groupJid, groupDef.desc); } catch {}

      // Promove owner
      if (groupDef.ownerAdm) {
        await new Promise(r => setTimeout(r, 1000));
        try { await sock.groupParticipantsUpdate(groupJid, [ownerJid], 'promote'); } catch {}
      }

      _groupCache.set(groupType, groupJid);
      console.log('[DARKRPG] Grupo criado: ' + groupDef.name + ' → ' + groupJid);
      return { ok: true, jid: groupJid, name: groupDef.name };
    } catch (e) {
      console.error('[DARKRPG] Tentativa ' + attempt + '/' + 3 + ' falhou: ' + e.message);
      const wait = e.message?.includes('rate-overlimit') ? 15000 : 5000;
      await new Promise(r => setTimeout(r, wait));
    }
  }
  return { ok: false, error: 'Falhou apos 3 tentativas' };
}

// ══════════════════════════════════════════════════════════════
// 3. CRIAR CLA (fora da comunidade)
// ══════════════════════════════════════════════════════════════
async function createClanGroup(sock, clanName, leaderJid, members = []) {
  const groupName = 'Cla ' + clanName;
  const desc = 'Cla ' + clanName + '\nLider: ' + leaderJid.split('@')[0];

  try {
    const group = await sock.groupCreate(groupName, [leaderJid, ...members]);
    const groupJid = group.id;

    await new Promise(r => setTimeout(r, 1000));
    await sock.groupUpdateDescription(groupJid, desc);
    await new Promise(r => setTimeout(r, 1000));
    await sock.groupParticipantsUpdate(groupJid, [leaderJid], 'promote');

    _clanGroups.set(clanName, { jid: groupJid, leaderJid });
    console.log('[DARKRPG] Cla criado: ' + clanName + ' → ' + groupJid);
    return { ok: true, jid: groupJid, name: groupName, leader: leaderJid };
  } catch (e) {
    console.error('[DARKRPG] Erro ao criar cla:', e.message);
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// 4. ADDGLB — ADICIONA TODOS AO GRUPO GERAL
// ══════════════════════════════════════════════════════════════
async function addAllUsersToMainGroup(sock, ownerJid) {
  const User = require('../../database/models/User');
  const results = { added: [], invited: [], errors: [] };

  let users = [];
  try { users = await User.find({ active: { $ne: false } }).lean(); }
  catch (e) { results.errors.push('Erro DB: ' + e.message); return results; }

  if (!users.length) { results.errors.push('Nenhum usuario.'); return results; }

  const mainJid = _groupCache.get('aldeia');
  if (!mainJid) { results.errors.push('Grupo principal nao encontrado.'); return results; }

  for (const user of users) {
    const jid = user.whatsappNumber + '@s.whatsapp.net';
    if (jid === ownerJid) continue;

    try {
      await sock.groupParticipantsUpdate(mainJid, [jid], 'add');
      results.added.push({ user: user.name || user.whatsappNumber });
    } catch {
      try {
        const msg = generateInviteMessage(user.name || 'Aventureiro');
        await sock.sendMessage(jid, { text: msg });
        results.invited.push({ user: user.name || user.whatsappNumber });
      } catch (e2) {
        results.errors.push((user.name || '') + ': ' + e2.message);
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

// ══════════════════════════════════════════════════════════════
// 5. INICIALIZAR COMUNIDADE COMPLETA
// ══════════════════════════════════════════════════════════════
async function initCommunity(sock, ownerJid) {
  const results = [];

  // 1. Cria comunidade
  const comm = await createWhatsAppCommunity(sock, ownerJid);
  results.push({ type: 'community', ...comm });

  const cJid = comm.ok ? comm.jid : null;

  // 2. Cria grupos dentro da comunidade
  for (const [type, def] of Object.entries(COMMUNITY_GROUPS)) {
    const r = await createGroupInCommunity(sock, type, ownerJid, cJid);
    results.push({ type, ...r });
    await new Promise(r => setTimeout(r, 8000)); // 8s entre grupos
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
// 6. COMUNICADO (ranking)
// ══════════════════════════════════════════════════════════════
async function generateDailyReport() {
  const RPGPlayer = require('../../database/models/RPGPlayer');
  let r = '⚔️ *COMUNICADO DARK VILLE* ⚔️\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  try {
    const top = await RPGPlayer.find().sort({ level: -1 }).limit(5).lean();
    if (top.length) {
      r += '🏆 *TOP NIVEL:*\n';
      const medals = ['🥇', '🥈', '🥉'];
      top.forEach((p, i) => {
        r += (medals[i] || (i+1) + '.') + ' *' + p.name + '* — Nv.' + p.level + '\n';
      });
      r += '\n';
    }
  } catch {}

  try {
    const rich = await RPGPlayer.find().sort({ coins: -1 }).limit(5).lean();
    if (rich.length) {
      r += '💰 *TOP BERRIES:*\n';
      const medals = ['🥇', '🥈', '🥉'];
      rich.forEach((p, i) => {
        r += (medals[i] || (i+1) + '.') + ' *' + p.name + '* — ' + (p.coins || 0).toLocaleString() + '\n';
      });
      r += '\n';
    }
  } catch {}

  try {
    const killers = await RPGPlayer.find().sort({ kills: -1 }).limit(5).lean();
    if (killers.length) {
      r += '⚔️ *TOP KILLS:*\n';
      const medals = ['🥇', '🥈', '🥉'];
      killers.forEach((p, i) => {
        r += (medals[i] || (i+1) + '.') + ' *' + p.name + '* — ' + (p.kills || 0) + ' kills\n';
      });
    }
  } catch {}

  r += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n🕸️ *DARK VILLE — A comunidade cresce!*';
  return r;
}

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════
module.exports = {
  COMMUNITY_GROUPS,
  _communityJid: () => _communityJid,
  _groupCache,
  _clanGroups,
  createWhatsAppCommunity,
  createGroupInCommunity,
  createClanGroup,
  addAllUsersToMainGroup,
  initCommunity,
  generateInviteMessage,
  generateDailyReport,
};
