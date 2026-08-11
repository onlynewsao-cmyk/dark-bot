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
// REGRAS / EVENTOS  (v6.63)
// O rpgSetup.js chamava community.COMMUNITY_RULES, community.EVENTS,
// community.generateLeaderboard e community.generateWelcomeMessage —
// nenhum deles existia. Resultado real: `.regras` mandava "undefined",
// `.ranking` respondia "generateLeaderboard is not a function" e
// `.evento` rebentava com "Cannot convert undefined or null to object".
// ══════════════════════════════════════════════════════════════
const COMMUNITY_RULES = [
  '📜 *REGRAS — DARK VILLE*',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '',
  '1️⃣ Respeito acima de tudo. Sem insultos nem ataques pessoais.',
  '2️⃣ Nada de spam, flood ou divulgação sem autorização.',
  '3️⃣ Sem conteúdo +18 nos grupos gerais.',
  '4️⃣ Trapaça, bots externos ou multi-conta = banimento.',
  '5️⃣ Cada grupo tem o seu tema — usa o grupo certo.',
  '6️⃣ As decisões dos admins valem. Discute em privado.',
  '',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━',
  '⚔️ *Quem quebra as regras perde o que conquistou.*',
].join('\n');

const EVENTS = {
  boss: {
    name: '🐲 Boss Mundial',
    desc: 'Um boss aparece. Todos atacam juntos até cair.',
    duration: 30 * 60000,
    reward: 'XP em dobro + loot lendário',
  },
  chuva: {
    name: '💰 Chuva de Berries',
    desc: 'Berries em dobro em tudo o que fizeres.',
    duration: 60 * 60000,
    reward: 'Berries x2',
  },
  caca: {
    name: '🏹 Caçada Aberta',
    desc: 'Inimigos aparecem sem parar. Mata o máximo que conseguires.',
    duration: 45 * 60000,
    reward: 'XP x1.5 + kills contam a dobrar',
  },
  torneio: {
    name: '⚔️ Torneio da Arena',
    desc: 'PvP eliminatório. Só sobra um.',
    duration: 90 * 60000,
    reward: 'Título exclusivo + 10000 berries',
  },
  gacha: {
    name: '🃏 Invocação Grátis',
    desc: 'Gacha sem custo enquanto durar o evento.',
    duration: 30 * 60000,
    reward: 'Cartas grátis',
  },
};

// ══════════════════════════════════════════════════════════════
// CACHE  (v6.63: agora persiste no MongoDB)
// Antes eram Maps em memória: o Render reinicia o processo a cada
// deploy/idle e o bot esquecia-se dos grupos. `.comunicado` deixava
// de encontrar o Arsenal e `.addglb` dizia sempre "grupo principal
// não encontrado".
// ══════════════════════════════════════════════════════════════
let _communityJid = null;
const _groupCache = new Map();
const _clanGroups = new Map();

const DB_KEY = 'darkrpg_community_v1';
let _loaded = false;

async function _persist() {
  try {
    const cache = require('../botConfigCache');
    await cache.set(DB_KEY, {
      communityJid: _communityJid,
      groups: Object.fromEntries(_groupCache),
      clans: Object.fromEntries(_clanGroups),
    });
  } catch (e) {
    console.warn('[DARKRPG] persist:', e.message?.slice(0, 60));
  }
}

async function loadState() {
  if (_loaded) return { communityJid: _communityJid, groups: _groupCache, clans: _clanGroups };
  _loaded = true;
  try {
    const cache = require('../botConfigCache');
    const s = await cache.get(DB_KEY, null);
    if (s && typeof s === 'object') {
      _communityJid = s.communityJid || null;
      for (const [k, v] of Object.entries(s.groups || {})) _groupCache.set(k, v);
      for (const [k, v] of Object.entries(s.clans || {})) _clanGroups.set(k, v);
    }
  } catch (e) {
    console.warn('[DARKRPG] load:', e.message?.slice(0, 60));
  }
  return { communityJid: _communityJid, groups: _groupCache, clans: _clanGroups };
}

