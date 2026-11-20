/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG COMBATE INTERATIVO                        ║
 * ║   Sistema de combate com botões interativos                      ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * Combate baseado em turnos com 4 acções:
 * - ⚔️ Atacar
 * - 🛡️ Defender
 * - ✨ Skill (usa skill da origem)
 * - 🎒 Item (usa item do inventário)
 */
'use strict';

const rpg = require('./engine.slim');
const rpgTheme = require('./rpgTheme');

// Estado de combate em memória (por sessão)
const _combates = new Map(); // chave: `${userId}_${enemyId}` → estado

function criarEstadoCombate(player, enemy) {
  return {
    player: {
      userId: player.userId,
      name: player.name,
      hp: player.hp,
      maxHp: player.maxHp,
      energy: player.energy,
      maxEnergy: player.maxEnergy,
      str: player.str,
      dex: player.dex,
      int: player.int,
      vit: player.vit,
      luk: player.luk,
      equippedWeapon: player.equippedWeapon,
      strategy: player.strategy || 'equilibrada',
    },
    enemy: {
      name: enemy.name,
      emoji: enemy.emoji,
      hp: enemy.hp,
      maxHp: enemy.hp,
      atk: enemy.atk,
      def: enemy.def,
    },
    turn: 1,
    turnHistory: [],
    startedAt: Date.now(),
  };
}

function calcularDano(attacker, defender, strategy = null, isCrit = false) {
  const atk = attacker.str * 2 + (attacker.equippedWeapon?.base_atk || 0);
  const def = defender.vit * 1.5 + (defender.def || 0);

  let damage = Math.max(1, atk - def + Math.floor(Math.random() * 10) - 5);

  // Multiplicador de estratégia
  if (strategy) {
    const strat = rpg.getStrategy(strategy);
    damage = Math.floor(damage * strat.atkMult);
  }

  // Crítico
  if (isCrit) {
    damage = Math.floor(damage * 1.5);
  }

  return Math.max(1, damage);
}

