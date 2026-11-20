/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG RANKS DATA                                ║
 * ║   8 Ranks de progressão com multiplicadores                      ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const RANKS = [
  { name: 'E',   emoji: '⚪', min_level: 1,   mult: 1.0 },
  { name: 'D',   emoji: '🟢', min_level: 5,   mult: 1.2 },
  { name: 'C',   emoji: '🔵', min_level: 10,  mult: 1.5 },
  { name: 'B',   emoji: '🟣', min_level: 20,  mult: 2.0 },
  { name: 'A',   emoji: '🟡', min_level: 30,  mult: 2.5 },
  { name: 'S',   emoji: '🔴', min_level: 50,  mult: 3.5 },
  { name: 'SS',  emoji: '⭐', min_level: 70,  mult: 5.0 },
  { name: 'SSS', emoji: '💎', min_level: 100, mult: 8.0 },
];

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.min_level) rank = r;
  }
  return rank;
}

module.exports = { RANKS, getRank };
