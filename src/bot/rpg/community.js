/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v7 — DARKRPG Community Manager                    ║
 * ║   O bot é o moderador, juiz, narrador e ADM da comunidade    ║
 * ║                                                               ║
 * ║   Funções:                                                    ║
 * ║   - Moderação de batalhas (juiz imparcial)                   ║
 * ║   - Gestão de grupos/canais RPG                              ║
 * ║   - Eventos automáticos (boss raids, torneios)               ║
 * ║   - Leaderboard público                                      ║
 * ║   - Regras da comunidade                                     ║
 * ║   - Sistema de reputação                                     ║
 * ║   - Convites e onboarding                                    ║
 * ║   - AURA como narradora                                      ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
'use strict';

const config = require('../config');
const rpg = require('./rpg/engine');

// ══════════════════════════════════════════════════════════════
// REGRAS DA COMUNIDADE DARKRPG
// ══════════════════════════════════════════════════════════════
const COMMUNITY_RULES = `📜 *REGRAS DA COMUNIDADE DARKRPG*

⚔️ *BATALHAS:*
• O bot é o juiz — aceite as decisões
• Sem hacks, cheats ou exploits
• Duelos com aposta mínima de 100 berries
• Sem bullying ou toxicidade

🤝 *COMPORTAMENTO:*
• Respeite todos os membros
• Sem spam ou flood
• Sem conteúdo 18+ nos grupos públicos
• Sem racismo, homofobia ou discriminação

🎮 *RPG:*
• Cada pessoa = 1 conta
• Sem transferência de itens entre contas
• Sem venda de contas ou itens por dinheiro real
• Respete os rankings

👑 *MODERAÇÃO:*
• O bot DARK é o juiz supremo
• AURA pode ajudar com dúvidas
• Problemas? Fale com o dono
• Bans são finais após 3 avisos`;

// ══════════════════════════════════════════════════════════════
// SISTEMA DE REPUTAÇÃO
// ══════════════════════════════════════════════════════════════
const REPUTATION_LEVELS = [
  { name: 'Iniciante', emoji: '⭐', min_rep: 0 },
  { name: 'Respeitado', emoji: '⭐⭐', min_rep: 100 },
  { name: 'Veterano', emoji: '⭐⭐⭐', min_rep: 500 },
  { name: 'Lenda', emoji: '👑', min_rep: 1000 },
  { name: 'Mito', emoji: '💎', min_rep: 5000 },
];

function getRepLevel(rep) {
  let level = REPUTATION_LEVELS[0];
  for (const l of REPUTATION_LEVELS) {
    if (rep >= l.min_rep) level = l;
  }
  return level;
}

// ══════════════════════════════════════════════════════════════
// MODERAÇÃO DE BATALHAS (o bot é juiz)
// ══════════════════════════════════════════════════════════════
const activeBattles = new Map(); // battleId → battle state

async function startBattle(sock, msg, ctx, challenger, defender, bet = 0) {
  const battleId = `${challenger.whatsappNumber}:${defender.whatsappNumber}:${Date.now()}`;

  const battle = {
    id: battleId,
    challenger: { ...challenger, currentHp: challenger.hp },
    defender: { ...defender, currentHp: defender.hp },
    bet,
    turn: 1,
    startedAt: Date.now(),
    status: 'active',
    log: [],
  };

  activeBattles.set(battleId, battle);

  // Anuncia a batalha
  const announcement = `⚔️ *DARKRPG — BATALHA INICIADA!* ⚔️

━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 *${challenger.name}* [Rank ${rpg.getRank(challenger.level).name}]
   ❤️ HP: ${rpg.hpBar(challenger.hp, challenger.maxHp)} ${challenger.hp}/${challenger.maxHp}
   ⚔️ ATK: ${challenger.stats?.str || 15} | 🛡️ DEF: ${challenger.stats?.vit || 15}

⚔️ VS ⚔️

🔵 *${defender.name}* [Rank ${rpg.getRank(defender.level).name}]
   ❤️ HP: ${rpg.hpBar(defender.hp, defender.maxHp)} ${defender.hp}/${defender.maxHp}
   ⚔️ ATK: ${defender.stats?.str || 15} | 🛡️ DEF: ${defender.stats?.vit || 15}
━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 *Aposta:* ${bet} berries
🎯 *Juiz:* DARK BOT (moderador)

🎮 *Escolham suas ações:*
[1] ⚔️ Atacar
[2] 🌀 Usar Skill
[3] 🛡️ Defender
[4] 🏃 Fugir

_Responda com o número da ação!_`;

  await sock.sendMessage(ctx.remoteJid, { text: announcement }, { quoted: msg });
  return battle;
}

