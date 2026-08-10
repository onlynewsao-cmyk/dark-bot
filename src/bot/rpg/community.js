/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — DARKRPG Community System v2                  ║
 * ║   O bot cria e gere TODA a comunidade RPG automaticamente    ║
 * ║                                                               ║
 * ║   • Owner é ADM em todos os grupos (menos clãs)              ║
 * ║   • Emojis nos grupos (menos clãs)                           ║
 * ║   • addglb busca users do dashboard + convite personalizado  ║
 * ║   • Textos personalizados RPG com emojis e signos            ║
 * ║   • Aldeia Central: DARK🕸️VILLE                              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config = require('../config');
const rpg = require('./rpg/engine');

// ══════════════════════════════════════════════════════════════
// SIGNOS / EMBLEMAS RPG PARA EMBELLEZAR TEXTOS
// ══════════════════════════════════════════════════════════════
const RPG_EMOJIS = {
  rank: { E:'⚪', D:'🟢', C:'🔵', B:'🟣', A:'🟡', S:'🔴', SS:'⭐', SSS:'💎' },
  element: { fogo:'🔥', agua:'💧', terra:'🌿', vento:'🌀', luz:'✨', treva:'🌑', trovao:'⚡', gelo:'❄️' },
  status: { hp:'❤️', mp:'💙', atk:'⚔️', def:'🛡️', spd:'💨', luk:'🍀' },
  action: { atacar:'⚔️', defender:'🛡️', fugir:'🏃', curar:'💚', skill:'🌀', item:'🎒' },
  social: { clan:'🏰', guild:'👑', arena:'🏟️', dungeon:'🕳️', mercado:'🏪', taverna:'🍺' },
};

