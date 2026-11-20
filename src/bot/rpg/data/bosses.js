/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG BOSSES DATA                               ║
 * ║   7 Bosses (um por rank D → SSS)                                 ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const BOSSES = {
  'SSS': {
    name: 'Madara Susanoo Perfeito',
    emoji: '👁️',
    anime: 'Naruto',
    hp: 5000,
    atk: 200,
    def: 80,
    xp: 8000,
    berries: 200000,
    shadowRank: 'SSS'
  },
  'SS': {
    name: 'Kaido Forma Dragão',
    emoji: '🐉',
    anime: 'One Piece',
    hp: 3000,
    atk: 150,
    def: 60,
    xp: 4000,
    berries: 100000,
    shadowRank: 'SS'
  },
  'S': {
    name: 'Ryomen Sukuna',
    emoji: '👹',
    anime: 'Jujutsu Kaisen',
    hp: 1200,
    atk: 85,
    def: 30,
    xp: 1500,
    berries: 50000,
    shadowRank: 'S'
  },
  'A': {
    name: 'Muzan Kibutsuji',
    emoji: '🧛',
    anime: 'Demon Slayer',
    hp: 900,
    atk: 70,
    def: 45,
    xp: 900,
    berries: 30000,
    shadowRank: 'A'
  },
  'B': {
    name: 'Pain / Nagato',
    emoji: '🍥',
    anime: 'Naruto',
    hp: 600,
    atk: 55,
    def: 20,
    xp: 500,
    berries: 15000,
    shadowRank: 'B'
  },
  'C': {
    name: 'Frieza Forma Final',
    emoji: '👽',
    anime: 'Dragon Ball',
    hp: 500,
    atk: 48,
    def: 18,
    xp: 400,
    berries: 12000,
    shadowRank: 'C'
  },
  'D': {
    name: 'Goblin King',
    emoji: '👺',
    anime: 'Solo Leveling',
    hp: 200,
    atk: 25,
    def: 10,
    xp: 100,
    berries: 3000,
    shadowRank: 'D'
  },
};

module.exports = { BOSSES };