async function processBattleAction(sock, msg, ctx, userId, action) {
  // Encontra a batalha ativa do usuário
  let battle = null;
  for (const [id, b] of activeBattles.entries()) {
    if (b.status === 'active' &&
        (b.challenger.whatsappNumber === userId || b.defender.whatsappNumber === userId)) {
      battle = b;
      break;
    }
  }

  if (!battle) return null;

  const isChallenger = battle.challenger.whatsappNumber === userId;
  const attacker = isChallenger ? battle.challenger : battle.defender;
  const defender = isChallenger ? battle.defender : battle.challenger;

  let result = '';

  switch (action) {
    case 1: // Atacar
      const dmg = Math.floor((attacker.stats?.str || 15) * 2.5 - (defender.stats?.vit || 15) * 0.5);
      const crit = Math.random() < 0.15;
      const finalDmg = crit ? dmg * 2 : dmg;
      defender.currentHp = Math.max(0, defender.currentHp - finalDmg);

      result = crit
        ? `💥 *CRÍTICO!* ${attacker.name} causa *${finalDmg}* de dano!`
        : `⚔️ ${attacker.name} ataca e causa *${finalDmg}* de dano!`;

      battle.log.push(result);
      break;

    case 2: // Skill
      const skillDmg = Math.floor((attacker.stats?.int || 15) * 3);
      defender.currentHp = Math.max(0, defender.currentHp - skillDmg);
      result = `🌀 ${attacker.name} usa uma habilidade especial! *${skillDmg}* de dano!`;
      battle.log.push(result);
      break;

    case 3: // Defender
      result = `🛡️ ${attacker.name} se defende! -50% dano próximo turno.`;
      battle.log.push(result);
      break;

    case 4: // Fugir
      battle.status = 'fled';
      result = `🏃 ${attacker.name} fugiu da batalha!`;
      battle.log.push(result);
      break;
  }

  // Verifica vitória
  if (defender.currentHp <= 0) {
    battle.status = 'finished';
    const winner = attacker;
    const loser = defender;

    // Recompensas
    const xpGain = Math.floor(50 + battle.bet * 0.1);
    const berryGain = battle.bet;

    // Atualiza stats
    winner.kills = (winner.kills || 0) + 1;
    loser.deaths = (loser.deaths || 0) + 1;

    await rpg.savePlayer(winner);
    await rpg.savePlayer(loser);

    const victoryMsg = `🏆 *VITÓRIA DE ${winner.name.toUpperCase()}!*

━━━━━━━━━━━━━━━━━━━━━━━━━━
${battle.log.join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 *Recompensas:*
• +${xpGain} XP
• +${berryGain} berries (aposta)
• +1 kill no ranking

🎖️ *${winner.name}* venceu a batalha!`;

    await sock.sendMessage(ctx.remoteJid, { text: victoryMsg }, { quoted: msg });
    activeBattles.delete(battle.id);
    return { finished: true, winner, loser };
  }

  // Próximo turno
  battle.turn++;
  const statusMsg = `⚔️ *Turno ${battle.turn}*

${battle.log.slice(-3).join('\n')}

❤️ *${attacker.name}:* ${rpg.hpBar(attacker.currentHp, attacker.maxHp)} ${attacker.currentHp}/${attacker.maxHp}
❤️ *${defender.name}:* ${rpg.hpBar(defender.currentHp, defender.maxHp)} ${defender.currentHp}/${defender.maxHp}

🎮 *Vez de ${defender.name}!* Escolha: [1] Atacar | [2] Skill | [3] Defender | [4] Fugir`;

  await sock.sendMessage(ctx.remoteJid, { text: statusMsg }, { quoted: msg });
  return { finished: false, battle };
}