// ══════════════════════════════════════════════════════════════
// GRUPOS DA COMUNIDADE DARK🕸️VILLE
// ══════════════════════════════════════════════════════════════
const COMMUNITY_GROUPS = {
  // ── ALDEIA CENTRAL ──
  aldeia: {
    name: '🕸️ DARK🕸️VILLE — Aldeia Central',
    desc: [
      '╔═══════════════════════════════════╗',
      '║  🕸️ DARK🕸️VILLE — Aldeia Central  ║',
      '║  O coração da comunidade RPG       ║',
      '╠═══════════════════════════════════╣',
      '║  🏟️ Arena — Batalhas PvP           ║',
      '║  🕳️ Dungeons — PvE e Bosses        ║',
      '║  🏪 Trocas — Mercado livre         ║',
      '║  🦇 Cavernas — Exploração          ║',
      '║  😂 Lazer — Memes e diversão       ║',
      '║  ⚔️ Arsenal — Rankings e fama       ║',
      '║  🏰 Clãs — Grupos de guildas       ║',
      '╚═══════════════════════════════════╝',
      '',
      '📜 Use !menu-rpg para ver todos os comandos',
      '⚔️ Use !despertar para começar sua jornada',
    ].join('\n'),
    emoji: '🕸️',
    isClan: false,
    ownerAdm: true,
  },

  // ── ARENA ──
  arena: {
    name: '🏟️ Arena das Sombras ⚔️',
    desc: [
      '╔═══════════════════════════════════╗',
      '║  🏟️ Arena das Sombras ⚔️          ║',
      '║  Batalhas PvP 1x1 e Torneios       ║',
      '╠═══════════════════════════════════╣',
      '║  • !x1 @user [aposta] — Duelo     ║',
      '║  • !arena — Torneio automático     ║',
      '║  • O DARK BOT é o juiz supremo     ║',
      '║  • AURA narra as batalhas          ║',
      '╚═══════════════════════════════════╝',
    ].join('\n'),
    emoji: '🏟️',
    isClan: false,
    ownerAdm: true,
  },

  // ── DUNGEONS ──
  dungeons: {
    name: '🕳️ Dungeons Proibidas 🐉',
    desc: [
      '╔═══════════════════════════════════╗',
      '║  🕳️ Dungeons Proibidas 🐉          ║',
      '║  Portais PvE, Bosses, Raids        ║',
      '╠═══════════════════════════════════╣',
      '║  • !portal entrar — Abrir dungeon  ║',
      '║  • !raid — Boss mundial            ║',
      '║  • !lutar — Combate PvE            ║',
      '║  • Drops automáticos               ║',
      '╚═══════════════════════════════════╝',
    ].join('\n'),
    emoji: '🕳️',
    isClan: false,
    ownerAdm: true,
  },

  // ── TROCAS ──
  trocas: {
    name: '🏪 Ville de Trocas 💰',
    desc: [
      '╔═══════════════════════════════════╗',
      '║  🏪 Ville de Trocas 💰             ║',
      '║  Mercado livre de itens e cartas   ║',
      '╠═══════════════════════════════════╣',
      '║  • !mercado — Ver ofertas          ║',
      '║  • !vender <item> — Anunciar       ║',
      '║  • !comprar <id> — Comprar         ║',
      '║  • !loja — Loja do sistema         ║',
      '╚═══════════════════════════════════╝',
    ].join('\n'),
    emoji: '🏪',
    isClan: false,
    ownerAdm: true,
  },

  // ── CAVERNAS ──
  cavernas: {
    name: '🦇 Cavernas Sombrias ⛏️',
    desc: [
      '╔═══════════════════════════════════╗',
      '║  🦇 Cavernas Sombrias ⛏️           ║',
      '║  Exploração, mineração, pesca      ║',
      '╠═══════════════════════════════════╣',
      '║  • !explorar — Explorar biomas     ║',
      '║  • !minerar — Minerar recursos     ║',
      '║  • !pescar — Pescar itens          ║',
      '║  • !colher — Colher plantas        ║',
      '╚═══════════════════════════════════╝',
    ].join('\n'),
    emoji: '🦇',
    isClan: false,
    ownerAdm: true,
  },

  // ── LAZER ──
  lazer: {
    name: '😂 Lazer & Memes 🎭',
    desc: [
      '╔═══════════════════════════════════╗',
      '║  😂 Lazer & Memes 🎭               ║',
      '║  Diversão, zoeira, memes           ║',
      '╠═══════════════════════════════════╣',
      '║  • Sem spam                        ║',
      '║  • Sem conteúdo 18+                ║',
      '║  • Respeite os membros             ║',
      '╚═══════════════════════════════════╝',
    ].join('\n'),
    emoji: '😂',
    isClan: false,
    ownerAdm: true,
  },

  // ── ARSENAL ──
  arsenal: {
    name: '⚔️ Arsenal da Fama 🏆',
    desc: [
      '╔═══════════════════════════════════╗',
      '║  ⚔️ Arsenal da Fama 🏆             ║',
      '║  Rankings, conquistas, top jogadores║',
      '╠═══════════════════════════════════╣',
      '║  • !ranking — Leaderboard          ║',
      '║  • !top — Top jogadores            ║',
      '║  • !conquistas — Achievements      ║',
      '║  • Rankings atualizados automático ║',
      '╚═══════════════════════════════════╝',
    ].join('\n'),
    emoji: '⚔️',
    isClan: false,
    ownerAdm: true,
  },
};

