/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║   DARK BOT v11.3 — RPG ORIGINS DATA                              ║
 * ║   6 Origens com stats base e descrições                          ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */
'use strict';

const ORIGINS = {
  shinobi: {
    emoji: '🍥',
    name: 'Shinobi',
    desc: 'Ninja de Konoha. Chakra e Jutsus.',
    bonus: { str: 2, dex: 3, int: 2, vit: 1, luk: 2 }
  },
  pirata: {
    emoji: '🏴‍☠️',
    name: 'Pirata do Mar',
    desc: 'Grand Line. Haki e Akuma no Mi.',
    bonus: { str: 3, dex: 1, int: 1, vit: 3, luk: 2 }
  },
  cacador: {
    emoji: '⚔️',
    name: 'Caçador das Sombras',
    desc: 'Rank S. Monarca das Sombras.',
    bonus: { str: 3, dex: 3, int: 1, vit: 1, luk: 2 }
  },
  feiticeiro: {
    emoji: '👁️',
    name: 'Feiticeiro Jujutsu',
    desc: 'Domínios e Maldições.',
    bonus: { str: 1, dex: 2, int: 4, vit: 1, luk: 2 }
  },
  hashira: {
    emoji: '🗡️',
    name: 'Hashira',
    desc: 'Mestre da Respiração.',
    bonus: { str: 2, dex: 4, int: 1, vit: 2, luk: 1 }
  },
  saiyajin: {
    emoji: '🐉',
    name: 'Saiyajin',
    desc: 'Guerreiro do espaço. Ki e Transformações.',
    bonus: { str: 4, dex: 2, int: 1, vit: 2, luk: 1 }
  },
};

module.exports = { ORIGINS };
