/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG STRATEGIES DATA                           ║
 * ║   5 Estratégias de combate                                       ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const STRATEGIES = {
  agressiva: {
    id: 'agressiva', name: 'Agressiva', emoji: '⚔️',
    desc: '+30% ATK · -20% DEF — ruge e mata primeiro',
    atkMult: 1.3, defMult: 0.8, dodgeBonus: 0,
  },
  defensiva: {
    id: 'defensiva', name: 'Defensiva', emoji: '🛡️',
    desc: '+50% DEF · -15% ATK — aguenta e contra-ataca',
    atkMult: 0.85, defMult: 1.5, dodgeBonus: 0,
  },
  equilibrada: {
    id: 'equilibrada', name: 'Equilibrada', emoji: '⚖️',
    desc: 'Sem bónus — a via do meio',
    atkMult: 1.0, defMult: 1.0, dodgeBonus: 0,
  },
  evasiva: {
    id: 'evasiva', name: 'Evasiva', emoji: '🌀',
    desc: '+30% esquiva · -10% ATK — dança com o inimigo',
    atkMult: 0.9, defMult: 0.9, dodgeBonus: 0.30,
  },
  sorrateira: {
    id: 'sorrateira', name: 'Sorrateira', emoji: '🗡️',
    desc: '+25% crítico · -10% DEF — golpe certeiro',
    atkMult: 1.0, defMult: 0.9, dodgeBonus: 0, critBonus: 0.25,
  },
};

function getStrategy(id) {
  return STRATEGIES[String(id || 'equilibrada').toLowerCase()] || STRATEGIES.equilibrada;
}

module.exports = { STRATEGIES, getStrategy };