// ══════════════════════════════════════════════════════════════
// CONVITE PERSONALIZADO RPG (não parece invasão de PV)
// ══════════════════════════════════════════════════════════════
function generateInviteMessage(userName, groupName) {
  const greetings = [
    `⚔️ *${userName}!*`,
    `🏰 *${userName}, a Aldeia te chama!*`,
    `🕸️ *${userName}, há um portal aberto para ti!*`,
  ];

  const bodies = [
    `A comunidade *DARK🕸️VILLE* cresceu e agora temos um novo espaço: *${groupName}*.\n\nSe quiseres entrar, é só aceitar o convite. Sem pressão — a escolha é tua. 🎮`,
    `O mundo do *DARKRPG* expandiu! *${groupName}* está ativo e há vagas para aventureiros.\n\nSe tiveres interesse, o convite está aqui. 🗡️`,
    `Novidades na *DARK🕸️VILLE*! O grupo *${groupName}* foi criado para quem quer participar.\n\nAceita quando quiseres. ⚔️`,
  ];

  const closings = [
    `🎮 *Use !menu-rpg para ver os comandos*\n⚔️ *Use !despertar para começar*`,
    `🏰 *A jornada espera por ti!*\n⚔️ *!despertar* para iniciar`,
    `🕸️ *O DARK te aguarda!*\n⚔️ *!despertar* para começar a aventura`,
  ];

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  return `${greeting}\n\n${body}\n\n${closing}`;
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

  try {
    // Cria o grupo com o owner
    const group = await sock.groupCreate(groupDef.name, [ownerJid]);
    const groupJid = group.id;

    // Define descrição
    await sock.groupUpdateDescription(groupJid, groupDef.desc);

    // Promove o owner a admin (sempre, menos clãs)
    if (groupDef.ownerAdm) {
      try {
        await sock.groupParticipantsUpdate(groupJid, [ownerJid], 'promote');
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
// CRIAR GRUPO DE CLÃ (SEM emojis, SEM owner como adm)
// ══════════════════════════════════════════════════════════════
async function createClanGroup(sock, clanName, leaderJid, members = []) {
  const groupName = '🏰 Clã ' + clanName;
  const desc = [
    '╔═══════════════════════════════════╗',
    '║  🏰 Clã ' + clanName.padEnd(25) + '║',
    '║  Grupo oficial do clã              ║',
    '╠═══════════════════════════════════╣',
    '║  👑 Líder: @' + leaderJid.split('@')[0].padEnd(22) + '║',
    '║  📜 Regras do clã definidas pelo líder ║',
    '╚═══════════════════════════════════╝',
  ].join('\n');

  try {
    const participants = [leaderJid, ...members];
    const group = await sock.groupCreate(groupName, participants);
    const groupJid = group.id;

    // Define descrição
    await sock.groupUpdateDescription(groupJid, desc);

    // Promove o líder a admin
    await sock.groupParticipantsUpdate(groupJid, [leaderJid], 'promote');

    // Cache
    _clanGroups.set(clanName, { jid: groupJid, leaderJid });

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
// ADDGLB — ADICIONAR TODOS OS USERS DO DASHBOARD
// ══════════════════════════════════════════════════════════════
async function addAllUsersToGroups(sock, ownerJid) {
  const User = require('../database/models/User');
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

  // Para cada grupo da comunidade
  for (const [groupType, groupJid] of _groupCache.entries()) {
    const groupDef = COMMUNITY_GROUPS[groupType];
    if (!groupDef || groupDef.isClan) continue; // Pula clãs

    for (const user of users) {
      const userJid = user.whatsappNumber + '@s.whatsapp.net';

      // Pula o owner
      if (userJid === ownerJid) continue;

      try {
        const addResult = await addUserToGroup(sock, groupJid, userJid);
        if (addResult.ok) {
          results.added.push({ user: user.name || user.whatsappNumber, group: groupDef.name });
        } else {
          // Se não conseguiu adicionar, envia convite personalizado
          try {
            const inviteMsg = generateInviteMessage(user.name || 'Aventureiro', groupDef.name);
            await sock.sendMessage(userJid, { text: inviteMsg });
            results.invited.push({ user: user.name || user.whatsappNumber, group: groupDef.name });
          } catch (e2) {
            results.errors.push(user.name + ': ' + e2.message);
          }
        }
      } catch (e) {
        results.errors.push(user.name + ': ' + e.message);
      }

      // Pequena pausa para não floodar
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
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

  // Cria todos os grupos da comunidade
  for (const [type, def] of Object.entries(COMMUNITY_GROUPS)) {
    const r = await createCommunityGroup(sock, type, ownerJid);
    results.push({ type, ...r });
    // Pausa entre criações
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════
module.exports = {
  COMMUNITY_GROUPS,
  RPG_EMOJIS,
  _groupCache,
  _clanGroups,
  createCommunityGroup,
  createClanGroup,
  addUserToGroup,
  removeUserFromGroup,
  addAllUsersToGroups,
  promoteClanLeader,
  initCommunity,
  generateInviteMessage,
};