function gerarBarraHP(actual, max, length = 10) {
  const pct = Math.max(0, Math.min(100, (actual / max) * 100));
  const filled = Math.floor((pct / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function obterEstadoCombate(userId, enemyId) {
  const key = `${userId}_${enemyId}`;
  return _combates.get(key);
}

function actualizarEstadoCombate(userId, enemyId, estado) {
  const key = `${userId}_${enemyId}`;
  _combates.set(key, estado);
}

function limparEstadoCombate(userId, enemyId) {
  const key = `${userId}_${enemyId}`;
  _combates.delete(key);
}

/**
 * Inicia combate interativo
 */
async function iniciarCombate(sock, msg, ctx, enemy) {
  const player = await rpg.getPlayer(ctx.senderNumber);
  const estado = criarEstadoCombate(player, enemy);
  actualizarEstadoCombate(ctx.senderNumber, enemy.name, estado);

  const botoes = [
    { id: 'RPGCOMBAT_atacar', text: '⚔️ Atacar' },
    { id: 'RPGCOMBAT_defender', text: '🛡️ Defender' },
    { id: 'RPGCOMBAT_skill', text: '✨ Skill' },
    { id: 'RPGCOMBAT_item', text: '🎒 Item' },
  ];

  const corpo = [
    `⚔️ *COMBATE INICIADO*`,
    '',
    `${player.name} ${gerarBarraHP(player.hp, player.maxHp)} ${player.hp}/${player.maxHp}`,
    `vs`,
    `${enemy.emoji} ${enemy.name} ${gerarBarraHP(enemy.hp, enemy.hp)} ${enemy.hp}/${enemy.hp}`,
    '',
    `🎯 Turno 1 · Escolhe a tua acção!`,
  ].join('\n');

  await rpgTheme.rpgBotoes(sock, msg, ctx, corpo, botoes);
}

/**
 * Processa acção de combate
 */
async function processarAcao(sock, msg, ctx, acao, enemyId) {
  const estado = obterEstadoCombate(ctx.senderNumber, enemyId);

  if (!estado) {
    return rpgTheme.rpgReply(sock, msg, ctx, '❌', ['Combate não encontrado ou já terminou.']);
  }

  const { player, enemy, turn } = estado;
  const log = [];

  // ── TURNO DO JOGADOR ──
  let playerDamage = 0;
  let playerDefending = false;

  switch (acao) {
    case 'atacar': {
      const crit = Math.random() < (0.15 + player.luk * 0.005);
      playerDamage = calcularDano(player, enemy, player.strategy, crit);
      enemy.hp = Math.max(0, enemy.hp - playerDamage);
      log.push(`⚔️ ${player.name} atacou ${enemy.name} · -${playerDamage} HP${crit ? ' 💥 CRÍTICO!' : ''}`);
      break;
    }
    case 'defender': {
      playerDefending = true;
      log.push(`🛡️ ${player.name} defende-se · +50% DEF neste turno`);
      break;
    }
    case 'skill': {
      // Simplificado: usa 20 energia para dano extra
      if (player.energy >= 20) {
        player.energy -= 20;
        const skillDamage = Math.floor(player.str * 3);
        enemy.hp = Math.max(0, enemy.hp - skillDamage);
        log.push(`✨ ${player.name} usou skill especial · -${skillDamage} HP`);
      } else {
        log.push(`⚡ Energia insuficiente! (precisa 20, tens ${player.energy})`);
      }
      break;
    }
    case 'item': {
      // Simplificado: usa poção se tiver
      const pocaoIdx = player.inventory.indexOf('poção');
      if (pocaoIdx !== -1) {
        player.inventory.splice(pocaoIdx, 1);
        player.hp = Math.min(player.maxHp, player.hp + 50);
        log.push(`🎒 ${player.name} usou poção · +50 HP`);
      } else {
        log.push(`🎒 Sem poções no inventário!`);
      }
      break;
    }
  }

  // ── VERIFICAR VITÓRIA ──
  if (enemy.hp <= 0) {
    const xpGanho = enemy.atk * 2;
    const berriesGanho = enemy.def * 10;

    player.xp += xpGanho;
    player.berries += berriesGanho;
    await rpg.savePlayer(player);

    limparEstadoCombate(ctx.senderNumber, enemyId);

    const corpo = [
      `🏆 *VITÓRIA!*`,
      '',
      `${player.name} derrotou ${enemy.emoji} ${enemy.name}!`,
      '',
      `⭐ +${xpGanho} XP`,
      `💰 +${berriesGanho} Berries`,
      '',
      `📊 Nível ${Math.floor(player.xp / 100) + 1}`,
    ].join('\n');

    return rpgTheme.rpgReply(sock, msg, ctx, '🏆 VITÓRIA!', corpo.split('\n'));
  }

  // ── TURNO DO INIMIGO ──
  let enemyDamage = calcularDano(
    { str: enemy.atk, equippedWeapon: null },
    { vit: player.vit, def: 0 },
    null,
    false
  );

  // Defesa reduz dano
  if (playerDefending) {
    enemyDamage = Math.floor(enemyDamage * 0.5);
  }

  player.hp = Math.max(0, player.hp - enemyDamage);
  log.push(`${enemy.emoji} ${enemy.name} atacou · -${enemyDamage} HP${playerDefending ? ' (reduzido)' : ''}`);

  // ── VERIFICAR DERROTA ──
  if (player.hp <= 0) {
    limparEstadoCombate(ctx.senderNumber, enemyId);

    const corpo = [
      `💀 *DERROTA...*`,
      '',
      `${player.name} foi derrotado por ${enemy.emoji} ${enemy.name}!`,
      '',
      `💡 Descansa e tenta novamente.`,
      `💡 Usa !pocao para recuperar HP.`,
    ].join('\n');

    return rpgTheme.rpgReply(sock, msg, ctx, '💀 DERROTA', corpo.split('\n'));
  }

  // ── ACTUALIZAR ESTADO ──
  estado.turn += 1;
  estado.turnHistory.push(...log);
  actualizarEstadoCombate(ctx.senderNumber, enemyId, estado);

  // ── MOSTRAR ESTADO ──
  const botoes = [
    { id: `RPGCOMBAT_atacar_${enemyId}`, text: '⚔️ Atacar' },
    { id: `RPGCOMBAT_defender_${enemyId}`, text: '🛡️ Defender' },
    { id: `RPGCOMBAT_skill_${enemyId}`, text: `✨ Skill (${player.energy}E)` },
    { id: `RPGCOMBAT_item_${enemyId}`, text: '🎒 Item' },
  ];

  const corpo = [
    `⚔️ *COMBATE* · Turno ${estado.turn}`,
    '',
    `${player.name} ${gerarBarraHP(player.hp, player.maxHp)} ${player.hp}/${player.maxHp}`,
    `vs`,
    `${enemy.emoji} ${enemy.name} ${gerarBarraHP(enemy.hp, enemy.maxHp)} ${enemy.hp}/${enemy.maxHp}`,
    '',
    `📜 Últimas acções:`,
    ...log.slice(-2),
    '',
    `🎯 Escolhe a tua próxima acção!`,
  ].join('\n');

  await rpgTheme.rpgBotoes(sock, msg, ctx, corpo, botoes);
}

/**
 * Processa clique em botão de combate
 */
async function resolverCombateClique(sock, msg, ctx, token) {
  const match = String(token || '').match(/^RPGCOMBAT_(\w+)(?:_(.+))?$/i);
  if (!match) return false;

  const acao = match[1];
  const enemyId = match[2] || 'Inimigo';

  await processarAcao(sock, msg, ctx, acao, enemyId);
  return true;
}

module.exports = {
  iniciarCombate,
  processarAcao,
  resolverCombateClique,
  obterEstadoCombate,
  limparEstadoCombate,
  _combates,
};
