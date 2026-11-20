/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG ENGINE SLIM                               ║
 * ║   Engine refatorado que usa módulos de dados separados           ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * Este módulo importa os dados dos módulos em data/ e mantém apenas
 * as funções de lógica. Reduz o engine.js de 51KB para ~15KB.
 *
 * Para manter compatibilidade com código antigo, também exporta tudo
 * que o engine.js original exportava.
 */
'use strict';

// Importar dados dos módulos
const { ORIGINS } = require('./data/origins');
const { RANKS, getRank } = require('./data/ranks');
const { SKILLS } = require('./data/skills');
const { STRATEGIES, getStrategy } = require('./data/strategies');
const { WEAPONS } = require('./data/weapons');
const { BOSSES } = require('./data/bosses');

// Funções utilitárias
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const P = a => a[Math.floor(Math.random() * a.length)];

// ══════════════════════════════════════════════════════════════
// JOGADOR (manter compatibilidade)
// ══════════════════════════════════════════════════════════════

const RPGPlayer = require('../../database/models/RPGPlayer');

async function getPlayer(userId) {
  let player = await RPGPlayer.findOne({ userId });
  if (!player) {
    player = await RPGPlayer.create({
      userId,
      name: 'Aventureiro',
      origin: null,
      level: 1,
      xp: 0,
      berries: 500,
      crystals: 0,
      hp: 100,
      maxHp: 100,
      energy: 50,
      maxEnergy: 50,
      str: 5,
      dex: 5,
      int: 5,
      vit: 5,
      luk: 5,
      inventory: [],
      equippedWeapon: null,
      shadows: [],
      cards: [],
      cardsCollected: 0,
      bossesDefeated: 0,
      questsCompleted: 0,
      streak: 0,
      lastDaily: null,
      strategy: 'equilibrada',
      refinement: {},
    });
  }
  return player;
}

async function savePlayer(player) {
  await player.save();
  return player;
}

function addXP(player, amount) {
  player.xp += amount;
  const needed = player.level * 100;
  while (player.xp >= needed) {
    player.xp -= needed;
    player.level += 1;
    player.maxHp += 10;
    player.hp = player.maxHp;
    player.maxEnergy += 5;
    player.energy = player.maxEnergy;
  }
  return player;
}

// ══════════════════════════════════════════════════════════════
// COMBATE (simplificado)
// ══════════════════════════════════════════════════════════════

function calculateDamage(attacker, defender, strategy = null) {
  const atk = attacker.str * 2 + (attacker.equippedWeapon?.base_atk || 0);
  const def = defender.vit * 1.5;

  let damage = Math.max(1, atk - def + R(-5, 5));

  // Aplicar multiplicadores de estratégia
  if (strategy) {
    const strat = getStrategy(strategy);
    damage = Math.floor(damage * strat.atkMult);
  }

  // Crítico (15% chance base + luck)
  const critChance = 0.15 + (attacker.luk * 0.005);
  const isCrit = Math.random() < critChance;
  if (isCrit) {
    damage = Math.floor(damage * 1.5);
  }

  // Esquiva (baseada em dex)
  const dodgeChance = defender.dex * 0.005;
  const dodged = Math.random() < dodgeChance;

  return {
    damage: dodged ? 0 : damage,
    isCrit,
    dodged,
  };
}

// ══════════════════════════════════════════════════════════════
// EXPORTAÇÕES (compatibilidade com engine.js original)
// ══════════════════════════════════════════════════════════════

module.exports = {
  // Dados
  ORIGINS,
  RANKS,
  SKILLS,
  STRATEGIES,
  WEAPONS,
  BOSSES,

  // Funções
  getRank,
  getStrategy,
  getPlayer,
  savePlayer,
  addXP,
  calculateDamage,

  // Utilitários
  R,
  P,
};