// ══════════════════════════════════════════════════════════════
// EVENTOS AUTOMÁTICOS
// ══════════════════════════════════════════════════════════════
const EVENTS = {
  boss_raid: {
    name: '🐲 Raid Boss',
    desc: 'Um boss colossal apareceu! Ataquem juntos!',
    duration: 3600000, // 1 hora
    rewards: { xp: 500, berries: 10000, crystals: 50 },
  },
  double_xp: {
    name: '⭐ Double XP',
    desc: 'XP dobrado por 30 minutos!',
    duration: 1800000,
    multiplier: { xp: 2 },
  },
  gacha_event: {
    name: '🎴 Gacha Event',
    desc: 'Chance dobrada de cartas raras!',
    duration: 3600000,
    multiplier: { gacha_rarity: 2 },
  },
  pvp_tournament: {
    name: '⚔️ Torneio PvP',
    desc: 'Inscrevam-se! Prêmios para os 3 primeiros!',
    duration: 7200000,
    rewards: { first: 50000, second: 25000, third: 10000 },
  },
};

// ══════════════════════════════════════════════════════════════
// LEADERBOARD PÚBLICO
// ══════════════════════════════════════════════════════════════
async function generateLeaderboard(type = 'level') {
  const RPGPlayer = require('../database/models/RPGPlayer');
  let players = [];

  switch (type) {
    case 'level':
      players = await RPGPlayer.find().sort({ level: -1 }).limit(10).lean();
      break;
    case 'kills':
      players = await RPGPlayer.find().sort({ kills: -1 }).limit(10).lean();
      break;
    case 'berries':
      players = await RPGPlayer.find().sort({ coins: -1 }).limit(10).lean();
      break;
    case 'rep':
      players = await RPGPlayer.find().sort({ reputation: -1 }).limit(10).lean();
      break;
  }

  if (!players.length) return '📊 *Ranking vazio!*';

  const medals = ['🥇', '🥈', '🥉'];
  const lines = players.map((p, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const rank = rpg.getRank(p.level);
    return `${medal} ${rank.emoji} *${p.name}* — Nv.${p.level} | ${type === 'kills' ? p.kills + ' kills' : type === 'berries' ? p.coins + ' berries' : p.reputation + ' rep'}`;
  });

  return `📊 *DARKRPG LEADERBOARD — ${type.toUpperCase()}*

${lines.join('\n')}

_Total: ${players.length} jogadores_`;
}

// ══════════════════════════════════════════════════════════════
// AURA COMO NARRADORA
// ══════════════════════════════════════════════════════════════
function generateBattleNarration(battle, action, result) {
  const narrations = {
    attack: [
      `⚔️ *${battle.attacker.name}* desfere um golpe mortal!`,
      `💥 O golpe de *${battle.attacker.name}* ecoa pela arena!`,
      `🔥 *${battle.attacker.name}* avança com fúria!`,
    ],
    skill: [
      `🌀 *${battle.attacker.name}* canaliza energia ancestral!`,
      `✨ Uma luz intensa emana de *${battle.attacker.name}*!`,
      `⚡ *${battle.attacker.name}* invoca poder sobrenatural!`,
    ],
    defend: [
      `🛡️ *${battle.attacker.name}* ergue um escudo de energia!`,
      `✋ *${battle.attacker.name}* se prepara para o impacto!`,
    ],
    critical: [
      `💥 *ACERTO CRÍTICO!* O golpe de *${battle.attacker.name}* é devastador!`,
      `🔥 *FULGOR NEGRO!* Raios negros envolvem o ataque!`,
    ],
  };

  const pool = narrations[action] || narrations.attack;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ══════════════════════════════════════════════════════════════
// CONVITES E ONBOARDING
// ══════════════════════════════════════════════════════════════
function generateWelcomeMessage(userName) {
  return `🎉 *Bem-vindo ao DARKRPG, ${userName}!*

━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 *COMO COMEÇAR:*

1️⃣ */despertar* — Inicie sua jornada
2️⃣ */perfil* — Veja seus status
3️⃣ */portal entrar* — Enfrente bosses
4️⃣ */gacha* — Colete cartas anime
5️⃣ */x1 @user* — Desafie outros

📚 *COMANDOS ÚTEIS:*
• */loja* — Compre itens
• */forja* — Refine armas
• */guilda* — Crie um clã
• */top* — Veja o ranking
• */ajuda* — Menu completo

⚔️ *O DARK é o juiz supremo!*
_Aceite as decisões do bot._
━━━━━━━━━━━━━━━━━━━━━━━━━━

🍀 Boa sorte, ${userName}!`;
}

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════
module.exports = {
  COMMUNITY_RULES,
  REPUTATION_LEVELS,
  getRepLevel,
  EVENTS,
  startBattle,
  processBattleAction,
  generateLeaderboard,
  generateBattleNarration,
  generateWelcomeMessage,
  activeBattles,
};