// ══════════════════════════════════════════════════════════════
// 1. CRIAR COMUNIDADE DO WHATSAPP
// ══════════════════════════════════════════════════════════════
async function createWhatsAppCommunity(sock, ownerJid) {
  // v6.63: o communityCreate do Baileys faz parseGroupResult(), que
  // devolve o groupMetadata — e devolve `null` se o parse falhar,
  // mesmo quando a comunidade FOI criada no WhatsApp. Antes o código
  // lia só `community.id` e reportava "Nao foi possivel criar" numa
  // comunidade que existia. Agora aceita id/jid e faz fallback.
  if (typeof sock.communityCreate !== 'function') {
    return { ok: false, error: 'Esta versao do Baileys nao suporta comunidades' };
  }
  try {
    console.log('[DARKRPG] Criando comunidade DARK VILLE...');

    const community = await sock.communityCreate(
      'DARK VILLE',
      'Comunidade oficial DARK RPG — Batalhas, Rankings, Eventos, Clas'
    );

    let jid = community?.id || community?.jid || null;

    // Fallback: o parse devolveu null mas a comunidade pode existir.
    if (!jid && typeof sock.communityFetchAllParticipating === 'function') {
      try {
        const all = await sock.communityFetchAllParticipating();
        const hit = Object.values(all || {}).find(c => c?.subject === 'DARK VILLE');
        if (hit?.id) jid = hit.id;
      } catch {}
    }

    if (jid) {
      _communityJid = jid;
      await _persist();
      console.log('[DARKRPG] Comunidade criada: ' + jid);
      return { ok: true, jid, name: 'DARK VILLE' };
    }

    return { ok: false, error: 'O WhatsApp nao devolveu o ID da comunidade' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════
// 2. CRIAR GRUPO DENTRO DA COMUNIDADE
// ══════════════════════════════════════════════════════════════
async function createGroupInCommunity(sock, groupType, ownerJid, communityJid) {
  const groupDef = COMMUNITY_GROUPS[groupType];
  if (!groupDef) return { ok: false, error: 'Tipo invalido: ' + groupType };

  // v6.63: o erro da última tentativa era deitado fora — o dono via
  // sempre "Falhou apos 3 tentativas" sem saber porquê. E o
  // `group.id` rebentava se o Baileys devolvesse null.
  let lastErr = 'desconhecido';

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let group;
      let dentroDaComunidade = false;

      if (communityJid && typeof sock.communityCreateGroup === 'function') {
        console.log('[DARKRPG] Criando grupo na comunidade: ' + groupDef.name);
        group = await sock.communityCreateGroup(groupDef.name, [ownerJid], communityJid);
        dentroDaComunidade = true;
      } else {
        console.log('[DARKRPG] Criando grupo normal: ' + groupDef.name);
        group = await sock.groupCreate(groupDef.name, [ownerJid]);
      }

      const groupJid = group?.id || group?.jid || null;
      if (!groupJid) throw new Error('WhatsApp nao devolveu o ID do grupo');

      // Se caiu no fallback (grupo solto) mas há comunidade, liga-o.
      if (!dentroDaComunidade && communityJid && typeof sock.communityLinkGroup === 'function') {
        await new Promise(r => setTimeout(r, 1500));
        try { await sock.communityLinkGroup(groupJid, communityJid); } catch {}
      }

      await new Promise(r => setTimeout(r, 2000));
      try { await sock.groupUpdateDescription(groupJid, groupDef.desc); } catch {}

      if (groupDef.ownerAdm) {
        await new Promise(r => setTimeout(r, 1000));
        try { await sock.groupParticipantsUpdate(groupJid, [ownerJid], 'promote'); } catch {}
      }

      _groupCache.set(groupType, groupJid);
      await _persist();
      console.log('[DARKRPG] Grupo criado: ' + groupDef.name + ' → ' + groupJid);
      return { ok: true, jid: groupJid, name: groupDef.name, linked: dentroDaComunidade };
    } catch (e) {
      lastErr = e.message || String(e);
      console.error('[DARKRPG] Tentativa ' + attempt + '/3 falhou: ' + lastErr);
      if (attempt < 3) {
        const wait = /rate-overlimit|429/i.test(lastErr) ? 15000 : 5000;
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  return { ok: false, error: lastErr, name: groupDef.name };
}

// ══════════════════════════════════════════════════════════════
// 3. CRIAR CLA (fora da comunidade)
// ══════════════════════════════════════════════════════════════
async function createClanGroup(sock, clanName, leaderJid, members = []) {
  const groupName = 'Cla ' + clanName;
  const desc = 'Cla ' + clanName + '\nLider: ' + leaderJid.split('@')[0];

  try {
    const group = await sock.groupCreate(groupName, [leaderJid, ...members]);
    // v6.63: `group.id` rebentava se o Baileys devolvesse null — e o
    // dono perdia os 5000 berries à mesma, porque o case debitava
    // antes de confirmar. Agora falha limpo.
    const groupJid = group?.id || group?.jid || null;
    if (!groupJid) return { ok: false, error: 'WhatsApp nao devolveu o ID do grupo' };

    await new Promise(r => setTimeout(r, 1000));
    try { await sock.groupUpdateDescription(groupJid, desc); } catch {}
    await new Promise(r => setTimeout(r, 1000));
    try { await sock.groupParticipantsUpdate(groupJid, [leaderJid], 'promote'); } catch {}

    // Liga o clã à comunidade, se existir uma.
    if (_communityJid && typeof sock.communityLinkGroup === 'function') {
      await new Promise(r => setTimeout(r, 1000));
      try { await sock.communityLinkGroup(groupJid, _communityJid); } catch {}
    }

    _clanGroups.set(clanName, { jid: groupJid, leaderJid });
    await _persist();
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
async function addAllUsersToMainGroup(sock, ownerJid, mainType) {
  await loadState();
  const User = require('../../database/models/User');
  const results = { added: [], invited: [], errors: [], group: null };

  // ── v6.63: BUG CRÍTICO ────────────────────────────────────
  // Procurava _groupCache.get('aldeia'), mas 'aldeia' NUNCA existiu
  // em COMMUNITY_GROUPS (as chaves são arena/dungeons/trocas/
  // cavernas/lazer/arsenal). O .addglb dava sempre
  // "Grupo principal nao encontrado" — 100% das vezes, mesmo com
  // a comunidade criada. Agora usa o primeiro grupo disponível.
  const mainJid =
    (mainType && _groupCache.get(mainType)) ||
    _groupCache.get('lazer') ||
    _groupCache.get('arena') ||
    [..._groupCache.values()][0] ||
    null;

  if (!mainJid) {
    results.errors.push('Nenhum grupo criado ainda. Corre !darkrpg primeiro.');
    return results;
  }
  results.group = mainJid;

  let users = [];
  try { users = await User.find({ active: { $ne: false } }).lean(); }
  catch (e) { results.errors.push('Erro DB: ' + e.message); return results; }

  if (!users.length) { results.errors.push('Nenhum usuario na base de dados.'); return results; }

  for (const user of users) {
    const num = String(user.whatsappNumber || '').replace(/\D/g, '');
    if (!num) continue;
    const jid = num + '@s.whatsapp.net';
    if (jid === ownerJid || num === String(ownerJid).split('@')[0]) continue;

    let entrou = false;
    try {
      // O Baileys NÃO atira erro quando o add falha: devolve
      // [{ status: '403'|'409'|'200', jid }]. O catch nunca disparava,
      // por isso ninguém recebia convite e o relatório mentia.
      const r = await sock.groupParticipantsUpdate(mainJid, [jid], 'add');
      const st = Array.isArray(r) ? String(r[0]?.status || '') : '200';
      if (st === '200') { results.added.push({ user: user.name || num }); entrou = true; }
    } catch (e) {
      results.errors.push((user.name || num) + ': ' + e.message);
    }

    if (!entrou) {
      try {
        await sock.sendMessage(jid, { text: generateInviteMessage(user.name || 'Aventureiro') });
        results.invited.push({ user: user.name || num });
      } catch (e2) {
        results.errors.push((user.name || num) + ': ' + e2.message);
      }
    }
    await new Promise(r => setTimeout(r, 800));
  }
  return results;
}

// ══════════════════════════════════════════════════════════════
// 5. INICIALIZAR COMUNIDADE COMPLETA
// ══════════════════════════════════════════════════════════════
async function initCommunity(sock, ownerJid) {
  await loadState();
  const results = [];

  // 1. Cria comunidade (ou reaproveita a que já existe)
  let comm;
  if (_communityJid) {
    comm = { ok: true, jid: _communityJid, name: 'DARK VILLE (já existia)' };
  } else {
    comm = await createWhatsAppCommunity(sock, ownerJid);
  }
  results.push({ type: 'community', ...comm });

  const cJid = comm.ok ? comm.jid : null;

  // 2. Cria grupos dentro da comunidade (salta os que já existem)
  for (const [type, def] of Object.entries(COMMUNITY_GROUPS)) {
    if (_groupCache.get(type)) {
      results.push({ type, ok: true, name: def.name + ' (já existia)', jid: _groupCache.get(type) });
      continue;
    }
    const r = await createGroupInCommunity(sock, type, ownerJid, cJid);
    results.push({ type, ...r });
    await new Promise(r => setTimeout(r, 8000)); // 8s entre grupos
  }

  await _persist();
  return results;
}

// ══════════════════════════════════════════════════════════════
// 5b. LEADERBOARD / BOAS-VINDAS  (v6.63 — não existiam)
// ══════════════════════════════════════════════════════════════
const _LB = {
  level:   { campo: 'level',      titulo: '🏆 TOP NÍVEL',   sufixo: p => 'Nv.' + (p.level || 1) },
  kills:   { campo: 'kills',      titulo: '⚔️ TOP KILLS',   sufixo: p => (p.kills || 0) + ' kills' },
  berries: { campo: 'coins',      titulo: '💰 TOP BERRIES', sufixo: p => (p.coins || 0).toLocaleString() + ' berries' },
  rep:     { campo: 'reputation', titulo: '⭐ TOP REPUTAÇÃO', sufixo: p => (p.reputation || 0) + ' rep' },
};

async function generateLeaderboard(tipo = 'level', limite = 10) {
  const cfg = _LB[String(tipo).toLowerCase()] || _LB.level;
  const RPGPlayer = require('../../database/models/RPGPlayer');

  let top = [];
  try {
    top = await RPGPlayer.find().sort({ [cfg.campo]: -1 }).limit(limite).lean();
  } catch (e) {
    return '❌ Não consegui ler o ranking: ' + e.message;
  }
  if (!Array.isArray(top) || !top.length) {
    return cfg.titulo + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nAinda não há jogadores.\nUsa *!criarpersonagem* para começares.';
  }

  const medalhas = ['🥇', '🥈', '🥉'];
  const linhas = top.map((p, i) =>
    (medalhas[i] || (i + 1) + '.') + ' *' + (p.name || 'Aventureiro') + '* — ' + cfg.sufixo(p)
  );

  return cfg.titulo + '\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    linhas.join('\n') +
    '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n🕸️ *DARK VILLE*';
}

function generateWelcomeMessage(userName, groupName) {
  const nome = userName || 'Aventureiro';
  return '🕸️ *Bem-vindo à DARK VILLE, ' + nome + '!*\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    (groupName ? '📍 Estás em: *' + groupName + '*\n\n' : '') +
    '⚔️ Aqui joga-se a sério. Começa assim:\n\n' +
    '• *!criarpersonagem* — cria a tua ficha\n' +
    '• *!menu-rpg* — vê tudo o que dá para fazer\n' +
    '• *!regras* — lê antes de te queixares\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🏰 *Boa sorte. Vais precisar.*';
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
  COMMUNITY_RULES,
  EVENTS,
  generateLeaderboard,
  generateWelcomeMessage,
  loadState,
  getCommunityJid: () => _communityJid,
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
